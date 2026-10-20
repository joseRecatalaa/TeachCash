/**
 * Lo que comparten la tabla, su filtro y su celda: los tipos de columna, los
 * operadores de filtro y las utilidades puras para leer y comparar valores.
 *
 * Sin JSX a propósito: es la parte de `AppTable` que se puede probar y razonar
 * sin montar nada.
 */

import type { DataTableColumn } from 'mantine-datatable'
import { formatDate, formatMoney } from '@/lib/format'
import { asCurrency, DIVISA_APP, isCurrency, type Currency } from '@/lib/money'
import { CLAVES_COLOR, esClaveColor } from '@/lib/colores'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type FilterOperator =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'

/**
 * Tipo de dato de la columna. Decide los operadores, el widget del filtro y
 * cómo se pinta el valor.
 *
 * **`money` no es un `number`.** El valor de la celda es un entero en céntimos y
 * la columna lo formatea con la divisa de su propia fila (`divisaAccessor`).
 * Declararlo como `number` pintaría "123456" donde deberían verse 1.234,56 €, y
 * lo ordenaría bien solo por casualidad.
 */
export type ColumnType = 'string' | 'number' | 'money' | 'boolean' | 'date' | 'enum'

export interface ColumnFilter {
  operator: FilterOperator
  value: string | number | null
  /** Solo para `between`. */
  valueTo?: string | number
}

/** Mapa de filtros activos: `{ [accessor]: ColumnFilter }`. */
export type FilterState = Record<string, ColumnFilter>

/**
 * Extiende `DataTableColumn` con lo que necesita `AppTable`. Se hace `Omit` de
 * `filter`/`filtering`/`hidden` porque son de uso interno.
 */
export type AppTableColumn<T> = Omit<
  DataTableColumn<T>,
  'filter' | 'filtering' | 'hidden'
> & {
  /**
   * `false` descarta la columna ANTES de procesarla: no se pinta y tampoco entra
   * en la ordenación, el buscador, el filtro ni el Excel. Es la forma de ocultar
   * una columna según el contexto de la vista. Por defecto `true`.
   */
  visible?: boolean
  /** Participa en el buscador global. */
  searchable?: boolean
  /** Muestra el desplegable de filtro en la cabecera. */
  filterable?: boolean
  type?: ColumnType
  /** Clave del metadata cuando difiere del accessor. */
  enumKey?: string
  /**
   * Opciones COMPLETAS del filtro de una columna `enum` cuyos valores no son un
   * enum del backend sino un catálogo (una categoría del usuario).
   *
   * Necesario en modo servidor: sin esto el desplegable solo ofrece los valores
   * de la página visible, no todos los que existen.
   */
  filterOptions?: { value: string; label: string }[]
  /** Solo `number`. Los de tipo `money` toman los decimales de su divisa. */
  decimalScale?: number
  /**
   * Solo `money`: campo de la fila que lleva la divisa. Por defecto `'divisa'`.
   *
   * Es obligatorio que exista: un importe sin divisa no se puede formatear
   * (regla dura 2). Si falta, la columna cae a EUR y lo avisa por consola.
   */
  divisaAccessor?: string
  /**
   * Solo `money`: pinta el signo siempre y colorea ingreso/gasto. Para columnas
   * de importe con signo (un movimiento). Una columna de saldo no lo usa.
   */
  signed?: boolean
  /** Pinta los valores como `Badge`. Solo si no hay `render` propio. */
  badge?: boolean
  /**
   * Tono fijo para todos los badges de la columna.
   *
   * Es una CLAVE del sistema de diseño (`'cat-1'`…`'cat-8'`, `'income'`,
   * `'expense'`, `'neutral'`), nunca un color ni un nombre de la paleta de
   * Mantine: el color de verdad lo pone `AppTable.module.css` desde un token, y
   * es lo que hace que el modo oscuro no haya que tocarlo aquí.
   */
  badgeColor?: string
  /**
   * Tono por valor: `{ expense: 'expense', income: 'income' }`. Para dar
   * semántica a un enum, ya que un color por posición no significa nada.
   */
  badgeColors?: Record<string, string>
  /**
   * Campo de la fila del que sale el tono, cuando el color es un DATO y no una
   * constante de la columna — el color propio de cada categoría. Prioritario
   * sobre `badgeColors` y `badgeColor`.
   */
  badgeColorAccessor?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Operadores
// ─────────────────────────────────────────────────────────────────────────────

export const OPERADORES: Record<ColumnType, { value: FilterOperator; label: string }[]> = {
  string: [
    { value: 'contains', label: 'Contiene' },
    { value: 'notContains', label: 'No contiene' },
    { value: 'equals', label: 'Es igual a' },
    { value: 'startsWith', label: 'Empieza por' },
    { value: 'endsWith', label: 'Termina en' },
  ],
  number: [
    { value: 'equals', label: 'Es igual a' },
    { value: 'notEquals', label: 'Distinto de' },
    { value: 'gt', label: 'Mayor que' },
    { value: 'gte', label: 'Mayor o igual' },
    { value: 'lt', label: 'Menor que' },
    { value: 'lte', label: 'Menor o igual' },
    { value: 'between', label: 'Entre' },
  ],
  money: [
    { value: 'equals', label: 'Es igual a' },
    { value: 'gt', label: 'Mayor que' },
    { value: 'gte', label: 'Mayor o igual' },
    { value: 'lt', label: 'Menor que' },
    { value: 'lte', label: 'Menor o igual' },
    { value: 'between', label: 'Entre' },
  ],
  date: [
    { value: 'equals', label: 'Es' },
    { value: 'gte', label: 'Desde' },
    { value: 'lte', label: 'Hasta' },
    { value: 'between', label: 'Entre' },
  ],
  boolean: [{ value: 'equals', label: 'Es' }],
  enum: [
    { value: 'equals', label: 'Es' },
    { value: 'notEquals', label: 'No es' },
  ],
}

/**
 * En modo servidor solo se ofrece la igualdad.
 *
 * El repositorio filtra por igualdad y por "contiene" en la búsqueda global; no
 * sabe hacer "entre" ni "mayor que". Ofrecerlos y luego mandarlos como igualdad
 * daría un resultado incorrecto sin que nada avisara, que es peor que no
 * ofrecerlos. Los operadores ricos siguen estando en modo cliente, donde se
 * aplican sobre el conjunto completo ya cargado.
 */
export const OPERADORES_SERVIDOR: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Es igual a' },
]

/**
 * La paleta categórica del sistema, no los colores de fábrica de Mantine: estos
 * tienen variante de modo oscuro y aquellos no.
 */
export const PALETA_BADGE = CLAVES_COLOR

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

export const accessorDe = <T,>(col: AppTableColumn<T>): string => String(col.accessor)

export const valorDe = (row: unknown, accessor: string): unknown =>
  (row as Record<string, unknown>)[accessor]

/**
 * La divisa de una fila para una columna `money`.
 *
 * Lo normal es que la fila no traiga ninguna: la aplicación trabaja en una sola
 * moneda y los DTOs no la llevan. Solo se busca en la fila si la columna declara
 * un `divisaAccessor`, y ahí sí un valor inválido es un bug que merece aviso.
 */
export const divisaDe = <T,>(row: T, col: AppTableColumn<T>): Currency => {
  if (!col.divisaAccessor) return DIVISA_APP

  const bruto = valorDe(row, col.divisaAccessor)
  if (typeof bruto === 'string' && isCurrency(bruto)) return asCurrency(bruto)
  console.warn(
    `[AppTable] La columna "${accessorDe(col)}" declara divisaAccessor ` +
      `"${col.divisaAccessor}" pero la fila no trae ahí una divisa válida. ` +
      `Se formatea como ${DIVISA_APP}.`,
  )
  return DIVISA_APP
}

/** Texto plano de una celda: para el buscador, los filtros y el Excel. */
export function textoDe<T>(row: T, col: AppTableColumn<T>): string {
  const bruto = valorDe(row, accessorDe(col))
  if (bruto === null || bruto === undefined) return ''
  if (col.type === 'boolean') return bruto ? 'Sí' : 'No'
  if (col.type === 'date' && typeof bruto === 'string') return formatDate(bruto)
  if (col.type === 'money' && typeof bruto === 'number') {
    return formatMoney({ amount: bruto, currency: divisaDe(row, col) })
  }
  return String(bruto)
}

/**
 * TONO de un badge — una clave, no un color. Por orden: el del propio dato, el
 * declarado para ese valor, el fijo de la columna y, si no hay nada, uno
 * estable por hash del texto.
 *
 * Devolver una clave y no un color es lo que permite que el valor se pinte con
 * un `data-tono` y que el color salga de un token: escribir aquí el color
 * obligaría a un `style` inline, y un `style` inline es un valor que el modo
 * oscuro no sabe traducir.
 *
 * El hash es el último recurso y no significa nada: solo garantiza que el mismo
 * valor salga siempre del mismo tono, que es lo que permite reconocerlo de un
 * vistazo al recorrer la columna.
 */
export const tonoBadge = (col: AppTableColumn<unknown>, valor: string, row: unknown): string => {
  if (col.badgeColorAccessor) {
    const clave = valorDe(row, col.badgeColorAccessor)
    if (typeof clave === 'string' && esClaveColor(clave)) return clave
  }
  if (col.badgeColors?.[valor]) return col.badgeColors[valor]
  if (col.badgeColor) return col.badgeColor
  let hash = 0
  for (let i = 0; i < valor.length; i++) hash = (hash * 31 + valor.charCodeAt(i)) | 0
  return PALETA_BADGE[Math.abs(hash) % PALETA_BADGE.length]
}

export function comparar(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  // Las fechas civiles son 'YYYY-MM-DD': ordenan bien como texto, así que no
  // hace falta convertirlas a Date (ni conviene: eso reintroduciría el huso).
  return String(a).localeCompare(String(b), 'es', { numeric: true })
}

export function cumpleFiltro(valor: unknown, filtro: ColumnFilter, tipo: ColumnType): boolean {
  const { operator, value, valueTo } = filtro
  if (value === null || value === '') return true

  if (tipo === 'number' || tipo === 'money') {
    const n = typeof valor === 'number' ? valor : Number(valor)
    const objetivo = Number(value)
    if (Number.isNaN(n) || Number.isNaN(objetivo)) return true
    switch (operator) {
      case 'equals':
        return n === objetivo
      case 'notEquals':
        return n !== objetivo
      case 'gt':
        return n > objetivo
      case 'gte':
        return n >= objetivo
      case 'lt':
        return n < objetivo
      case 'lte':
        return n <= objetivo
      case 'between':
        return n >= objetivo && n <= Number(valueTo ?? objetivo)
      default:
        return true
    }
  }

  const texto = String(valor ?? '').toLowerCase()
  const objetivo = String(value).toLowerCase()

  switch (operator) {
    case 'contains':
      return texto.includes(objetivo)
    case 'notContains':
      return !texto.includes(objetivo)
    case 'equals':
      return texto === objetivo
    case 'notEquals':
      return texto !== objetivo
    case 'startsWith':
      return texto.startsWith(objetivo)
    case 'endsWith':
      return texto.endsWith(objetivo)
    case 'gte':
      return texto >= objetivo
    case 'lte':
      return texto <= objetivo
    case 'between':
      return texto >= objetivo && texto <= String(valueTo ?? value).toLowerCase()
    default:
      return true
  }
}
