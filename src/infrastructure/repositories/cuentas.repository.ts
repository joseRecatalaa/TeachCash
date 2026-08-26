/**
 * Repositorio de Cuentas.
 *
 * SOLO SERVIDOR. Importa `@/db`, así que nunca se importa desde un componente
 * cliente: la frontera es `src/application/actions/entity.actions.ts`.
 */

import { and, asc, desc, eq, isNull, like, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { accounts, transactions, ACCOUNT_TYPES } from '@/db/schema'
import { asCurrency, money, sumByCurrency, CURRENCIES, type Money } from '@/lib/money'
import type { CuentaFormDto, CuentaListDto } from '@/src/types/cuenta.types'
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

const CuentaSave = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(60, 'Máximo 60 caracteres'),
  tipo: z.enum(ACCOUNT_TYPES, { message: 'Tipo de cuenta no válido' }),
  divisa: z.enum(CURRENCIES, { message: 'Divisa no válida' }),
  // Céntimos. Entero obligatorio: es la regla dura 1, comprobada en el borde.
  saldoInicial: z.number().int('El saldo inicial debe ser un importe válido'),
})

/** La divisa NO se puede cambiar: los movimientos ya registrados están en ella. */
const CuentaUpdate = CuentaSave.omit({ divisa: true })

// ─────────────────────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El saldo se DERIVA, no se almacena (regla dura 7). Un saldo guardado es un
 * saldo que puede divergir de sus movimientos, y entonces la cifra que ve el
 * usuario es mentira.
 *
 * Incluye las transferencias, a diferencia de los informes: mover dinero al
 * ahorro sí cambia el saldo de las dos cuentas.
 */
const balanceExpression = sql<number>`${accounts.openingBalance} + coalesce(sum(${transactions.amount}), 0)`

const SORTABLE = {
  nombre: accounts.name,
  tipo: accounts.type,
  divisa: accounts.currency,
  saldoInicial: accounts.openingBalance,
} as const

export const cuentasRepository: EntityRepository<CuentaListDto, CuentaFormDto> = {
  async list(userId: string, params: ListParams): Promise<ListResult<CuentaListDto>> {
    const includeArchived = params.filters?.archivadas === '1'
    const search = params.search?.trim()

    const where = and(
      // El userId va DENTRO del where. Siempre.
      eq(accounts.userId, userId),
      includeArchived ? undefined : isNull(accounts.archivedAt),
      search ? like(accounts.name, `%${search}%`) : undefined,
      params.filters?.tipo ? eq(accounts.type, String(params.filters.tipo)) : undefined,
      params.filters?.divisa ? eq(accounts.currency, String(params.filters.divisa)) : undefined,
    )

    const column = SORTABLE[params.sortBy as keyof typeof SORTABLE] ?? accounts.name
    const order = params.sortDir === 'desc' ? desc(column) : asc(column)

    const rows = await db
      .select({
        id: accounts.id,
        nombre: accounts.name,
        tipo: accounts.type,
        divisa: accounts.currency,
        saldoInicial: accounts.openingBalance,
        archivedAt: accounts.archivedAt,
        saldo: balanceExpression,
      })
      .from(accounts)
      .leftJoin(
        transactions,
        and(eq(transactions.accountId, accounts.id), isNull(transactions.deletedAt)),
      )
      .where(where)
      .groupBy(accounts.id)
      .orderBy(order)

    const data = rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      divisa: asCurrency(r.divisa),
      // coalesce ya devuelve 0, pero sum() sobre conjunto vacío es NULL y el
      // driver puede colar un null si el coalesce se pierde en un refactor.
      saldo: r.saldo ?? 0,
      saldoInicial: r.saldoInicial,
      archivada: r.archivedAt !== null,
    }))

    // Son un puñado de cuentas: paginar en memoria es más simple que un count()
    // aparte, y el total sale exacto sin una segunda consulta.
    const total = data.length
    if (params.paginate === false) return { data, total }

    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    return { data: data.slice((page - 1) * pageSize, page * pageSize), total }
  },

  async get(userId: string, id: string): Promise<CuentaFormDto | null> {
    const rows = await db
      .select({
        id: accounts.id,
        nombre: accounts.name,
        tipo: accounts.type,
        divisa: accounts.currency,
        saldoInicial: accounts.openingBalance,
      })
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .limit(1)

    const r = rows[0]
    if (!r) return null
    return { ...r, divisa: asCurrency(r.divisa) }
  },

  async create(userId: string, values: unknown): Promise<{ id: string }> {
    const parsed = CuentaSave.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const id = crypto.randomUUID()
    await db.insert(accounts).values({
      id,
      // El userId sale de la sesión, jamás de `values`.
      userId,
      name: parsed.data.nombre,
      type: parsed.data.tipo,
      currency: parsed.data.divisa,
      openingBalance: parsed.data.saldoInicial,
      createdAt: new Date(),
    })
    return { id }
  },

  async update(userId: string, id: string, values: unknown): Promise<{ id: string }> {
    const parsed = CuentaUpdate.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const updated = await db
      .update(accounts)
      .set({
        name: parsed.data.nombre,
        type: parsed.data.tipo,
        openingBalance: parsed.data.saldoInicial,
      })
      // La propiedad se comprueba en el WHERE: no hay forma de tocar lo ajeno.
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning({ id: accounts.id })

    if (updated.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },

  /**
   * Borrado real, solo para cuentas SIN movimientos. Con movimientos se archiva:
   * borrar arrastraría el histórico y dejaría mal los totales de meses cerrados.
   */
  async remove(userId: string, id: string): Promise<{ id: string }> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(eq(transactions.accountId, id), eq(transactions.userId, userId)))

    if (count > 0) {
      throw new RepositoryError('La cuenta tiene movimientos. Archívala en lugar de borrarla.')
    }

    const deleted = await db
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning({ id: accounts.id })

    if (deleted.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Operaciones fuera del CRUD
// ─────────────────────────────────────────────────────────────────────────────

/** Archivar no borra: los movimientos siguen contando en el histórico. */
export async function archivarCuenta(
  userId: string,
  id: string,
  archivar: boolean,
): Promise<{ id: string }> {
  const rows = await db
    .update(accounts)
    .set({ archivedAt: archivar ? new Date() : null })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning({ id: accounts.id })

  if (rows.length === 0) throw new RepositoryError(NOT_FOUND)
  return { id }
}

/**
 * Patrimonio total, AGRUPADO POR DIVISA (regla dura 2).
 *
 * Nunca una cifra única: sumar euros y dólares da un número que no significa
 * nada. La agregación va en JavaScript a propósito — son un puñado de cuentas
 * ya agregadas en SQL, no miles de filas.
 */
export async function getPatrimonio(userId: string): Promise<Money[]> {
  const { data } = await cuentasRepository.list(userId, { paginate: false })
  return sumByCurrency(data.map((c) => money(c.saldo, c.divisa)))
}
