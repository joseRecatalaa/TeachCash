/**
 * Repositorio de Movimientos.
 *
 * SOLO SERVIDOR: importa `@/db`, así que no puede aparecer en un componente
 * cliente. La frontera es `entity.actions.ts`.
 *
 * Un movimiento es un gasto o un ingreso de la cuenta única de la aplicación.
 * No hay cuentas ni transferencias: el saldo es la suma de lo que hay aquí
 * dentro (regla dura 7 — los saldos son derivados y se calculan en
 * `informes.repository.ts`).
 */

import { and, asc, desc, eq, gte, like, lte, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { categories, transactions } from '@/db/schema'
import { isCivilDate } from '@/lib/dates'
import type { MovimientoFormDto, MovimientoListDto } from '@/src/types/movimiento.types'
import {
  fromFieldErrors,
  NOT_FOUND,
  RepositoryError,
  type EntityRepository,
  type ListParams,
  type ListResult,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Validación
// ─────────────────────────────────────────────────────────────────────────────

const fechaCivil = z.string().refine(isCivilDate, 'Fecha no válida')

export const SENTIDOS = ['expense', 'income'] as const

const MovimientoSave = z.object({
  categoriaId: z.string().min(1, 'Elige una categoría'),
  // Céntimos, SIN signo. El signo lo pone `sentido`.
  importe: z
    .number()
    .int('Importe no válido')
    .positive('El importe debe ser mayor que cero'),
  sentido: z.enum(SENTIDOS, { message: 'Elige ingreso o gasto' }),
  fecha: fechaCivil,
  descripcion: z
    .string()
    .trim()
    .min(1, 'Pon una descripción')
    .max(200, 'Máximo 200 caracteres'),
  notas: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
})

/**
 * El alta acepta además una clave de idempotencia.
 *
 * Es la clave del CLIENTE: se genera una por formulario abierto y convierte el
 * doble clic en un choque contra el índice único en lugar de en dos movimientos
 * iguales. En una aplicación de dinero eso no es una molestia, es dinero
 * inventado. La edición no la lleva: no tiene sentido "reeditar una sola vez".
 */
const MovimientoCreate = MovimientoSave.extend({
  idempotencyKey: z.string().min(1).max(100).optional(),
})

/** Céntimos con signo a partir del importe sin signo y el sentido. */
const conSigno = (importe: number, sentido: string): number =>
  sentido === 'expense' ? -importe : importe

// ─────────────────────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────────────────────

const SORTABLE = {
  fecha: transactions.date,
  descripcion: transactions.description,
  importe: transactions.amount,
} as const

const filtros = (userId: string, params: ListParams): SQL | undefined => {
  const f = params.filters ?? {}
  const search = params.search?.trim()
  return and(
    // Primero, siempre: la consulta no puede devolver algo ajeno.
    eq(transactions.userId, userId),
    f.desde ? gte(transactions.date, String(f.desde)) : undefined,
    f.hasta ? lte(transactions.date, String(f.hasta)) : undefined,
    f.categoriaId ? eq(transactions.categoryId, String(f.categoriaId)) : undefined,
    search ? like(transactions.description, `%${search}%`) : undefined,
  )
}

const SELECT_LIST = {
  id: transactions.id,
  fecha: transactions.date,
  descripcion: transactions.description,
  notas: transactions.notes,
  importe: transactions.amount,
  categoriaId: categories.id,
  categoriaNombre: categories.name,
  categoriaColor: categories.color,
} as const

export const movimientosRepository: EntityRepository<MovimientoListDto, MovimientoFormDto> = {
  async list(userId: string, params: ListParams): Promise<ListResult<MovimientoListDto>> {
    const where = filtros(userId, params)

    const column = SORTABLE[params.sortBy as keyof typeof SORTABLE] ?? transactions.date
    const dir = params.sortDir === 'asc' ? asc : desc
    // Desempate por id: sin él, dos movimientos del mismo día pueden bailar de
    // orden entre recargas y la paginación se salta filas.
    const order = [dir(column), desc(transactions.id)]

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(transactions)
      .where(where)

    const query = db
      .select(SELECT_LIST)
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where)
      .orderBy(...order)

    // Aquí sí se pagina en SQL: los movimientos son la tabla que crece.
    const rows =
      params.paginate === false
        ? await query
        : await query
            .limit(params.pageSize ?? 20)
            .offset(((params.page ?? 1) - 1) * (params.pageSize ?? 20))

    return {
      data: rows.map((r) => ({
        id: r.id,
        fecha: r.fecha,
        descripcion: r.descripcion,
        importe: r.importe,
        categoriaId: r.categoriaId ?? '',
        categoriaNombre: r.categoriaNombre ?? 'Sin categoría',
        categoriaColor: r.categoriaColor ?? '',
        notas: r.notas ?? '',
      })),
      total: total ?? 0,
    }
  },

  async get(userId: string, id: string): Promise<MovimientoFormDto | null> {
    const rows = await db
      .select({
        id: transactions.id,
        fecha: transactions.date,
        descripcion: transactions.description,
        notas: transactions.notes,
        importe: transactions.amount,
        categoriaId: transactions.categoryId,
      })
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1)

    const r = rows[0]
    if (!r) return null
    return {
      id: r.id,
      fecha: r.fecha,
      descripcion: r.descripcion,
      notas: r.notas ?? '',
      // El formulario trabaja con magnitud + sentido; la base, con signo.
      importe: Math.abs(r.importe),
      sentido: r.importe < 0 ? 'expense' : 'income',
      categoriaId: r.categoriaId,
    }
  },

  async create(userId: string, values: unknown): Promise<{ id: string }> {
    const parsed = MovimientoCreate.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const d = parsed.data
    await assertCategoriaCompatible(userId, d.categoriaId, d.sentido)

    // Idempotencia: el segundo envío del mismo formulario NO crea dinero nuevo.
    // Devuelve el movimiento que ya existe, así que para quien llama es un éxito
    // — que es exactamente lo que fue: su movimiento está guardado.
    if (d.idempotencyKey) {
      const previo = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.idempotencyKey, d.idempotencyKey),
          ),
        )
        .limit(1)
      if (previo[0]) return { id: previo[0].id }
    }

    const id = crypto.randomUUID()
    await db.insert(transactions).values({
      id,
      userId,
      categoryId: d.categoriaId,
      amount: conSigno(d.importe, d.sentido),
      date: d.fecha,
      description: d.descripcion,
      notes: d.notas || null,
      idempotencyKey: d.idempotencyKey ?? null,
      createdAt: new Date(),
    })
    return { id }
  },

  async update(userId: string, id: string, values: unknown): Promise<{ id: string }> {
    const parsed = MovimientoSave.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const d = parsed.data
    await assertCategoriaCompatible(userId, d.categoriaId, d.sentido)

    const updated = await db
      .update(transactions)
      .set({
        categoryId: d.categoriaId,
        amount: conSigno(d.importe, d.sentido),
        date: d.fecha,
        description: d.descripcion,
        notes: d.notas || null,
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id })

    if (updated.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },

  /**
   * Borrado FÍSICO. No hay papelera: el modal de confirmación del formulario
   * es la única red, y por eso es obligatorio en toda la interfaz.
   */
  async remove(userId: string, id: string): Promise<{ id: string }> {
    const borrados = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id })

    if (borrados.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Reglas de dominio
// ─────────────────────────────────────────────────────────────────────────────

/** Una categoría de gasto en un ingreso descoloca todos los informes. */
async function assertCategoriaCompatible(
  userId: string,
  categoriaId: string,
  sentido: string,
): Promise<void> {
  const rows = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(and(eq(categories.id, categoriaId), eq(categories.userId, userId)))
    .limit(1)

  const categoria = rows[0]
  if (!categoria) {
    throw new RepositoryError(NOT_FOUND, { categoriaId: 'Categoría no encontrada' })
  }
  if (categoria.kind !== sentido) {
    throw new RepositoryError('La categoría no corresponde al sentido del movimiento', {
      categoriaId: sentido === 'expense' ? 'Elige una categoría de gasto' : 'Elige una de ingreso',
    })
  }
}
