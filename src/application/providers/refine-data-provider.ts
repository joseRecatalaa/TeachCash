/**
 * DataProvider de Refine sobre Server Actions.
 *
 * Traduce las cinco operaciones de Refine (`getList`, `getOne`, `create`,
 * `update`, `deleteOne`) a las Server Actions de
 * `src/application/actions/entity.actions.ts`.
 *
 * Es lo que permite usar Refine sin una API HTTP detrás: los hooks (`useList`,
 * `useOne`, `useCreate`…) y todo lo que hay por encima llaman como si la
 * hubiera, y aquí la llamada se resuelve en proceso.
 *
 * **La traducción es MECÁNICA y no tiene lógica de negocio.** Todo lo que decide
 * algo —validar, autorizar, aplicar una regla— vive en el repositorio, del lado
 * del servidor, porque este fichero corre en el navegador y ahí no se puede
 * sostener ninguna garantía. Si te ves escribiendo un `if` de dominio aquí, va
 * en el repositorio.
 */

import type { CrudFilter, DataProvider, MetaQuery } from '@refinedev/core'
import {
  createEntity,
  deleteEntity,
  getEntity,
  listEntity,
  updateEntity,
  type ActionResult,
} from '@/src/application/actions/entity.actions'
import type { ListParams } from '@/src/infrastructure/repositories/types'

/**
 * Error de la capa de datos, con los errores por campo que trae la acción.
 *
 * Se LANZA (aquí, ya en el navegador) porque es lo que React Query y Refine
 * esperan para poner una query en estado de error. Del lado del servidor viajó
 * como valor de retorno, no como excepción: ver la nota de `entity.actions.ts`.
 */
export class DataProviderError extends Error {
  readonly fieldErrors?: Record<string, string>

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'DataProviderError'
    this.fieldErrors = fieldErrors
  }
}

/** Desenvuelve un `ActionResult` o lo convierte en excepción. */
function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data
  throw new DataProviderError(result.error, result.fieldErrors)
}

/**
 * Traduce los `CrudFilter` de Refine al mapa plano que espera el repositorio.
 *
 * Refine soporta filtros anidados (`and`/`or`); aquí solo se aceptan los
 * lógicos simples, que es lo único que emiten `createEntityHooks` y `AppTable`.
 * Un filtro anidado se ignora en silencio a propósito: convertirlo a medias
 * daría un conjunto de resultados incorrecto sin que nada avisara.
 */
function toFilters(filters?: CrudFilter[]): Record<string, string | number | undefined> {
  const salida: Record<string, string | number | undefined> = {}
  for (const f of filters ?? []) {
    if (!('field' in f)) continue
    const valor = f.value
    if (valor === undefined || valor === null || valor === '') continue
    // La clave se normaliza a camelCase-de-DTO: el repositorio indexa por el
    // nombre del campo del DTO, no por el de la columna de base.
    salida[f.field.charAt(0).toLowerCase() + f.field.slice(1)] =
      typeof valor === 'number' ? valor : String(valor)
  }
  return salida
}

/** Lo que `createEntityHooks` mete en `meta`, ya normalizado. */
type ListMeta = MetaQuery & {
  paginate?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  searchQuery?: string
}

export function dataProvider(): DataProvider {
  return {
    async getList({ resource, filters, sorters, pagination, meta }) {
      const m = (meta ?? {}) as ListMeta

      // La ordenación puede venir por `sorters` (Refine) o por `meta.sortBy`
      // (lo que manda `usePaginacion`). Gana `sorters` si está: es la que
      // refleja el clic más reciente en la cabecera de la tabla.
      const sorter = sorters?.[0]

      const params: ListParams = {
        filters: toFilters(filters),
        search: m.searchQuery,
        paginate: m.paginate ?? pagination?.mode !== 'off',
        page: m.page ?? pagination?.currentPage,
        pageSize: m.pageSize ?? pagination?.pageSize,
        sortBy: sorter?.field ?? m.sortBy,
        sortDir: sorter?.order ?? m.sortDir,
      }

      const { data, total } = unwrap(await listEntity(resource, params))
      // El cast es el mismo que hace cualquier data provider de Refine: el tipo
      // real lo garantiza el DTO del repositorio, no el genérico de la llamada.
      return { data, total } as never
    },

    async getOne({ resource, id }) {
      const data = unwrap(await getEntity(resource, String(id)))
      return { data } as never
    },

    async create({ resource, variables }) {
      const data = unwrap(await createEntity(resource, variables))
      return { data } as never
    },

    async update({ resource, id, variables }) {
      const data = unwrap(await updateEntity(resource, String(id), variables))
      return { data } as never
    },

    async deleteOne({ resource, id }) {
      const data = unwrap(await deleteEntity(resource, String(id)))
      return { data } as never
    },

    /**
     * No hay API HTTP que apuntar: los datos se resuelven en proceso. Se
     * devuelve cadena vacía en lugar de lanzar porque Refine llama a esto para
     * componer mensajes de error, y no queremos que reviente ahí.
     */
    getApiUrl: () => '',
  }
}
