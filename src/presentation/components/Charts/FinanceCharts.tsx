'use client'

/**
 * Gráficos financieros. Ver las skills `finance-charts` y `dataviz`.
 *
 * Reglas que se cumplen aquí y conviene no romper al tocarlos:
 *
 *   - **Los ticks del eje van compactos ("1,2 mil €"), los tooltips completos.**
 *     Quien pasa el ratón quiere el importe exacto; el eje solo necesita dar
 *     escala.
 *   - **Un gráfico, una divisa.** Cada uno recibe la suya y la enseña en el
 *     título del eje. Mezclar euros y dólares en una serie da una línea que no
 *     significa nada (regla dura 2).
 *   - **El color nunca es la única señal.** Los importes llevan su signo, y las
 *     series llevan leyenda. El par verde/rojo es justo el que no distingue la
 *     deuteranopía. Los tonos salen de `--income` / `--expense` en
 *     `globals.css`, y están validados con el script de `dataviz`: si los
 *     cambias, vuelve a pasarlo.
 */

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Paper, Text } from '@mantine/core'
import { formatDate, formatMoney, formatMoneyCompact, formatPeriodShort } from '@/lib/format'
import { money, type Currency } from '@/lib/money'
import type {
  GastoPorCategoriaDto,
  PuntoSaldoDto,
  TotalesPeriodoDto,
} from '@/src/types/informe.types'

const COLOR_INGRESO = 'var(--income)'
const COLOR_GASTO = 'var(--expense)'

/** Paleta categórica para el gasto por categoría. No usa el par ingreso/gasto. */
const PALETA = [
  '#3b7dd8',
  '#7b57c9',
  '#c9557f',
  '#d98324',
  '#2f9c8f',
  '#8a8f3d',
  '#5b6b8c',
  '#b0562e',
]

const tickImporte = (divisa: Currency) => (valor: number) =>
  formatMoneyCompact(money(Math.round(valor), divisa))

/** Tooltip común: importe completo, nunca compacto. */
function TooltipImporte({
  active,
  payload,
  label,
  divisa,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
  divisa: Currency
}) {
  if (!active || !payload?.length) return null
  return (
    <Paper p="xs" withBorder shadow="md">
      {label && (
        <Text size="xs" fw={600} mb={4}>
          {label}
        </Text>
      )}
      {payload.map((p, i) => (
        <Text key={i} size="xs" className="tabular" c={p.color}>
          {p.name}: {formatMoney(money(Math.round(p.value ?? 0), divisa))}
        </Text>
      ))}
    </Paper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function IngresosVsGastosChart({ datos }: { datos: TotalesPeriodoDto[] }) {
  const divisa = datos[0]?.divisa ?? 'EUR'

  // Los gastos llegan ya en magnitud positiva desde el repositorio. Barras
  // agrupadas y no apiladas: apiladas darían un total de ingresos + gastos, que
  // no es una cantidad que signifique nada.
  const filas = useMemo(
    () =>
      datos.map((d) => ({
        periodo: formatPeriodShort(d.periodo),
        Ingresos: d.ingresos,
        Gastos: d.gastos,
      })),
    [datos],
  )

  if (filas.length === 0) return <SinDatos />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={filas} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis dataKey="periodo" tickLine={false} fontSize={12} />
        <YAxis tickFormatter={tickImporte(divisa)} tickLine={false} fontSize={12} width={70} />
        <Tooltip content={<TooltipImporte divisa={divisa} />} cursor={{ opacity: 0.1 }} />
        <Legend />
        <Bar dataKey="Ingresos" fill={COLOR_INGRESO} radius={[3, 3, 0, 0]} />
        <Bar dataKey="Gastos" fill={COLOR_GASTO} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GastoPorCategoriaChart({ datos }: { datos: GastoPorCategoriaDto[] }) {
  const divisa = datos[0]?.divisa ?? 'EUR'

  // Barras horizontales y no un donut: con más de cinco categorías, comparar
  // ángulos es mucho peor que comparar longitudes, y los nombres caben.
  const filas = useMemo(
    () => datos.slice(0, 10).map((d) => ({ nombre: d.categoriaNombre, total: d.total })),
    [datos],
  )

  if (filas.length === 0) return <SinDatos />

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, filas.length * 34)}>
      <BarChart data={filas} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
        <XAxis type="number" tickFormatter={tickImporte(divisa)} fontSize={12} />
        <YAxis type="category" dataKey="nombre" width={140} tickLine={false} fontSize={12} />
        <Tooltip content={<TooltipImporte divisa={divisa} />} cursor={{ opacity: 0.1 }} />
        <Bar dataKey="total" name="Gasto" radius={[0, 3, 3, 0]}>
          {filas.map((_, i) => (
            <Cell key={i} fill={PALETA[i % PALETA.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SerieSaldoChart({ datos }: { datos: PuntoSaldoDto[] }) {
  const divisa = datos[0]?.divisa ?? 'EUR'

  const filas = useMemo(
    () => datos.map((d) => ({ fecha: d.fecha, saldo: d.saldo })),
    [datos],
  )

  if (filas.length === 0) return <SinDatos />

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={filas} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis
          dataKey="fecha"
          tickFormatter={(f: string) => formatDate(f).slice(0, 5)}
          // Un punto por día son muchos ticks: se pinta uno de cada quince.
          interval={Math.max(0, Math.floor(filas.length / 15))}
          tickLine={false}
          fontSize={12}
        />
        <YAxis
          tickFormatter={tickImporte(divisa)}
          tickLine={false}
          fontSize={12}
          width={70}
          // El eje de un saldo NO empieza forzosamente en cero: la variación es
          // lo que se quiere leer, y un cero lejano la aplasta contra el techo.
          domain={['auto', 'auto']}
        />
        <Tooltip
          content={<TooltipImporte divisa={divisa} />}
          labelFormatter={(f) => (typeof f === 'string' ? formatDate(f) : f)}
          cursor={{ opacity: 0.2 }}
        />
        <Line
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="var(--mantine-color-teal-6)"
          strokeWidth={2}
          // Un punto por día: los marcadores taparían la línea entera.
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function SinDatos() {
  return (
    <Text c="dimmed" size="sm" ta="center" py="xl">
      Todavía no hay datos suficientes para este gráfico.
    </Text>
  )
}
