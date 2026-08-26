'use client'

/**
 * Hooks de Movimientos. Ver `useCuentas.ts` para el patrón.
 */

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import {
  crearTransferencia,
  restaurarMovimiento as restaurarMovimientoAction,
} from '@/src/application/actions/entity.actions'
import type {
  MovimientoFormDto,
  MovimientoListDto,
  MovimientoSaveDto,
  TransferenciaSaveDto,
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
  cuentaId?: string
  categoriaId?: string
  /** `'1'` enseña SOLO la papelera, no la mezcla con los vivos. */
  borrados?: string
}

export function useMovimientos(
  filters?: MovimientosFilters,
  pagination?: EntityListPagination,
  options?: { enabled?: boolean },
) {
  return movimientoHooks.useList(filters, pagination, options)
}

/**
 * Crear una transferencia.
 *
 * Fuera de la factory porque no es un `create` de Movimiento: escribe DOS filas
 * en una sola transacción. Invalida también Cuentas — una transferencia cambia
 * el saldo de las dos.
 */
export function useCrearTransferencia() {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const crear = useCallback(
    async (values: TransferenciaSaveDto): Promise<boolean> => {
      setIsPending(true)
      try {
        const result = await crearTransferencia(values)
        if (!result.ok) {
          notifications.show({
            title: 'No se ha podido guardar',
            message: result.error,
            color: 'red',
          })
          return false
        }
        await queryClient.invalidateQueries({ queryKey: ['default', 'Movimientos'] })
        await queryClient.invalidateQueries({ queryKey: ['default', 'Cuentas'] })
        notifications.show({
          title: 'Hecho',
          message: 'Transferencia registrada',
          color: 'teal',
        })
        return true
      } finally {
        setIsPending(false)
      }
    },
    [queryClient],
  )

  return { crear, isPending }
}

/**
 * Deshace un borrado lógico.
 *
 * Existe porque el borrado de un movimiento es lógico y no físico: sin esto, la
 * fila seguiría en la tabla para siempre sin forma de recuperarla, que es lo
 * peor de los dos mundos.
 */
export function useRestaurarMovimiento() {
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = useState(false)

  const restaurar = useCallback(
    async (id: string): Promise<boolean> => {
      setIsPending(true)
      try {
        const result = await restaurarMovimientoAction(id)
        if (!result.ok) {
          notifications.show({ title: 'No se ha podido', message: result.error, color: 'red' })
          return false
        }
        await queryClient.invalidateQueries({ queryKey: ['default', 'Movimientos'] })
        await queryClient.invalidateQueries({ queryKey: ['default', 'Cuentas'] })
        notifications.show({ title: 'Hecho', message: 'Movimiento restaurado', color: 'teal' })
        return true
      } finally {
        setIsPending(false)
      }
    },
    [queryClient],
  )

  return { restaurar, isPending }
}
