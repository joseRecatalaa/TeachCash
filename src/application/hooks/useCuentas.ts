'use client'

/**
 * Hooks de Cuentas.
 *
 * El patrón de todo `use{Entidades}.ts`: la factory genera las cinco operaciones
 * CRUD y aquí solo se reexportan con nombres de dominio, más lo que la entidad
 * tenga de propio (aquí, archivar).
 */

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { archivarCuenta as archivarCuentaAction } from '@/src/application/actions/entity.actions'
import type { CuentaFormDto, CuentaListDto, CuentaSaveDto } from '@/src/types/cuenta.types'
import { createEntityHooks, type EntityListPagination } from './createEntityHooks'

const cuentaHooks = createEntityHooks<CuentaListDto, CuentaFormDto, CuentaSaveDto>('Cuentas')

export const useCuenta = cuentaHooks.useOne
export const useCreateCuenta = cuentaHooks.useCreate
export const useUpdateCuenta = cuentaHooks.useUpdate
export const useDeleteCuenta = cuentaHooks.useDelete

export type CuentasFilters = {
  tipo?: string
  divisa?: string
  /** `'1'` incluye las archivadas. Por defecto no se listan. */
  archivadas?: string
}

export function useCuentas(
  filters?: CuentasFilters,
  pagination?: EntityListPagination,
  options?: { enabled?: boolean },
) {
  return cuentaHooks.useList(filters, pagination, options)
}

/**
 * Archivar / restaurar. No sale de la factory porque no es una de las cinco
 * operaciones CRUD; va contra su propia Server Action.
 *
 * Invalida el catálogo además de la lista: una cuenta archivada desaparece de
 * los desplegables del formulario de movimiento.
 */
export function useArchivarCuenta() {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const archivar = useCallback(
    async (id: string, archivar: boolean): Promise<boolean> => {
      setIsPending(true)
      try {
        const result = await archivarCuentaAction(id, archivar)
        if (!result.ok) {
          notifications.show({ title: 'No se ha podido', message: result.error, color: 'red' })
          return false
        }
        await queryClient.invalidateQueries({ queryKey: ['default', 'Cuentas'] })
        await queryClient.invalidateQueries({ queryKey: ['catalogos'] })
        notifications.show({
          title: 'Hecho',
          message: archivar ? 'Cuenta archivada' : 'Cuenta restaurada',
          color: 'teal',
        })
        return true
      } finally {
        setIsPending(false)
      }
    },
    [queryClient],
  )

  return { archivar, isPending }
}
