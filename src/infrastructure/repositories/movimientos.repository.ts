/**
 * Repositorio de Movimientos (y de Transferencias, que son dos movimientos).
 *
 * SOLO SERVIDOR. Ver la nota de `cuentas.repository.ts`.
 */

import { and, asc, desc, eq, gte, isNotNull, isNull, like, lte, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { accounts, categories, transactions } from '@/db/schema'
import { isCivilDate } from '@/lib/dates'
import { asCurrency } from '@/lib/money'
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
  cuentaId: z.string().min(1, 'Elige una cuenta'),
  /** Cadena vacía = sin clasificar, que es un estado válido. */
  categoriaId: z.string(),
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

const TransferenciaSave = z
  .object({
    cuentaOrigenId: z.string().min(1, 'Elige la cuenta de origen'),
    cuentaDestinoId: z.string().min(1, 'Elige la cuenta de destino'),
    importe: z.number().int('Importe no válido').positive('El importe debe ser mayor que cero'),
    fecha: fechaCivil,
    descripcion: z.string().trim().min(1, 'Pon una descripción').max(200),
    notas: z.string().trim().max(1000),
  })
  .refine((d) => d.cuentaOrigenId !== d.cuentaDestinoId, {
    message: 'El origen y el destino no pueden ser la misma cuenta',
    path: ['cuentaDestinoId'],
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
  // `borrados: '1'` invierte el filtro y enseña SOLO la papelera. No los mezcla
  // con los vivos: una lista donde conviven movimientos borrados y no borrados
  // tiene totales que no cuadran con nada.
  const verBorrados = f.borrados === '1'
  return and(
    // Primero, siempre: la consulta no puede devolver algo ajeno.
    eq(transactions.userId, userId),
    verBorrados ? isNotNull(transactions.deletedAt) : isNull(transactions.deletedAt),
    f.desde ? gte(transactions.date, String(f.desde)) : undefined,
    f.hasta ? lte(transactions.date, String(f.hasta)) : undefined,
    f.cuentaId ? eq(transactions.accountId, String(f.cuentaId)) : undefined,
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
  transferenciaId: transactions.transferId,
  cuentaId: accounts.id,
  cuentaNombre: accounts.name,
  divisa: accounts.currency,
  categoriaId: categories.id,
  categoriaNombre: categories.name,
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
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
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
        divisa: asCurrency(r.divisa),
        cuentaId: r.cuentaId,
        cuentaNombre: r.cuentaNombre,
        categoriaId: r.categoriaId ?? '',
        categoriaNombre: r.categoriaNombre ?? 'Sin categoría',
        transferenciaId: r.transferenciaId ?? '',
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
        cuentaId: transactions.accountId,
        categoriaId: transactions.categoryId,
        transferenciaId: transactions.transferId,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
        ),
      )
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
      cuentaId: r.cuentaId,
      categoriaId: r.categoriaId ?? '',
    }
  },

  async create(userId: string, values: unknown): Promise<{ id: string }> {
    const parsed = MovimientoCreate.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const d = parsed.data
    await assertCuentaPropia(userId, d.cuentaId)
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
      accountId: d.cuentaId,
      categoryId: d.categoriaId || null,
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
    await assertNoEsTransferencia(userId, id)
    await assertCuentaPropia(userId, d.cuentaId)
    await assertCategoriaCompatible(userId, d.categoriaId, d.sentido)

    const updated = await db
      .update(transactions)
      .set({
        accountId: d.cuentaId,
        categoryId: d.categoriaId || null,
        amount: conSigno(d.importe, d.sentido),
        date: d.fecha,
        description: d.descripcion,
        notes: d.notas || null,
      })
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
        ),
      )
      .returning({ id: transactions.id })

    if (updated.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },

  /**
   * Borrado LÓGICO. Un movimiento borrado de verdad se lleva por delante el
   * cuadre de los meses ya cerrados y no hay forma de recuperarlo.
   *
   * Si es una pata de transferencia, se borran las dos: media transferencia
   * descuadra las dos cuentas a la vez.
   */
  async remove(userId: string, id: string): Promise<{ id: string }> {
    const rows = await db
      .select({ transferId: transactions.transferId })
      .from(transactions)
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
        ),
      )
      .limit(1)

    const actual = rows[0]
    if (!actual) throw new RepositoryError(NOT_FOUND)

    const objetivo = actual.transferId
      ? eq(transactions.transferId, actual.transferId)
      : eq(transactions.id, id)

    await db
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(and(eq(transactions.userId, userId), objetivo, isNull(transactions.deletedAt)))

    return { id }
  },
}

/**
 * Deshace un borrado lógico.
 *
 * Como el borrado, va por transferencia entera cuando la fila es una pata: media
 * transferencia restaurada descuadra las dos cuentas.
 */
export async function restaurarMovimiento(
  userId: string,
  id: string,
): Promise<{ id: string }> {
  const rows = await db
    .select({ transferId: transactions.transferId })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        isNotNull(transactions.deletedAt),
      ),
    )
    .limit(1)

  const actual = rows[0]
  if (!actual) throw new RepositoryError(NOT_FOUND)

  const objetivo = actual.transferId
    ? eq(transactions.transferId, actual.transferId)
    : eq(transactions.id, id)

  await db
    .update(transactions)
    .set({ deletedAt: null })
    .where(and(eq(transactions.userId, userId), objetivo))

  return { id }
}

// ─────────────────────────────────────────────────────────────────────────────
// Transferencias
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea las DOS patas en la MISMA transacción.
 *
 * Si se escribieran por separado, un fallo entre medias dejaría dinero salido de
 * una cuenta que no ha entrado en ninguna. Es el caso que hizo que el proyecto
 * eligiera `@libsql/client` y no `sqlite-proxy` (ver "Decisiones tomadas").
 */
export async function crearTransferencia(
  userId: string,
  values: unknown,
): Promise<{ id: string }> {
  const parsed = TransferenciaSave.safeParse(values)
  if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

  const d = parsed.data
  const origen = await cuentaDe(userId, d.cuentaOrigenId)
  const destino = await cuentaDe(userId, d.cuentaDestinoId)

  // Regla dura 2: nada de sumar importes de divisas distintas. Sin tipos de
  // cambio, una transferencia entre divisas se RECHAZA (ver "Decisiones abiertas").
  if (origen.currency !== destino.currency) {
    throw new RepositoryError(
      `No se puede transferir entre divisas distintas (${origen.currency} → ${destino.currency})`,
      { cuentaDestinoId: 'Elige una cuenta en la misma divisa' },
    )
  }

  const transferId = crypto.randomUUID()
  const salidaId = crypto.randomUUID()
  const entradaId = crypto.randomUUID()
  const ahora = new Date()

  const comun = {
    userId,
    date: d.fecha,
    description: d.descripcion,
    notes: d.notas || null,
    transferId,
    // Una transferencia NO se clasifica: no es gasto ni ingreso, y si llevara
    // categoría aparecería en el informe de gasto por categoría.
    categoryId: null,
    createdAt: ahora,
  }

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values([
      { ...comun, id: salidaId, accountId: d.cuentaOrigenId, amount: -d.importe },
      { ...comun, id: entradaId, accountId: d.cuentaDestinoId, amount: d.importe },
    ])
  })

  return { id: transferId }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reglas de dominio
// ─────────────────────────────────────────────────────────────────────────────

async function cuentaDe(userId: string, cuentaId: string) {
  const rows = await db
    .select({ id: accounts.id, currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, cuentaId), eq(accounts.userId, userId)))
    .limit(1)

  const cuenta = rows[0]
  if (!cuenta) throw new RepositoryError(NOT_FOUND, { cuentaId: 'Cuenta no encontrada' })
  return cuenta
}

/**
 * La cuenta llega en el body del formulario, así que es un id del cliente: hay
 * que comprobar que es del usuario ANTES de escribir nada (regla dura 4). Sin
 * esto, cualquiera podría meter movimientos en la cuenta de otro.
 */
const assertCuentaPropia = (userId: string, cuentaId: string) => cuentaDe(userId, cuentaId)

/** Una categoría de gasto en un ingreso descoloca todos los informes. */
async function assertCategoriaCompatible(
  userId: string,
  categoriaId: string,
  sentido: string,
): Promise<void> {
  if (!categoriaId) return

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

/**
 * Una pata de transferencia no se edita suelta: cambiarle el importe a una sola
 * deja las dos cuentas descuadradas entre sí. Se borra la transferencia y se
 * vuelve a crear.
 */
async function assertNoEsTransferencia(userId: string, id: string): Promise<void> {
  const rows = await db
    .select({ transferId: transactions.transferId })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1)

  if (!rows[0]) throw new RepositoryError(NOT_FOUND)
  if (rows[0].transferId) {
    throw new RepositoryError(
      'Esto es una transferencia. Bórrala y vuelve a crearla para cambiarla.',
    )
  }
}

/** Catálogo de cuentas para los `<Select>`. Con divisa, que la UI necesita. */
export async function listarCatalogoCuentas(
  userId: string,
): Promise<{ id: string; nombre: string; divisa: string }[]> {
  return db
    .select({ id: accounts.id, nombre: accounts.name, divisa: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNull(accounts.archivedAt)))
    .orderBy(asc(accounts.name))
}
