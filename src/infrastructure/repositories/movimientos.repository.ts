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

import { and, asc, desc, eq, gte, ilike, lte, sql, type SQL } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import { categories, transactions } from '@/db/schema'
import { compareDates, isCivilDate, latestToday } from '@/lib/dates'
import {
  ID_MAX,
  IMPORTE_MAXIMO,
  MAX_MOVIMIENTOS_CUENTA,
  MAX_MOVIMIENTOS_INVITADO,
} from '@/src/types/limites.types'
import type { MovimientoFormDto, MovimientoListDto } from '@/src/types/movimiento.types'
import { esInvitado } from './cuenta.repository'
import { columnaDeOrden, patronContiene, trozo } from './listado'
import { esChoqueUnico } from './postgres-errors'
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

/**
 * Una fecha civil que no sea futura.
 *
 * El tope es el "hoy" de la zona más adelantada del planeta, no el de Madrid:
 * el servidor no sabe dónde está nadie, y rechazar el "hoy" real de alguien
 * sería impedirle anotar lo que acaba de gastar. Se evalúa en cada validación,
 * no al cargar el módulo, porque el servidor no se reinicia a medianoche.
 */
const fechaCivil = z
  .string()
  .refine(isCivilDate, 'Fecha no válida')
  .refine((f) => compareDates(f, latestToday()) <= 0, 'La fecha no puede ser futura')

export const SENTIDOS = ['expense', 'income'] as const

const MovimientoSave = z.object({
  categoriaId: z.string().min(1, 'Elige una categoría').max(ID_MAX, 'Categoría no encontrada'),
  // Céntimos, SIN signo. El signo lo pone `sentido`. El tope es lo que cabe
  // en la columna (int4): sin él, Postgres lo rechaza con un error genérico.
  importe: z
    .number()
    .int('Importe no válido')
    .positive('El importe debe ser mayor que cero')
    .max(IMPORTE_MAXIMO, 'El importe máximo es de 10.000.000,00 €'),
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
    // `ilike` y no `like`: en Postgres `like` distingue mayúsculas, y buscar
    // "merca" tiene que encontrar "Mercadona".
    search ? ilike(transactions.description, patronContiene(search)) : undefined,
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

    const column = columnaDeOrden<AnyPgColumn>(SORTABLE, params.sortBy, transactions.date)
    const dir = params.sortDir === 'asc' ? asc : desc
    // Desempate por id: sin él, dos movimientos del mismo día pueden bailar de
    // orden entre recargas y la paginación se salta filas.
    const order = [dir(column), desc(transactions.id)]

    const [{ total }] = await db
      // count(*) es bigint y el driver lo devuelve como TEXTO: sin mapWith,
      // `total` sería "12" y cualquier suma con él concatenaría cadenas.
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(transactions)
      .where(where)

    const query = db
      .select(SELECT_LIST)
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where)
      .orderBy(...order)

    // Aquí sí se pagina en SQL: los movimientos son la tabla que crece.
    const { limit, offset } = trozo(params)
    const rows = await query.limit(limit).offset(offset)

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
      const previo = await idPorClave(userId, d.idempotencyKey)
      if (previo) return { id: previo }
    }

    await assertCuotaLibre(userId)

    try {
      // El id y la fecha de alta los pone la base.
      const [creado] = await db
        .insert(transactions)
        .values({
          userId,
          categoryId: d.categoriaId,
          amount: conSigno(d.importe, d.sentido),
          date: d.fecha,
          description: d.descripcion,
          notes: d.notas || null,
          idempotencyKey: d.idempotencyKey ?? null,
        })
        .returning({ id: transactions.id })
      return { id: creado.id }
    } catch (err) {
      // Dos envíos simultáneos pasan los dos la comprobación de arriba antes
      // de que ninguno inserte; el segundo choca con el UNIQUE. Tampoco es un
      // error: el movimiento está guardado, y es el del primero.
      if (d.idempotencyKey && esChoqueUnico(err, 'tx_idempotency_key')) {
        const ganador = await idPorClave(userId, d.idempotencyKey)
        if (ganador) return { id: ganador }
      }
      throw err
    }
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

/** El movimiento que ya se guardó con esa clave de idempotencia, si lo hay. */
async function idPorClave(userId: string, clave: string): Promise<string | null> {
  const [previo] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.idempotencyKey, clave)))
    .limit(1)
  return previo?.id ?? null
}

/**
 * Cuota de movimientos por usuario (`src/types/limites.types.ts`).
 *
 * Es una cuota contra el abuso, no un control exacto: dos altas simultáneas
 * justo en el límite pueden dejarlo uno por encima, y eso no daña a nadie. Lo
 * que impide es que un bucle llene la base del plan gratuito.
 */
async function assertCuotaLibre(userId: string): Promise<void> {
  const [[{ total }], invitado] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
    esInvitado(userId),
  ])

  if (invitado && total >= MAX_MOVIMIENTOS_INVITADO) {
    throw new RepositoryError(
      `Has llegado al máximo de ${MAX_MOVIMIENTOS_INVITADO} movimientos como invitado. Crea una cuenta para seguir anotando.`,
    )
  }
  if (total >= MAX_MOVIMIENTOS_CUENTA) {
    throw new RepositoryError(
      `Has llegado al máximo de ${MAX_MOVIMIENTOS_CUENTA} movimientos de una cuenta.`,
    )
  }
}

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
