'use client'

/**
 * Factory genérica de hooks CRUD.
 *
 * Cada entidad tiene un `use{Entidades}.ts` de tres líneas que llama aquí y
 * reexporta con nombres de dominio. Nadie escribe un `useList` a mano: si los
 * hooks de cada entidad divergen, divergen también las páginas que los usan.
 *
 * El `resource` tiene que coincidir EXACTAMENTE con una clave de `REPOSITORIES`
 * (`src/infrastructure/repositories/index.ts`). Si no coincide, el data provider
 * lanza "Recurso desconocido" en la primera consulta.
 *
 * Los ids son `string` (UUID), así que "todavía no hay id" es la cadena vacía y
 * es lo que decide si la query llega a lanzarse.
 */

import {
  useCreate,
  useDelete,
  useList,
  useOne,
  useUpdate,
  type BaseRecord,
  type HttpError,
} from '@refinedev/core'
import { useQueryClient } from '@tanstack/react-query'
import { TAMANO_PAGINA_POR_DEFECTO } from '@/src/types/limites.types'

export interface EntityListPagination {
  /**
   * Si es `false`, no se pagina: se devuelve todo el conjunto filtrado. Es lo
   * que usa `usePaginacion` en modo cliente, donde la tabla ya tiene los datos
   * y pagina en memoria.
   */
  paginate?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  searchQuery?: string
}

export interface EntityListOptions {
  enabled?: boolean
}

export interface EntityHooksOptions<TList, TForm> {
  /**
   * Cómo convertir una fila del LISTADO en el registro del FORMULARIO, si se
   * puede. Con ella, abrir el detalle de algo que ya está en una lista cargada
   * pinta al instante, sin esperar a la petición.
   *
   * Es opcional y explícita a propósito: solo sirve si la fila trae TODO lo que
   * el formulario lee, y eso lo comprueba el compilador campo a campo en esta
   * función. Sin ella, el detalle siempre se pide entero, que es lo seguro.
   * (Movimientos no la tiene: su fila guarda el importe con signo y el
   * formulario lo parte en magnitud + sentido.)
   */
  desdeLista?: (fila: TList) => TForm
}

export function createEntityHooks<TList extends BaseRecord, TForm extends BaseRecord, TSave>(
  resource: string,
  { desdeLista }: EntityHooksOptions<TList, TForm> = {},
) {
  function useEntityList(
    filters?: Record<string, string | number | undefined>,
    pagination?: EntityListPagination,
    options?: EntityListOptions,
  ) {
    const refineFilters = Object.entries(filters ?? {})
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([field, value]) => ({
        field,
        operator: typeof value === 'number' ? ('eq' as const) : ('contains' as const),
        value,
      }))

    return useList<TList>({
      resource,
      filters: refineFilters,
      // El data provider lee de aquí lo que la tabla necesita y que no cabe en
      // los `filters` de Refine (paginación manual, búsqueda global).
      meta: pagination
        ? {
            paginate: pagination.paginate ?? true,
            page: pagination.page ?? 1,
            pageSize: pagination.pageSize ?? TAMANO_PAGINA_POR_DEFECTO,
            sortBy: pagination.sortBy,
            sortDir: pagination.sortDir,
            searchQuery: pagination.searchQuery ?? '',
          }
        : undefined,
      queryOptions: {
        enabled: options?.enabled !== false,
        // Mantiene los datos previos durante el refetch (cambio de página o de
        // filtros) para que el total nunca caiga a undefined y la tabla no
        // dispare un `onPageChange` involuntario al ver 0 registros.
        placeholderData: (prev) => prev,
      },
    })
  }

  /**
   * Detalle por id. Si la entidad declaró `desdeLista` y el registro ya está en
   * una lista cargada, se pinta con él mientras llega el detalle.
   */
  function useEntityOne(id: string) {
    const queryClient = useQueryClient()

    const desdeCache = () => {
      if (!desdeLista) return undefined
      const listas = queryClient.getQueriesData<{ data: TList[] }>({
        queryKey: ['default', resource, 'list'],
      })
      for (const [, lista] of listas) {
        const fila = lista?.data?.find((item) => item.id === id)
        if (fila) return { data: desdeLista(fila) }
      }
      return undefined
    }

    return useOne<TForm>({
      resource,
      id,
      queryOptions: {
        enabled: Boolean(id),
        ...(desdeLista ? { initialData: desdeCache } : {}),
      },
    })
  }

  const useEntityCreate = () => useCreate<TForm, HttpError, TSave>()
  const useEntityUpdate = () => useUpdate<TForm, HttpError, TSave>()
  const useEntityDelete = () => useDelete<TForm, HttpError>()

  return {
    useList: useEntityList,
    useOne: useEntityOne,
    useCreate: useEntityCreate,
    useUpdate: useEntityUpdate,
    useDelete: useEntityDelete,
  }
}
