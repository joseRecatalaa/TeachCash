'use client'

/**
 * Estado de paginación, orden, filtros y búsqueda de una página de listado.
 *
 * La página llama a `usePaginacion(useCuentas)` y esparce `tableProps` en
 * `<EntityListPage>`. Sin esto, cada listado se escribiría su propio `useState`
 * de página y sus propios callbacks, y acabarían comportándose distinto.
 *
 * @example
 * const { data, query, tableProps } = usePaginacion(useMovimientos, { baseFilter })
 * <EntityListPage data={data} isLoading={query.isLoading} {...tableProps} />
 */

import { useCallback, useMemo, useState } from 'react'
import type { BaseRecord, useList } from '@refinedev/core'
import type { DataTableSortStatus } from 'mantine-datatable'
import type { EntityListPagination } from './createEntityHooks'
import type {
  AppTableManualProps,
  FilterState,
} from '@/src/presentation/components/AppTable/AppTable'

/**
 * Firma común de los hooks de lista que genera `createEntityHooks`
 * (`useCuentas`, `useMovimientos`...): `(filters?, pagination?, options?)`.
 */
type EntityListHook<TFilters, TRow extends BaseRecord> = (
  filters?: TFilters,
  pagination?: EntityListPagination,
  options?: { enabled?: boolean },
) => ReturnType<typeof useList<TRow>>

export interface UsePaginacionConfig<TFilters> {
  /** Filtro base del contexto de la página (la cuenta que se está mirando...). */
  baseFilter?: TFilters
  initialPageSize?: number
  initialSort?: { sortBy?: string; sortDir?: 'asc' | 'desc' }
  enabled?: boolean
  /**
   * `true` (por defecto) = modo servidor: el repositorio pagina, ordena y filtra.
   * `false` = modo cliente: se trae el conjunto completo y `AppTable` lo procesa
   * en memoria.
   *
   * Cuentas y Categorías van en modo cliente: son decenas de filas y filtrarlas
   * en memoria da filtros más ricos sin coste. Movimientos va en modo servidor:
   * es la tabla que crece sin techo.
   */
  server?: boolean
}

export function usePaginacion<TFilters, TRow extends BaseRecord>(
  useEntityList: EntityListHook<TFilters, TRow>,
  config: UsePaginacionConfig<TFilters> = {},
) {
  const {
    baseFilter,
    initialPageSize = 20,
    initialSort = {},
    enabled,
    server = true,
  } = config

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [sort, setSort] = useState(initialSort)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Cada cambio de tamaño, orden, filtro o búsqueda vuelve a la página 1: si no,
  // el servidor recibe una página que ya no existe y la tabla sale vacía.
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setPage(1)
  }, [])

  const handleSortChange = useCallback((s: DataTableSortStatus<TRow>) => {
    setSort({ sortBy: s.columnAccessor as string, sortDir: s.direction })
    setPage(1)
  }, [])

  /**
   * `FilterState` (indexado por accessor) → mapa plano de igualdades.
   *
   * En modo servidor el repositorio solo sabe filtrar por igualdad y por
   * "contiene" en la búsqueda global; por eso `AppTable` reduce el desplegable
   * de operadores cuando `manualFiltering` está activo. Los operadores ricos
   * (entre, mayor que, empieza por) siguen estando en modo cliente, donde se
   * aplican sobre el conjunto completo ya cargado.
   */
  const handleFiltersChange = useCallback((filters: FilterState) => {
    const plano: Record<string, string> = {}
    for (const [field, f] of Object.entries(filters)) {
      if (f.value === null || f.value === '') continue
      plano[field] = String(f.value)
    }
    setColumnFilters(plano)
    setPage(1)
  }, [])

  const handleSearchChange = useCallback((search: string) => {
    setSearchQuery(search)
    setPage(1)
  }, [])

  // En modo cliente no se manda `meta`: el hook trae el conjunto completo.
  const pagination = useMemo<EntityListPagination | undefined>(
    () => (server ? { page, pageSize, ...sort, searchQuery } : { paginate: false }),
    [server, page, pageSize, sort, searchQuery],
  )

  const filtrosEfectivos = useMemo(
    () => ({ ...(baseFilter ?? {}), ...(server ? columnFilters : {}) }) as TFilters,
    [baseFilter, columnFilters, server],
  )

  const { query, result } = useEntityList(filtrosEfectivos, pagination, { enabled })

  const data = useMemo(() => (result.data ?? []) as TRow[], [result.data])

  // Props que se esparcen tal cual en `EntityListPage`. En modo cliente se
  // devuelve vacío para que `AppTable` procese en memoria.
  const tableProps = useMemo<AppTableManualProps<TRow>>(
    () =>
      server
        ? {
            manualPagination: true,
            manualSorting: true,
            manualFiltering: true,
            serverTotalRecords: result.total ?? 0,
            currentPage: page,
            onPageChange: setPage,
            onPageSizeChange: handlePageSizeChange,
            onSortChange: handleSortChange,
            onFiltersChange: handleFiltersChange,
            onSearchChange: handleSearchChange,
          }
        : {},
    [
      server,
      result.total,
      page,
      handlePageSizeChange,
      handleSortChange,
      handleFiltersChange,
      handleSearchChange,
    ],
  )

  return {
    query,
    result,
    data,
    isLoading: query.isFetching,
    tableProps,
    // Estado crudo, por si la página tiene consumidores secundarios del mismo
    // conjunto (una fila de agregados, un gráfico sobre lo filtrado).
    page,
    pageSize,
    sort,
    columnFilters,
    searchQuery,
    setPage,
    pagination,
  }
}
