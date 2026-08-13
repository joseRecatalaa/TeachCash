import { requireUserId } from '@/lib/auth'
import { currentPeriod, isPeriod } from '@/lib/dates'
import { formatPeriod } from '@/lib/format'
import { abs } from '@/lib/money'
import { Card, CardTitle, EmptyState, MoneyText, PageHeader, Stat } from '@/components/ui'
import { getIncomeVsExpense, getMonthTotals, getSpendByCategory } from '@/features/transactions/queries'
import { PeriodPicker } from '@/features/transactions/components/period-picker'

export default async function InformesPage({ searchParams }: PageProps<'/informes'>) {
  const { periodo } = await searchParams
  const userId = await requireUserId()

  const period =
    typeof periodo === 'string' && isPeriod(periodo) ? periodo : currentPeriod()

  const [totals, spend, evolution] = await Promise.all([
    getMonthTotals(userId, period),
    getSpendByCategory(userId, period),
    getIncomeVsExpense(userId, { months: 12, until: period }),
  ])

  const mayorGasto = spend[0] ? abs(spend[0].total) : null

  return (
    <>
      <PageHeader
        title="Informes"
        description={formatPeriod(period)}
        action={<PeriodPicker period={period} />}
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Ingresos">
            <MoneyText value={totals.income} showSign colored />
          </Stat>
          <Stat label="Gastos">
            <MoneyText value={totals.expense} showSign colored />
          </Stat>
          <Stat label="Ahorro del mes">
            <MoneyText value={totals.net} showSign colored />
          </Stat>
        </div>

        <Card>
          <CardTitle>Gasto por categoría</CardTitle>
          {spend.length === 0 || !mayorGasto ? (
            <div className="mt-4">
              <EmptyState title="No hay gastos registrados en este mes." />
            </div>
          ) : (
            <table className="mt-4 w-full text-sm">
              <caption className="sr-only">
                Gasto por categoría en {formatPeriod(period)}, de mayor a menor
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 font-medium">Categoría</th>
                  <th className="py-2 text-right font-medium">Gasto</th>
                  <th className="py-2 pl-4 text-right font-medium">Peso</th>
                </tr>
              </thead>
              <tbody>
                {spend.map((row) => {
                  const magnitud = abs(row.total)
                  const peso = magnitud.amount / Math.abs(totals.expense.amount || 1)
                  return (
                    <tr key={row.categoryId ?? 'sin-categoria'} className="border-b border-border/60">
                      <td className="py-2">
                        {row.categoryIcon && <span aria-hidden>{row.categoryIcon} </span>}
                        {row.categoryName}
                      </td>
                      <td className="py-2 text-right">
                        <MoneyText value={magnitud} />
                      </td>
                      <td className="py-2 pl-4 text-right tabular text-muted">
                        {Math.round(peso * 100)} %
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardTitle>Ingresos y gastos mes a mes</CardTitle>
          {evolution.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Todavía no hay histórico que mostrar." />
            </div>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 font-medium">Mes</th>
                  <th className="py-2 text-right font-medium">Ingresos</th>
                  <th className="py-2 text-right font-medium">Gastos</th>
                  <th className="py-2 text-right font-medium">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {evolution.map((row) => (
                  <tr key={row.period} className="border-b border-border/60">
                    <td className="py-2">{formatPeriod(row.period)}</td>
                    <td className="py-2 text-right">
                      <MoneyText value={row.income} colored />
                    </td>
                    <td className="py-2 text-right">
                      <MoneyText value={abs(row.expense)} className="text-expense" />
                    </td>
                    <td className="py-2 text-right">
                      <MoneyText value={row.net} showSign colored />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  )
}
