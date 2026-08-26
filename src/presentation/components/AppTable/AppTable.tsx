'use client'

/**
 * Tabla genérica: buscador, filtros por columna, ordenación, paginación y
 * exportación a Excel.
 *
 * Recibe un `AppTableColumn<T>[]` declarado en un `columns.ts` sin JSX. El tipo
 * de columna que hay que tener presente es **`money`**: ver `ColumnType`.
 *
 * Trabaja en dos modos:
 *   - **cliente** (por defecto): recibe el conjunto completo y filtra, ordena y
 *     pagina en memoria. Es lo que usan Cuentas y Categorías.
 *   - **servidor** (`manual*` + callbacks): la tabla solo avisa de lo que la
 *     persona ha pedido y el repositorio hace el trabajo. Es lo que usa
 *     Movimientos, que es la tabla que crece sin techo.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  NumberInput,
  Popover,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { DataTable, type DataTableColumn, type DataTableSortStatus } from 'mantine-datatable'
import {
  IconFilter,
  IconFilterFilled,
  IconFileSpreadsheet,
  IconSearch,
  IconX,
} from '@tabler/icons-react'
import { formatDate, formatMoney, formatMoneySigned, scaleOf } from '@/lib/format'
import { asCurrency, isCurrency, type Currency } from '@/lib/money'
import type { EnumValueDto } from '@/src/types/formMetadata.types'
import styles from './AppTable.module.css'

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
   * enum del backend sino un catálogo (una cuenta, una categoría).
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
  /** Color fijo para todos los badges de la columna. */
  badgeColor?: string
  /**
   * Color por valor: `{ expense: 'red', income: 'teal' }`. Para dar semántica a
   * un enum, ya que un color por posición no significa nada.
   */
  badgeColors?: Record<string, string>
}

/** Props del modo servidor. */
export interface AppTableManualProps<T> {
  manualFiltering?: boolean
  manualSorting?: boolean
  manualPagination?: boolean
  /** Total de registros del servidor. Obligatorio con `manualPagination`. */
  serverTotalRecords?: number
  /** Página controlada por el padre, para poder resetear a 1 al filtrar. */
  currentPage?: number
  onFiltersChange?: (filters: FilterState) => void
  onSortChange?: (sort: DataTableSortStatus<T>) => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSearchChange?: (search: string) => void
}

export interface AppTableProps<T> extends AppTableManualProps<T> {
  data: T[]
  columns: AppTableColumn<T>[]
  isLoading?: boolean
  pageSize?: number
  noRecordsText?: string
  searchPlaceholder?: string
  /** Propiedad usada como clave única de fila. Por defecto `'id'`. */
  idAccessor?: string
  /** Altura fija: activa scroll interno. `'auto'` lo desactiva. */
  height?: number | string
  /** Nombre del fichero Excel (sin extensión). Si se omite, no hay botón. */
  exportExcel?: string
  /** Contenido extra en la barra de herramientas, a la derecha. */
  toolbarActions?: React.ReactNode
  defaultSort?: { columnAccessor: keyof T & string; direction: 'asc' | 'desc' }
  /** Opciones de los filtros `enum`, resueltas desde el metadata del recurso. */
  enumMetadata?: Record<string, EnumValueDto[]>
  onRowClick?: (record: T) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200]

const OPERADORES: Record<ColumnType, { value: FilterOperator; label: string }[]> = {
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
const OPERADORES_SERVIDOR: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Es igual a' },
]

const PALETA_BADGE = ['blue', 'teal', 'grape', 'orange', 'cyan', 'lime', 'pink', 'indigo']

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────────────────────

const accessorDe = <T,>(col: AppTableColumn<T>): string => String(col.accessor)

const valorDe = (row: unknown, accessor: string): unknown =>
  (row as Record<string, unknown>)[accessor]

/** La divisa de una fila para una columna `money`. Cae a EUR y avisa si falta. */
const divisaDe = <T,>(row: T, col: AppTableColumn<T>): Currency => {
  const bruto = valorDe(row, col.divisaAccessor ?? 'divisa')
  if (typeof bruto === 'string' && isCurrency(bruto)) return asCurrency(bruto)
  console.warn(
    `[AppTable] La columna "${accessorDe(col)}" es de tipo money pero la fila no trae divisa ` +
      `en "${col.divisaAccessor ?? 'divisa'}". Se formatea como EUR.`,
  )
  return 'EUR'
}

/** Texto plano de una celda: para el buscador, los filtros y el Excel. */
function textoDe<T>(row: T, col: AppTableColumn<T>): string {
  const bruto = valorDe(row, accessorDe(col))
  if (bruto === null || bruto === undefined) return ''
  if (col.type === 'boolean') return bruto ? 'Sí' : 'No'
  if (col.type === 'date' && typeof bruto === 'string') return formatDate(bruto)
  if (col.type === 'money' && typeof bruto === 'number') {
    return formatMoney({ amount: bruto, currency: divisaDe(row, col) })
  }
  return String(bruto)
}

/** Color estable de un badge a partir de su valor. */
const colorBadge = (col: AppTableColumn<unknown>, valor: string): string => {
  if (col.badgeColors?.[valor]) return col.badgeColors[valor]
  if (col.badgeColor) return col.badgeColor
  let hash = 0
  for (let i = 0; i < valor.length; i++) hash = (hash * 31 + valor.charCodeAt(i)) | 0
  return PALETA_BADGE[Math.abs(hash) % PALETA_BADGE.length]
}

function comparar(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return -1
  if (b === null || b === undefined) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  // Las fechas civiles son 'YYYY-MM-DD': ordenan bien como texto, así que no
  // hace falta convertirlas a Date (ni conviene: eso reintroduciría el huso).
  return String(a).localeCompare(String(b), 'es', { numeric: true })
}

function cumpleFiltro(valor: unknown, filtro: ColumnFilter, tipo: ColumnType): boolean {
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

// ─────────────────────────────────────────────────────────────────────────────
// Filtro de columna
// ─────────────────────────────────────────────────────────────────────────────

function FiltroColumna<T>({
  col,
  filtro,
  onChange,
  manual,
  enumMetadata,
  data,
}: {
  col: AppTableColumn<T>
  filtro?: ColumnFilter
  onChange: (filtro: ColumnFilter | undefined) => void
  manual: boolean
  enumMetadata?: Record<string, EnumValueDto[]>
  data: T[]
}) {
  const [abierto, setAbierto] = useState(false)
  const tipo = col.type ?? 'string'
  const operadores = manual ? OPERADORES_SERVIDOR : OPERADORES[tipo]
  const operator = filtro?.operator ?? operadores[0].value
  const activo = filtro?.value !== undefined && filtro.value !== null && filtro.value !== ''

  const opciones = useMemo(() => {
    if (col.filterOptions) return col.filterOptions
    const delMetadata = enumMetadata?.[col.enumKey ?? accessorDe(col)]
    if (delMetadata) return delMetadata.map((v) => ({ value: v.key, label: v.label }))
    if (tipo === 'boolean') {
      return [
        { value: 'true', label: 'Sí' },
        { value: 'false', label: 'No' },
      ]
    }
    // Último recurso: los valores presentes en los datos cargados. En modo
    // servidor eso es solo la página visible, y por eso `filterOptions` es la
    // vía recomendada para las columnas de catálogo.
    const vistos = new Set<string>()
    for (const row of data) {
      const v = valorDe(row, accessorDe(col))
      if (v !== null && v !== undefined && v !== '') vistos.add(String(v))
    }
    return [...vistos].sort().map((v) => ({ value: v, label: v }))
  }, [col, enumMetadata, tipo, data])

  const setValor = (value: string | number | null, valueTo?: string | number) => {
    if (value === null || value === '') onChange(undefined)
    else onChange({ operator, value, valueTo })
  }

  return (
    <Popover opened={abierto} onChange={setAbierto} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon
          size="sm"
          variant={activo ? 'filled' : 'subtle'}
          color={activo ? 'blue' : 'gray'}
          aria-label={`Filtrar por ${col.title ?? accessorDe(col)}`}
          onClick={(e) => {
            e.stopPropagation()
            setAbierto((o) => !o)
          }}
        >
          {activo ? <IconFilterFilled size={14} /> : <IconFilter size={14} />}
        </ActionIcon>
      </Popover.Target>

      <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
        <Stack gap="xs" w={240}>
          {operadores.length > 1 && (
            <Select
              size="xs"
              label="Operador"
              data={operadores}
              value={operator}
              allowDeselect={false}
              onChange={(v) =>
                onChange(
                  filtro ? { ...filtro, operator: (v as FilterOperator) ?? operator } : undefined,
                )
              }
            />
          )}

          {tipo === 'enum' || tipo === 'boolean' ? (
            <Select
              size="xs"
              label="Valor"
              placeholder="Cualquiera"
              data={opciones}
              value={filtro?.value != null ? String(filtro.value) : null}
              clearable
              searchable={opciones.length > 8}
              onChange={(v) => setValor(v)}
            />
          ) : tipo === 'number' || tipo === 'money' ? (
            <Group grow gap="xs" align="flex-end">
              <NumberInput
                size="xs"
                label={tipo === 'money' ? 'Importe (céntimos)' : 'Valor'}
                value={filtro?.value ?? ''}
                onChange={(v) => setValor(v === '' ? null : Number(v), filtro?.valueTo)}
              />
              {operator === 'between' && (
                <NumberInput
                  size="xs"
                  label="Hasta"
                  value={filtro?.valueTo ?? ''}
                  onChange={(v) => setValor(filtro?.value ?? null, Number(v))}
                />
              )}
            </Group>
          ) : (
            <TextInput
              size="xs"
              label="Valor"
              placeholder={tipo === 'date' ? 'AAAA-MM-DD' : 'Escribe para filtrar'}
              value={filtro?.value != null ? String(filtro.value) : ''}
              onChange={(e) => setValor(e.currentTarget.value)}
            />
          )}

          {activo && (
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconX size={14} />}
              onClick={() => {
                onChange(undefined)
                setAbierto(false)
              }}
            >
              Quitar filtro
            </Button>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AppTable
// ─────────────────────────────────────────────────────────────────────────────

export function AppTable<T extends object>({
  data,
  columns,
  isLoading,
  pageSize: pageSizeInicial = DEFAULT_PAGE_SIZE,
  noRecordsText = 'No hay registros',
  searchPlaceholder = 'Buscar...',
  idAccessor = 'id',
  height = '65vh',
  exportExcel,
  toolbarActions,
  defaultSort,
  enumMetadata,
  onRowClick,
  manualFiltering = false,
  manualSorting = false,
  manualPagination = false,
  serverTotalRecords,
  currentPage,
  onFiltersChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
}: AppTableProps<T>) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(pageSizeInicial)
  const [busqueda, setBusqueda] = useState('')
  const [filtros, setFiltros] = useState<FilterState>({})
  const [sort, setSort] = useState<DataTableSortStatus<T>>(() => ({
    columnAccessor: defaultSort?.columnAccessor ?? idAccessor,
    direction: defaultSort?.direction ?? 'asc',
  }))

  // En modo servidor la página la manda el padre: es él quien la resetea a 1
  // cuando cambian los filtros. Se sincroniza durante el render, no en un
  // efecto, para no pintar una vez con la página vieja.
  const [paginaDelPadre, setPaginaDelPadre] = useState(currentPage)
  if (manualPagination && currentPage !== undefined && currentPage !== paginaDelPadre) {
    setPaginaDelPadre(currentPage)
    setPage(currentPage)
  }

  const visibles = useMemo(() => columns.filter((c) => c.visible !== false), [columns])

  // ── Buscador ───────────────────────────────────────────────────────────────
  const handleBusqueda = useCallback(
    (valor: string) => {
      setBusqueda(valor)
      if (!manualFiltering) setPage(1)
      onSearchChange?.(valor)
    },
    [manualFiltering, onSearchChange],
  )

  const handleFiltro = useCallback(
    (accessor: string, filtro: ColumnFilter | undefined) => {
      setFiltros((prev) => {
        const siguiente = { ...prev }
        if (filtro) siguiente[accessor] = filtro
        else delete siguiente[accessor]
        onFiltersChange?.(siguiente)
        return siguiente
      })
      if (!manualFiltering) setPage(1)
    },
    [manualFiltering, onFiltersChange],
  )

  const handleSort = useCallback(
    (s: DataTableSortStatus<T>) => {
      setSort(s)
      if (!manualSorting) setPage(1)
      onSortChange?.(s)
    },
    [manualSorting, onSortChange],
  )

  // ── Procesado en memoria (modo cliente) ────────────────────────────────────
  const procesados = useMemo(() => {
    let filas = data

    if (!manualFiltering) {
      const termino = busqueda.trim().toLowerCase()
      if (termino) {
        const buscables = visibles.filter((c) => c.searchable)
        // Sin columnas marcadas como `searchable` se busca en todas: es más útil
        // que un buscador que no encuentra nada y no explica por qué.
        const donde = buscables.length > 0 ? buscables : visibles
        filas = filas.filter((row) =>
          donde.some((col) => textoDe(row, col).toLowerCase().includes(termino)),
        )
      }

      for (const [accessor, filtro] of Object.entries(filtros)) {
        const col = visibles.find((c) => accessorDe(c) === accessor)
        if (!col) continue
        filas = filas.filter((row) =>
          cumpleFiltro(valorDe(row, accessor), filtro, col.type ?? 'string'),
        )
      }
    }

    if (!manualSorting) {
      const accessor = String(sort.columnAccessor)
      const signo = sort.direction === 'desc' ? -1 : 1
      filas = [...filas].sort(
        (a, b) => signo * comparar(valorDe(a, accessor), valorDe(b, accessor)),
      )
    }

    return filas
  }, [data, visibles, busqueda, filtros, sort, manualFiltering, manualSorting])

  const total = manualPagination ? (serverTotalRecords ?? 0) : procesados.length

  const pagina = useMemo(
    () =>
      manualPagination ? procesados : procesados.slice((page - 1) * pageSize, page * pageSize),
    [procesados, page, pageSize, manualPagination],
  )

  // ── Exportación a Excel ────────────────────────────────────────────────────
  const exportar = useCallback(async () => {
    // `xlsx` pesa; se carga solo cuando alguien pulsa el botón.
    const XLSX = await import('xlsx')

    const filas = procesados.map((row) => {
      const salida: Record<string, string | number | boolean | null> = {}
      for (const col of visibles) {
        const titulo = typeof col.title === 'string' ? col.title : accessorDe(col)
        const bruto = valorDe(row, accessorDe(col))

        if (col.type === 'money' && typeof bruto === 'number') {
          // Aquí, y solo aquí además de la pantalla, los céntimos se vuelven
          // decimales: una hoja de cálculo tiene que poder sumar la columna, y
          // "123456" no es una cantidad de dinero para Excel.
          salida[titulo] = bruto / scaleOf(divisaDe(row, col))
          salida[`${titulo} (divisa)`] = divisaDe(row, col)
        } else if (col.type === 'boolean') {
          salida[titulo] = bruto ? 'Sí' : 'No'
        } else {
          salida[titulo] = (bruto ?? '') as string | number
        }
      }
      return salida
    })

    const hoja = XLSX.utils.json_to_sheet(filas)
    const libro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(libro, hoja, 'Datos')
    XLSX.writeFile(libro, `${exportExcel}.xlsx`)
  }, [procesados, visibles, exportExcel])

  // ── Columnas para mantine-datatable ────────────────────────────────────────
  const columnasTabla = useMemo<DataTableColumn<T>[]>(
    () =>
      visibles.map((col) => {
        const accessor = accessorDe(col)
        const tipo = col.type ?? 'string'
        const alineadaDerecha = tipo === 'money' || tipo === 'number'

        const filtroUI = col.filterable ? (
          <FiltroColumna
            col={col}
            filtro={filtros[accessor]}
            onChange={(f) => handleFiltro(accessor, f)}
            manual={manualFiltering}
            enumMetadata={enumMetadata}
            data={data}
          />
        ) : null

        return {
          ...(col as DataTableColumn<T>),
          textAlign: col.textAlign ?? (alineadaDerecha ? 'right' : 'left'),
          title: filtroUI ? (
            <Group gap={4} wrap="nowrap" justify={alineadaDerecha ? 'flex-end' : 'flex-start'}>
              <span>{col.title ?? accessor}</span>
              {filtroUI}
            </Group>
          ) : (
            (col.title ?? accessor)
          ),
          render:
            col.render ??
            ((row: T) => {
              const bruto = valorDe(row, accessor)

              if (tipo === 'money') {
                if (typeof bruto !== 'number') return '—'
                const importe = { amount: bruto, currency: divisaDe(row, col) }
                return (
                  <Text
                    size="sm"
                    // Cifras tabulares: sin esto los importes de una columna no
                    // alinean sus dígitos y cuesta comparar de un vistazo.
                    ff="monospace"
                    // Lo lee `AppTable.module.css` para forzar cifras de ancho
                    // fijo en la celda entera. No es un gancho de test.
                    data-money=""
                    c={col.signed ? (bruto < 0 ? 'red.7' : bruto > 0 ? 'teal.7' : undefined) : undefined}
                  >
                    {col.signed ? formatMoneySigned(importe) : formatMoney(importe)}
                  </Text>
                )
              }

              if (tipo === 'date' && typeof bruto === 'string' && bruto) {
                return formatDate(bruto)
              }

              if (tipo === 'boolean') return bruto ? 'Sí' : 'No'

              if (bruto === null || bruto === undefined || bruto === '') return '—'

              const texto =
                tipo === 'enum'
                  ? (enumMetadata?.[col.enumKey ?? accessor]?.find((v) => v.key === bruto)
                      ?.label ?? String(bruto))
                  : String(bruto)

              if (col.badge) {
                return (
                  <Badge
                    variant="light"
                    color={colorBadge(col as AppTableColumn<unknown>, String(bruto))}
                  >
                    {texto}
                  </Badge>
                )
              }
              return texto
            }),
        } as DataTableColumn<T>
      }),
    [visibles, filtros, handleFiltro, manualFiltering, enumMetadata, data],
  )

  return (
    <Stack gap="sm">
      <div className={styles.toolbar}>
        <TextInput
          placeholder={searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={busqueda}
          onChange={(e) => handleBusqueda(e.currentTarget.value)}
          rightSection={
            busqueda ? (
              <ActionIcon variant="subtle" size="sm" onClick={() => handleBusqueda('')}>
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
          w={{ base: '100%', sm: 320 }}
        />
        <div className={styles.toolbarActions}>
          {toolbarActions}
          {exportExcel && (
            <Button
              variant="default"
              leftSection={<IconFileSpreadsheet size={16} />}
              onClick={exportar}
              disabled={procesados.length === 0}
            >
              Excel
            </Button>
          )}
        </div>
      </div>

      <Box>
        <DataTable<T>
          withTableBorder
          striped
          highlightOnHover
          // El aspecto de libreta: trazo negro, renglones discontinuos y
          // cabecera hundida. Ver `AppTable.module.css`. `borderRadius` de la
          // librería se deja fuera a propósito — lo pone el módulo con el radio
          // orgánico del sistema, y los dos juntos se pisan.
          classNames={{
            root: styles.root,
            table: styles.table,
            header: styles.header,
            footer: styles.footer,
            pagination: styles.pagination,
          }}
          fetching={isLoading}
          records={pagina}
          columns={columnasTabla}
          idAccessor={idAccessor}
          noRecordsText={noRecordsText}
          totalRecords={total}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={(p) => {
            setPage(p)
            onPageChange?.(p)
          }}
          recordsPerPageOptions={PAGE_SIZE_OPTIONS}
          onRecordsPerPageChange={(size) => {
            setPageSize(size)
            setPage(1)
            onPageSizeChange?.(size)
          }}
          sortStatus={sort}
          onSortStatusChange={handleSort}
          onRowClick={onRowClick ? ({ record }) => onRowClick(record) : undefined}
          height={height === 'auto' ? undefined : height}
          minHeight={150}
          paginationText={({ from, to, totalRecords }) =>
            `${from} – ${to} de ${totalRecords}`
          }
        />
      </Box>
    </Stack>
  )
}
