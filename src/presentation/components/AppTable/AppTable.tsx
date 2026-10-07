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
 *     pagina en memoria. Es lo que usa Categorías.
 *   - **servidor** (`manual*` + callbacks): la tabla solo avisa de lo que la
 *     persona ha pedido y el repositorio hace el trabajo. Es lo que usa
 *     Movimientos, que es la tabla que crece sin techo.
 *
 * Está en tres piezas: este fichero (estado, procesado y Excel), `FiltroColumna`
 * y `CeldaPorDefecto`. Los tipos y las utilidades puras viven en `columnas.ts`,
 * y se reexportan desde aquí para quien ya importaba de `AppTable`.
 */

import { useCallback, useMemo, useState } from 'react'
import { ActionIcon, Box, Button, Group, Stack, TextInput } from '@mantine/core'
import { DataTable, type DataTableColumn, type DataTableSortStatus } from 'mantine-datatable'
import { IconFileSpreadsheet, IconSearch, IconX } from '@tabler/icons-react'
import { scaleOf } from '@/lib/format'
import type { EnumValueDto } from '@/src/types/formMetadata.types'
import { TAMANO_PAGINA_MAXIMO, TAMANO_PAGINA_POR_DEFECTO } from '@/src/types/limites.types'
import { CeldaPorDefecto } from './CeldaPorDefecto'
import {
  accessorDe,
  comparar,
  cumpleFiltro,
  divisaDe,
  textoDe,
  valorDe,
  type AppTableColumn,
  type ColumnFilter,
  type FilterState,
} from './columnas'
import { FiltroColumna } from './FiltroColumna'
import styles from './AppTable.module.css'

export type {
  AppTableColumn,
  ColumnFilter,
  ColumnType,
  FilterOperator,
  FilterState,
} from './columnas'

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

// El mismo que el del servidor: si difirieran, la primera página del modo
// servidor y la del modo cliente tendrían tamaños distintos.
const DEFAULT_PAGE_SIZE = TAMANO_PAGINA_POR_DEFECTO

/**
 * Filas por página que se ofrecen. Ninguna por encima de TAMANO_PAGINA_MAXIMO:
 * la frontera rechaza más (`frontera.ts`), y en modo servidor esa opción sería
 * un botón que siempre da error.
 */
const PAGE_SIZE_OPTIONS = [20, 50, 100].filter((n) => n <= TAMANO_PAGINA_MAXIMO)

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
            ((row: T) => (
              <CeldaPorDefecto row={row} col={col} accessor={accessor} enumMetadata={enumMetadata} />
            )),
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

