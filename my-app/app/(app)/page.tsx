import { Suspense } from 'react'
import Link from 'next/link'
import { requireUserId } from '@/lib/auth'
import { currentPeriod } from '@/lib/dates'
import { formatMoney, formatPeriod } from '@/lib/format'
import { abs, money } from '@/lib/money'
import { Card, CardTitle, EmptyState, MoneyText, PageHeader, Stat } from '@/components/ui'
import { getNetWorth, listAccounts } from '@/features/accounts/queries'
import {
  getBalanceSeries,
  getDefaultSeriesRange,
  getMonthTotals,
  getSpendByCategory,
  listTransactions,
} from '@/features/transactions/queries'
import { TransactionTable } from '@/features/transactions/components/transaction-table'
import { BalanceChart } from '@/features/transactions/components/charts'

/**
 * Se renderiza dentro de un Suspense propio: el saldo de las tarjetas se calcula
 * en milisegundos y la serie diaria no. Con un loading.tsx global, lo rápido
 * esperaría a lo lento.
 */
async function BalanceSection({ userId }: { userId: string }) {
  const range = await getDefaultSeriesRange(userId, 12)
  const series = await getBalanceSeries(userId, range)

  return (
    <BalanceChart data={series.map((p) => ({ date: p.date, amount: p.balance.amount }))} />
  )
}

export default async function DashboardPage() {
  const userId = await requireUserId()
  const period = currentPeriod()

  const [accounts, netWorth, totals, spend, recent] = await Promise.all([
    listAccounts(userId),
    getNetWorth(userId),
    getMonthTotals(userId, period),
    getSpendByCategory(userId, period),
    listTransactions(userId, { limit: 8 }),
  ])

  if (accounts.length === 0) {
    return (
      <>
        <PageHeader title="Resumen" />
        <EmptyState title="Empieza creando una cuenta">
          <Link href="/cuentas" className="underline">
            Ir a Cuentas
          </Link>
        </EmptyState>
      </>
    )
  }

  const mayorGasto = spend[0] ? abs(spend[0].total) : null

  return (
    <>
      <PageHeader title="Resumen" description={formatPeriod(period)} />

      <div className="flex flex-col gap-6">
        <Card>
          <CardTitle>Cuánto tengo en total</CardTitle>
          {/* Una cifra por divisa. Sumar euros y dólares en un solo número no
              significaría nada. */}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            {netWorth.length === 0 ? (
              <p className="text-3xl font-semibold tabular">{formatMoney(money(0))}</p>
            ) : (
              netWorth.map((m) => (
                <p key={m.currency} className="text-3xl font-semibold tabular">
                  {formatMoney(m)}
                </p>
              ))
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            Suma de {accounts.length} {accounts.length === 1 ? 'cuenta activa' : 'cuentas activas'}
          </p>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Ingresos del mes">
            <MoneyText value={totals.income} showSign colored />
          </Stat>
          <Stat label="Gastos del mes">
            <MoneyText value={totals.expense} showSign colored />
          </Stat>
          <Stat label="Diferencia" hint="Sin contar transferencias entre tus cuentas">
            <MoneyText value={totals.net} showSign colored />
          </Stat>
        </div>

        <Card>
          <CardTitle>Cómo evoluciona tu saldo</CardTitle>
          <div className="mt-4">
            <Suspense
              fallback={<div className="h-64 animate-pulse rounded-lg bg-border/40" />}
            >
              <BalanceSection userId={userId} />
            </Suspense>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Tus cuentas</CardTitle>
            <ul className="mt-3 flex flex-col gap-2">
              {accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-4 text-sm">
                  <Link href={`/cuentas/${account.id}`} className="hover:underline">
                    {account.name}
                  </Link>
                  <MoneyText value={account.balance} colored />
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitle>En qué se va el dinero este mes</CardTitle>
            {spend.length === 0 || !mayorGasto ? (
              <p className="mt-3 text-sm text-muted">Aún no hay gastos este mes.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2.5">
                {spend.slice(0, 8).map((row) => {
                  const magnitud = abs(row.total)
                  const ancho = (magnitud.amount / mayorGasto.amount) * 100
                  return (
                    <li key={row.categoryId ?? 'sin-categoria'}>
                      <div className="flex items-baseline justify-between gap-4 text-sm">
                        <span>
                          {row.categoryIcon && <span aria-hidden>{row.categoryIcon} </span>}
                          {row.categoryName}
                        </span>
                        <MoneyText value={magnitud} className="text-muted" />
                      </div>
                      <div
                        className="mt-1 h-1.5 rounded-full bg-border"
                        role="presentation"
                      >
                        <div
                          className="h-full rounded-full bg-expense"
                          style={{ width: `${ancho}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Últimos movimientos</CardTitle>
            <Link href="/movimientos" className="text-sm text-muted hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="mt-4">
            <TransactionTable transactions={recent} />
          </div>
        </Card>
      </div>
    </>
  )
}
