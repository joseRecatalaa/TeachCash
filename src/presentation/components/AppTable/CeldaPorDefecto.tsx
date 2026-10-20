'use client'

/**
 * Cómo se pinta una celda cuando la columna no trae `render` propio: según su
 * tipo (dinero, fecha, sí/no, enumeración) y, si lo pide, como `Badge`.
 */

import { Badge, Text } from '@mantine/core'
import { formatDate, formatMoney, formatMoneySigned } from '@/lib/format'
import type { EnumValueDto } from '@/src/types/formMetadata.types'
import { divisaDe, tonoBadge, valorDe, type AppTableColumn } from './columnas'
import styles from './AppTable.module.css'

interface CeldaProps<T> {
  row: T
  col: AppTableColumn<T>
  accessor: string
  enumMetadata?: Record<string, EnumValueDto[]>
}

/**
 * El color de un importe con signo: los TOKENS y no `red.7`/`teal.7`, que están
 * validados para daltonismo y tienen variante oscura; los de Mantine no. El
 * color es la SEGUNDA señal: la primera es el signo, que `formatMoneySigned`
 * pone siempre. Un cero no lleva color.
 */
function colorDeImporte(centimos: number): string | undefined {
  if (centimos < 0) return 'var(--expense)'
  if (centimos > 0) return 'var(--income)'
  return undefined
}

function CeldaDinero<T>({ row, col, bruto }: { row: T; col: AppTableColumn<T>; bruto: unknown }) {
  if (typeof bruto !== 'number') return '—'
  const importe = { amount: bruto, currency: divisaDe(row, col) }
  return (
    <Text
      size="sm"
      // Cifras tabulares: sin esto los importes de una columna no alinean sus
      // dígitos y cuesta comparar de un vistazo.
      ff="monospace"
      // Lo lee `AppTable.module.css` para forzar cifras de ancho fijo en la
      // celda entera. No es un gancho de test.
      data-money=""
      c={col.signed ? colorDeImporte(bruto) : undefined}
    >
      {col.signed ? formatMoneySigned(importe) : formatMoney(importe)}
    </Text>
  )
}

export function CeldaPorDefecto<T>({ row, col, accessor, enumMetadata }: CeldaProps<T>) {
  const tipo = col.type ?? 'string'
  const bruto = valorDe(row, accessor)

  if (tipo === 'money') return <CeldaDinero row={row} col={col} bruto={bruto} />
  if (tipo === 'date' && typeof bruto === 'string' && bruto) return formatDate(bruto)
  if (tipo === 'boolean') return bruto ? 'Sí' : 'No'
  if (bruto === null || bruto === undefined || bruto === '') return '—'

  const texto =
    tipo === 'enum'
      ? (enumMetadata?.[col.enumKey ?? accessor]?.find((v) => v.key === bruto)?.label ??
        String(bruto))
      : String(bruto)

  if (!col.badge) return texto

  // El tono viaja como `data-tono` y el COLOR lo pone `AppTable.module.css`. La
  // prop `color` de Mantine solo acepta nombres de su propia paleta, que no
  // tiene modo oscuro aquí.
  const tono = tonoBadge(col as AppTableColumn<unknown>, String(bruto), row)
  return (
    <Badge variant="light" className={styles.badge} data-tono={tono}>
      {texto}
    </Badge>
  )
}
