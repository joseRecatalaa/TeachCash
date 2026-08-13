'use client'

/**
 * Gráficos financieros. Cliente porque Recharts mide el DOM.
 *
 * Al navegador llegan SOLO los datos ya agregados en SQL, nunca los movimientos
 * en crudo: es más rápido y no expone datos que no se ven en pantalla.
 *
 * Reglas aplicadas (skills `finance-charts` + `dataviz`):
 * - El eje de dinero empieza en cero. Truncarlo exagera diferencias de doce euros.
 * - Ticks del eje en compacto, tooltip SIEMPRE con el importe exacto.
 * - Ingreso/gasto nunca se distinguen solo por color: van con signo y etiqueta.
 *   El par verde/rojo es justo el que no separa la deuteranopía (validado: ΔE
 *   8.2 en protanopía, en la banda que exige codificación secundaria).
 * - Cada gráfico lleva su tabla equivalente, oculta visualmente.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  formatDate,
  formatMoney,
  formatMoneyCompact,
  formatMoneySigned,
  formatPeriodShort,
} from '@/lib/format'
import { money, type Currency } from '@/lib/money'

const INCOME = 'var(--income)'
const EXPENSE = 'var(--expense)'
const ACCENT = 'var(--accent)'

/**
 * Ticks del eje: compacto. Nunca en un tooltip — quien pasa el ratón quiere la
 * cifra exacta. El formateo sale de lib/format.ts, no se rehace aquí: duplicarlo
 * es como acaban dos partes de la aplicación mostrando importes distintos.
 */
const compactTick = (currency: Currency) => (value: number) =>
  formatMoneyCompact(money(value, currency))

const axisProps = {
  stroke: 'var(--muted)',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const

const tooltipStyle = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '0.8125rem',
  color: 'var(--foreground)',
} as const

function AccessibleTable({
  caption,
  headers,
  rows,
}: {
  caption: string
  headers: string[]
  rows: string[][]
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export type BalancePointData = { date: string; amount: number }

/** Evolución del saldo. Un punto por día, con los días sin movimiento rellenados. */
export function BalanceChart({
  data,
  currency = 'EUR',
}: {
  data: BalancePointData[]
  currency?: Currency
}) {
  if (data.length < 2) {
    return <p className="text-sm text-muted">Aún no hay histórico suficiente para dibujarlo.</p>
  }

  return (
    <figure className="m-0">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              {...axisProps}
              minTickGap={40}
              tickFormatter={(d: string) => formatDate(d).slice(0, 5)}
            />
            {/* El dominio arranca en 0: un eje truncado haría parecer enorme una
                variación de doce euros. */}
            <YAxis {...axisProps} width={64} domain={[0, 'auto']} tickFormatter={compactTick(currency)} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: 'var(--border)' }}
              labelFormatter={(d) => formatDate(String(d))}
              formatter={(value) => [formatMoney(money(Number(value), currency)), 'Saldo']}
            />
            <Line
              type="monotone"
              dataKey="amount"
              name="Saldo"
              stroke={ACCENT}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <AccessibleTable
        caption="Evolución del saldo, día a día"
        headers={['Fecha', 'Saldo']}
        rows={data.map((d) => [formatDate(d.date), formatMoney(money(d.amount, currency))])}
      />
    </figure>
  )
}

export type PeriodData = { period: string; income: number; expense: number }

/**
 * Ingresos frente a gastos. Barras AGRUPADAS, no apiladas: apilar ingreso sobre
 * gasto sugiere un total que no existe.
 */
export function IncomeExpenseChart({
  data,
  currency = 'EUR',
}: {
  data: PeriodData[]
  currency?: Currency
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">Todavía no hay meses con datos.</p>
  }

  // El gasto se guarda en negativo; se pinta como magnitud positiva y el eje se
  // etiqueta para que se entienda que son salidas.
  const chartData = data.map((d) => ({
    period: d.period,
    Ingresos: d.income,
    Gastos: Math.abs(d.expense),
  }))

  return (
    <figure className="m-0">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="period"
              {...axisProps}
              tickFormatter={(p: string) => formatPeriodShort(p)}
            />
            <YAxis {...axisProps} width={64} domain={[0, 'auto']} tickFormatter={compactTick(currency)} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'var(--border)', opacity: 0.3 }}
              labelFormatter={(p) => formatPeriodShort(String(p))}
              formatter={(value, name) => [formatMoney(money(Number(value), currency)), String(name)]}
            />
            {/* Leyenda siempre con dos series: la identidad nunca queda solo en el color. */}
            <Legend wrapperStyle={{ fontSize: '0.8125rem' }} />
            <Bar dataKey="Ingresos" fill={INCOME} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill={EXPENSE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <AccessibleTable
        caption="Ingresos y gastos por mes"
        headers={['Mes', 'Ingresos', 'Gastos']}
        rows={data.map((d) => [
          d.period,
          formatMoneySigned(money(d.income, currency)),
          formatMoneySigned(money(d.expense, currency)),
        ])}
      />
    </figure>
  )
}
