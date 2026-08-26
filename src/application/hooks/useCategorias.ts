'use client'

/**
 * Hooks de Categorías. Ver `useCuentas.ts` para el patrón.
 */

import type {
  CategoriaFormDto,
  CategoriaListDto,
  CategoriaSaveDto,
} from '@/src/types/categoria.types'
import { createEntityHooks, type EntityListPagination } from './createEntityHooks'

const categoriaHooks = createEntityHooks<CategoriaListDto, CategoriaFormDto, CategoriaSaveDto>(
  'Categorias',
)

export const useCategoria = categoriaHooks.useOne
export const useCreateCategoria = categoriaHooks.useCreate
export const useUpdateCategoria = categoriaHooks.useUpdate
export const useDeleteCategoria = categoriaHooks.useDelete

export type CategoriasFilters = {
  /** income | expense */
  tipo?: string
  /** `'root'` = solo las de primer nivel. Vacío = todas. */
  padreId?: string
}

export function useCategorias(
  filters?: CategoriasFilters,
  pagination?: EntityListPagination,
  options?: { enabled?: boolean },
) {
  return categoriaHooks.useList(filters, pagination, options)
}
