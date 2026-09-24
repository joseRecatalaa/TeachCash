'use client'

/**
 * Hooks de Movimientos. Los cinco del CRUD salen de `createEntityHooks`.
 */

import type {
  MovimientoFormDto,
  MovimientoListDto,
  MovimientoSaveDto,
} from '@/src/types/movimiento.types'
import { createEntityHooks, type EntityListPagination } from './createEntityHooks'

const movimientoHooks = createEntityHooks<
  MovimientoListDto,
  MovimientoFormDto,
  MovimientoSaveDto
>('Movimientos')

/**
 * `skipListCache: true` NO es opcional aquí.
 *
 * El `ListDto` guarda el importe CON SIGNO y el `FormDto` lo parte en magnitud +
 * sentido. Si el hook cogiera el registro del cache de lista como sustituto del
 * de formulario, el campo de importe aparecería en negativo y al guardar la
 * validación lo rechazaría. Ver la nota de `createEntityHooks`.
 */
export const useMovimiento = (id: string) => movimientoHooks.useOne(id, { skipListCache: true })

export const useCreateMovimiento = movimientoHooks.useCreate
export const useUpdateMovimiento = movimientoHooks.useUpdate
export const useDeleteMovimiento = movimientoHooks.useDelete

export type MovimientosFilters = {
  /** Fecha civil 'YYYY-MM-DD', ambas inclusive. */
  desde?: string
  hasta?: string
  categoriaId?: string
}

export function useMovimientos(
  filters?: MovimientosFilters,
  pagination?: EntityListPagination,
  options?: { enabled?: boolean },
) {
  return movimientoHooks.useList(filters, pagination, options)
}
