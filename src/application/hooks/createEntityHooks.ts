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

export function createEntityHooks<TList extends BaseRecord, TForm extends BaseRecord, TSave>(
  resource: string,
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
            pageSize: pagination.pageSize ?? 20,
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
   * Detalle por id.
   *
   * `skipListCache` fuerza la petición completa. El atajo del `initialData`
   * asume que un registro del cache de lista (`TList`) sirve como sustituto del
   * registro de formulario (`TForm`), y eso solo es cierto si `TList` ya trae
   * todos los campos que el llamador va a leer. Cuando no lo es — el caso vivo
   * aquí es Movimientos, cuyo `ListDto` guarda el importe CON SIGNO y el
   * `FormDto` lo parte en magnitud + sentido — el atajo devolvería datos
   * incompletos "frescos" durante todo el staleTime sin disparar el fetch real.
   */
  function useEntityOne(id: string, options?: { skipListCache?: boolean }) {
    const queryClient = useQueryClient()

    return useOne<TForm>({
      resource,
      id,
      queryOptions: {
        enabled: Boolean(id),
        ...(options?.skipListCache
          ? {}
          : {
              initialData: () => {
                const listQueries = queryClient.getQueriesData<{ data: TList[] }>({
                  queryKey: ['default', resource, 'list'],
                })

                for (const [, listData] of listQueries) {
                  const record = listData?.data?.find((item) => item.id === id)
                  if (record) return { data: record as unknown as TForm }
                }
                return undefined
              },
            }),
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
