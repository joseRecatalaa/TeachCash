/**
 * Lecturas y agregaciones de movimientos. Sin 'use server'.
 *
 * Regla que atraviesa todo este fichero:
 *   - el SALDO de una cuenta incluye las transferencias;
 *   - los INFORMES (gasto por categoría, ingresos vs gastos, totales del mes)
 *     las excluyen.
 * Mover 500 € al ahorro no es un gasto, aunque en la tabla se parezca mucho.
 */

import { and, asc, desc, eq, gte, isNull, like, lt, lte, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import { accounts, categories, transactions } from '@/db/schema'
import { asCurrency, money, type Currency, type Money } from '@/lib/money'
import {
  addMonths,
  compareDates,
  eachDay,
  monthRange,
  periodOf,
  type CivilDate,
  type Period,
} from '@/lib/dates'

/** Movimientos que cuentan como flujo real: ni transferencias ni borrados. */
const isRealFlow = () => and(isNull(transactions.transferId), isNull(transactions.deletedAt))

/** Movimientos vivos, transferencias incluidas. Para saldos. */
const isLive = () => isNull(transactions.deletedAt)

export type TransactionView = {
  id: string
  date: CivilDate
  description: string
  notes: string | null
  amount: Money
  accountId: string
  accountName: string
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  /** No null = es una pata de transferencia. */
  transferId: string | null
}

export type TransactionFilters = {
  from?: CivilDate
  to?: CivilDate
  accountId?: string
  categoryId?: string
  /** Búsqueda por descripción. */
  search?: string
  limit?: number
  offset?: number
}

const filterConditions = (userId: string, f: TransactionFilters): SQL | undefined =>
  and(
    // Primero, siempre: la consulta no puede devolver algo ajeno.
    eq(transactions.userId, userId),
    isNull(transactions.deletedAt),
    f.from ? gte(transactions.date, f.from) : undefined,
    f.to ? lte(transactions.date, f.to) : undefined,
    f.accountId ? eq(transactions.accountId, f.accountId) : undefined,
    f.categoryId ? eq(transactions.categoryId, f.categoryId) : undefined,
    f.search ? like(transactions.description, `%${f.search}%`) : undefined,
  )

export async function listTransactions(
  userId: string,
  filters: TransactionFilters = {},
): Promise<TransactionView[]> {
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      notes: transactions.notes,
      amount: transactions.amount,
      transferId: transactions.transferId,
      accountId: accounts.id,
      accountName: accounts.name,
      currency: accounts.currency,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryIcon: categories.icon,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(filterConditions(userId, filters))
    // Desempate por id: sin él, dos movimientos del mismo día pueden bailar de
    // orden entre recargas y la paginación se salta filas.
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0)

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    description: r.description,
    notes: r.notes,
    amount: money(r.amount, asCurrency(r.currency)),
    accountId: r.accountId,
    accountName: r.accountName,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    categoryIcon: r.categoryIcon,
    transferId: r.transferId,
  }))
}

export async function countTransactions(
  userId: string,
  filters: TransactionFilters = {},
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(transactions)
    .where(filterConditions(userId, filters))
  return row?.total ?? 0
}

export async function getTransaction(
  userId: string,
  id: string,
): Promise<TransactionView | null> {
  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      notes: transactions.notes,
      amount: transactions.amount,
      transferId: transactions.transferId,
      accountId: accounts.id,
      accountName: accounts.name,
      currency: accounts.currency,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryIcon: categories.icon,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
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
    date: r.date,
    description: r.description,
    notes: r.notes,
    amount: money(r.amount, asCurrency(r.currency)),
    accountId: r.accountId,
    accountName: r.accountName,
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    categoryIcon: r.categoryIcon,
    transferId: r.transferId,
  }
}

export type CategorySpend = {
  categoryId: string | null
  categoryName: string
  categoryIcon: string | null
  /** Suma con su signo original (negativa en gastos). */
  total: Money
}

/**
 * En qué se va el dinero durante un periodo.
 *
 * Excluye transferencias: si no, aparecería "gastado" el dinero movido al
 * ahorro. Devuelve el importe CON SIGNO; darle la vuelta para presentarlo como
 * magnitud positiva es cosa de la capa de presentación.
 */
export async function getSpendByCategory(
  userId: string,
  period: Period,
  currency: Currency = 'EUR',
): Promise<CategorySpend[]> {
  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        // 'YYYY-MM-%' sobre una columna de texto: usa el índice (user_id, date).
        like(transactions.date, `${period}-%`),
        eq(accounts.currency, currency),
        lt(transactions.amount, 0),
        isRealFlow(),
      ),
    )
    .groupBy(categories.id)
    // Descendente por magnitud del gasto, no alfabético ni por orden de la base.
    .orderBy(asc(sql`sum(${transactions.amount})`))

  return rows.map((r) => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName ?? 'Sin categoría',
    categoryIcon: r.categoryIcon,
    total: money(r.total ?? 0, currency),
  }))
}

export type PeriodTotals = { period: Period; income: Money; expense: Money; net: Money }

/**
 * Ingresos y gastos mes a mes.
 *
 * Solo desde el primer movimiento del usuario: si empezó en marzo, enero y
 * febrero no son meses de gasto cero, son meses que no existen. Los huecos
 * interiores sí se rellenan con cero — ahí el usuario estaba usando la app.
 */
export async function getIncomeVsExpense(
  userId: string,
  options: { months?: number; until?: Period; currency?: Currency } = {},
): Promise<PeriodTotals[]> {
  const currency = options.currency ?? 'EUR'
  const months = options.months ?? 12
  const until = options.until ?? periodOf(new Date().toISOString().slice(0, 10))

  const rows = await db
    .select({
      period: sql<string>`substr(${transactions.date}, 1, 7)`,
      income: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(eq(transactions.userId, userId), eq(accounts.currency, currency), isRealFlow()),
    )
    .groupBy(sql`substr(${transactions.date}, 1, 7)`)

  if (rows.length === 0) return []

  const byPeriod = new Map(rows.map((r) => [r.period, r]))
  const firstWithData = rows.map((r) => r.period).sort()[0]
  const windowStart = addMonths(until, -(months - 1))
  const start = windowStart > firstWithData ? windowStart : firstWithData

  const result: PeriodTotals[] = []
  for (let p = start; p <= until; p = addMonths(p, 1)) {
    const row = byPeriod.get(p)
    const income = money(row?.income ?? 0, currency)
    const expense = money(row?.expense ?? 0, currency)
    result.push({
      period: p,
      income,
      expense,
      net: money(income.amount + expense.amount, currency),
    })
  }
  return result
}

/** Totales de un mes concreto. Sin transferencias. */
export async function getMonthTotals(
  userId: string,
  period: Period,
  currency: Currency = 'EUR',
): Promise<{ income: Money; expense: Money; net: Money }> {
  const [row] = await db
    .select({
      income: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.userId, userId),
        like(transactions.date, `${period}-%`),
        eq(accounts.currency, currency),
        isRealFlow(),
      ),
    )

  const income = money(row?.income ?? 0, currency)
  const expense = money(row?.expense ?? 0, currency)
  return { income, expense, net: money(income.amount + expense.amount, currency) }
}

export type BalancePoint = { date: CivilDate; balance: Money }

/**
 * Evolución del saldo, un punto POR DÍA.
 *
 * Los días sin movimiento heredan el saldo anterior. Una línea que solo tiene
 * puntos donde hubo movimiento dibuja pendientes falsas entre fechas distantes.
 *
 * Aquí SÍ entran las transferencias: mueven el saldo de verdad. Y solo se
 * agregan cuentas de una divisa: un eje que suma euros y dólares no significa nada.
 */
export async function getBalanceSeries(
  userId: string,
  options: { from: CivilDate; to: CivilDate; accountId?: string; currency?: Currency },
): Promise<BalancePoint[]> {
  const currency = options.currency ?? 'EUR'
  const accountScope = options.accountId ? eq(accounts.id, options.accountId) : undefined

  // Punto de partida: saldos de apertura + todo lo anterior al rango.
  const [openingRow] = await db
    .select({ total: sql<number>`coalesce(sum(${accounts.openingBalance}), 0)` })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.currency, currency), accountScope))

  const [priorRow] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(accounts.currency, currency),
        lt(transactions.date, options.from),
        isLive(),
        accountScope,
      ),
    )

  const deltas = await db
    .select({
      date: transactions.date,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(accounts.currency, currency),
        gte(transactions.date, options.from),
        lte(transactions.date, options.to),
        isLive(),
        accountScope,
      ),
    )
    .groupBy(transactions.date)

  const byDate = new Map(deltas.map((d) => [d.date, d.total ?? 0]))
  let running = (openingRow?.total ?? 0) + (priorRow?.total ?? 0)

  return eachDay(options.from, options.to).map((date) => {
    running += byDate.get(date) ?? 0
    return { date, balance: money(running, currency) }
  })
}

/** Fecha del primer movimiento. Sirve para no pintar meses anteriores al alta. */
export async function getFirstTransactionDate(userId: string): Promise<CivilDate | null> {
  const [row] = await db
    .select({ date: sql<string | null>`min(${transactions.date})` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isLive()))
  return row?.date ?? null
}

/**
 * Rango por defecto de la evolución de saldo: los últimos `months` meses, sin
 * empezar antes del primer movimiento.
 */
export async function getDefaultSeriesRange(
  userId: string,
  months = 12,
  today: CivilDate = new Date().toISOString().slice(0, 10),
): Promise<{ from: CivilDate; to: CivilDate }> {
  const windowStart = monthRange(addMonths(periodOf(today), -(months - 1))).from
  const first = await getFirstTransactionDate(userId)
  const from = first && compareDates(first, windowStart) > 0 ? first : windowStart
  return { from, to: today }
}

/** Las dos patas de una transferencia. */
export async function getTransferLegs(userId: string, transferId: string) {
  return db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.transferId, transferId),
        isNull(transactions.deletedAt),
      ),
    )
}

