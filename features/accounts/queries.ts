/**
 * Lecturas de cuentas. Sin 'use server': este fichero NO expone endpoints.
 *
 * Todas las funciones reciben el `userId` y lo meten dentro del `where`. Filtrar
 * después de consultar sería correcto solo mientras nadie borre el `if`.
 */

import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { accounts, transactions, type AccountType } from '@/db/schema'
import { asCurrency, money, sumByCurrency, type Money } from '@/lib/money'

export type AccountWithBalance = {
  id: string
  name: string
  type: AccountType
  archived: boolean
  /** Saldo derivado: apertura + movimientos. Incluye transferencias. */
  balance: Money
  openingBalance: Money
}

/**
 * El saldo se deriva, no se almacena: un saldo guardado es un saldo que puede
 * divergir de sus movimientos, y entonces la cifra que ve el usuario es falsa.
 *
 * Incluye las transferencias, a diferencia de los informes: mover dinero al
 * ahorro sí cambia el saldo de las dos cuentas.
 */
const balanceExpression = sql<number>`${accounts.openingBalance} + coalesce(sum(${transactions.amount}), 0)`

export async function listAccounts(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<AccountWithBalance[]> {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      currency: accounts.currency,
      openingBalance: accounts.openingBalance,
      archivedAt: accounts.archivedAt,
      balance: balanceExpression,
    })
    .from(accounts)
    .leftJoin(
      transactions,
      and(eq(transactions.accountId, accounts.id), isNull(transactions.deletedAt)),
    )
    .where(
      and(
        eq(accounts.userId, userId),
        options.includeArchived ? undefined : isNull(accounts.archivedAt),
      ),
    )
    .groupBy(accounts.id)
    .orderBy(asc(accounts.name))

  return rows.map((r) => {
    const currency = asCurrency(r.currency)
    return {
      id: r.id,
      name: r.name,
      type: r.type as AccountType,
      archived: r.archivedAt !== null,
      // coalesce ya devuelve 0, pero sum() sobre conjunto vacío es NULL y el
      // driver puede colar un null si el coalesce se pierde en un refactor.
      balance: money(r.balance ?? 0, currency),
      openingBalance: money(r.openingBalance, currency),
    }
  })
}

export async function getAccount(
  userId: string,
  accountId: string,
): Promise<AccountWithBalance | null> {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      currency: accounts.currency,
      openingBalance: accounts.openingBalance,
      archivedAt: accounts.archivedAt,
      balance: balanceExpression,
    })
    .from(accounts)
    .leftJoin(
      transactions,
      and(eq(transactions.accountId, accounts.id), isNull(transactions.deletedAt)),
    )
    // El userId va aquí dentro: la consulta no puede devolver algo ajeno.
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .groupBy(accounts.id)

  const r = rows[0]
  if (!r) return null
  const currency = asCurrency(r.currency)
  return {
    id: r.id,
    name: r.name,
    type: r.type as AccountType,
    archived: r.archivedAt !== null,
    balance: money(r.balance ?? 0, currency),
    openingBalance: money(r.openingBalance, currency),
  }
}

/**
 * Cuánto dinero hay en total, AGRUPADO POR DIVISA.
 *
 * Nunca una cifra única: sumar euros y dólares da un número que no significa
 * nada. La agregación se hace en JavaScript a propósito — son un puñado de
 * cuentas ya agregadas en SQL, no miles de filas.
 */
export async function getNetWorth(userId: string): Promise<Money[]> {
  const list = await listAccounts(userId)
  return sumByCurrency(list.map((a) => a.balance))
}
