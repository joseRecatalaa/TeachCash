'use client'

/**
 * Gráficos financieros. Ver las skills `finance-charts` y `dataviz`.
 *
 * Reglas que se cumplen aquí y conviene no romper al tocarlos:
 *
 *   - **Los ticks del eje van compactos ("1,2 mil €"), los tooltips completos.**
 *     Quien pasa el ratón quiere el importe exacto; el eje solo necesita dar
 *     escala.
 *   - **El color nunca es la única señal.** Los importes llevan su signo, las
 *     series llevan leyenda y cada barra de categoría lleva su nombre en el eje.
 *     Esto último no es cosmético: tres de los ocho tonos de la paleta
 *     categórica quedan por debajo de 3:1 de contraste sobre el papel, y la
 *     etiqueta visible es lo que lo hace admisible (la "relief rule" de
 *     `dataviz`). Si algún día se cambia a un donut sin etiquetas, deja de
 *     serlo.
 *   - **Ni un color escrito aquí.** Todos salen de tokens `--sd-*` / `--income`
 *     / `--expense`, que son los que tienen variante de modo oscuro y están
 *     validados con el script de `dataviz`. Recharts acepta `var()` en `fill` y
 *     `stroke` sin problema.
 *   - **El color sigue a la ENTIDAD, no a su posición.** Una categoría se pinta
 *     con el color que tiene guardado; solo las que no tienen ninguno caen al
 *     reparto por índice. Filtrar el gráfico no puede repintar las que quedan.
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
import { colorDeCategoria } from '@/lib/colores'
import { DIVISA_APP, money } from '@/lib/money'
import { EmptyState } from '@/src/presentation/components/ui'
import type {
  GastoPorCategoriaDto,
  PuntoSaldoDto,
  TotalesPeriodoDto,
} from '@/src/types/informe.types'

const COLOR_INGRESO = 'var(--income)'
const COLOR_GASTO = 'var(--expense)'

const tickImporte = (valor: number) => formatMoneyCompact(money(Math.round(valor), DIVISA_APP))

/** Tooltip común: importe completo, nunca compacto. */
function TooltipImporte({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
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
        <Text key={i} size="xs" className="tabular">
          {p.name}: {formatMoney(money(Math.round(p.value ?? 0), DIVISA_APP))}
        </Text>
      ))}
    </Paper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function IngresosVsGastosChart({ datos }: { datos: TotalesPeriodoDto[] }) {
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

  if (filas.length === 0) {
    return (
      <EmptyState
        dibujo="grafico"
        compacto
        titulo="Aún no hay meses que comparar"
        descripcion="Con un par de movimientos anotados, aquí verás cómo va cada mes."
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={filas} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis dataKey="periodo" tickLine={false} fontSize={12} />
        <YAxis tickFormatter={tickImporte} tickLine={false} fontSize={12} width={70} />
        <Tooltip content={<TooltipImporte />} cursor={{ opacity: 0.1 }} />
        <Legend />
        <Bar dataKey="Ingresos" fill={COLOR_INGRESO} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gastos" fill={COLOR_GASTO} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function GastoPorCategoriaChart({ datos }: { datos: GastoPorCategoriaDto[] }) {
  // Barras horizontales y no un donut: con más de cinco categorías, comparar
  // ángulos es mucho peor que comparar longitudes, y los nombres caben enteros
  // en el eje — que es además lo que hace legible la paleta (ver la cabecera).
  const filas = useMemo(
    () =>
      datos.slice(0, 10).map((d, i) => ({
        nombre: d.categoriaNombre,
        total: d.total,
        color: colorDeCategoria(d.categoriaColor, i),
      })),
    [datos],
  )

  if (filas.length === 0) {
    return (
      <EmptyState
        dibujo="grafico"
        compacto
        titulo="Ningún gasto este mes"
        descripcion="Cuando anotes gastos con categoría, aquí verás en qué se va el dinero."
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, filas.length * 34)}>
      <BarChart data={filas} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
        <XAxis type="number" tickFormatter={tickImporte} fontSize={12} />
        <YAxis type="category" dataKey="nombre" width={130} tickLine={false} fontSize={12} />
        <Tooltip content={<TooltipImporte />} cursor={{ opacity: 0.1 }} />
        <Bar dataKey="total" name="Gasto" radius={[0, 4, 4, 0]}>
          {filas.map((f) => (
            <Cell key={f.nombre} fill={f.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SerieSaldoChart({ datos }: { datos: PuntoSaldoDto[] }) {
  const filas = useMemo(
    () => datos.map((d) => ({ fecha: d.fecha, saldo: d.saldo })),
    [datos],
  )

  if (filas.length === 0) {
    return (
      <EmptyState
        dibujo="grafico"
        compacto
        titulo="Todavía no hay saldo que dibujar"
        descripcion="La línea arranca con tu primer movimiento."
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
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
          tickFormatter={tickImporte}
          tickLine={false}
          fontSize={12}
          width={70}
          // El eje de un saldo NO empieza forzosamente en cero: la variación es
          // lo que se quiere leer, y un cero lejano la aplasta contra el techo.
          domain={['auto', 'auto']}
        />
        <Tooltip
          content={<TooltipImporte />}
          labelFormatter={(f) => (typeof f === 'string' ? formatDate(f) : f)}
          cursor={{ opacity: 0.2 }}
        />
        <Line
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="var(--sd-accent)"
          strokeWidth={2}
          // Un punto por día: los marcadores taparían la línea entera.
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
