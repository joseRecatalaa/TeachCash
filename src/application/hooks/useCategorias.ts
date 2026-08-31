'use client'

/**
 * Hooks de Categorías. Ver `useMovimientos.ts` para el patrón.
 */

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useInvalidate } from '@refinedev/core'
import { notifications } from '@mantine/notifications'
import {
  activarCategoria as activarCategoriaAction,
  ocultarCategoria as ocultarCategoriaAction,
} from '@/src/application/actions/entity.actions'
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
  /** `'true'`/`'false'`. Vacío = todas, visibles y ocultas mezcladas. */
  oculta?: string
}

export function useCategorias(
  filters?: CategoriasFilters,
  pagination?: EntityListPagination,
  options?: { enabled?: boolean },
) {
  return categoriaHooks.useList(filters, pagination, options)
}

/**
 * Activa una categoría oculta. Tras éxito invalida el listado de Categorías Y
 * el catálogo (`useCatalogos`): sin esto, una categoría recién activada no
 * aparecería todavía en el `<Select>` de un movimiento nuevo.
 *
 * La invalidación del listado usa `useInvalidate` de Refine y no una clave a
 * mano: la clave real de una query de Refine lleva un prefijo `['data',
 * dataProviderName, ...]` que no es obvio desde fuera, y una clave que no
 * coincide no invalida nada — ni avisa de que no lo ha hecho.
 */
export function useActivarCategoria() {
  const invalidate = useInvalidate()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const activar = useCallback(
    async (id: string, presupuesto?: number | null): Promise<boolean> => {
      setIsPending(true)
      try {
        const result = await activarCategoriaAction(id, presupuesto)
        if (!result.ok) {
          notifications.show({ title: 'No se ha podido', message: result.error, color: 'red' })
          return false
        }
        await invalidate({ resource: 'Categorias', invalidates: ['list', 'many'] })
        await queryClient.invalidateQueries({ queryKey: ['catalogos'] })
        notifications.show({ title: 'Hecho', message: 'Categoría activada', color: 'teal' })
        return true
      } finally {
        setIsPending(false)
      }
    },
    [invalidate, queryClient],
  )

  return { activar, isPending }
}

/** Oculta una categoría sin borrarla. Mismo patrón de invalidación que `useActivarCategoria`. */
export function useOcultarCategoria() {
  const invalidate = useInvalidate()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const ocultar = useCallback(
    async (id: string): Promise<boolean> => {
      setIsPending(true)
      try {
        const result = await ocultarCategoriaAction(id)
        if (!result.ok) {
          notifications.show({ title: 'No se ha podido', message: result.error, color: 'red' })
          return false
        }
        await invalidate({ resource: 'Categorias', invalidates: ['list', 'many'] })
        await queryClient.invalidateQueries({ queryKey: ['catalogos'] })
        notifications.show({ title: 'Hecho', message: 'Categoría ocultada', color: 'teal' })
        return true
      } finally {
        setIsPending(false)
      }
    },
    [invalidate, queryClient],
  )

  return { ocultar, isPending }
}
