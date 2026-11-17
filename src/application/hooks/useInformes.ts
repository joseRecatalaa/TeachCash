'use client'

/**
 * Hooks de informes: el saldo y las agregaciones que pinta la portada.
 *
 * Escritos a mano, no salen de `createEntityHooks`: los informes no son un CRUD,
 * son agregaciones con su propia forma de entrada y de salida.
 *
 * Todos cuelgan de la raíz `['informes']`, y eso no es cosmético: es lo que
 * permite tirarlos de una vez con `useInvalidarDerivados` cuando cambia un
 * movimiento. El saldo es una suma, no un dato guardado (regla dura 7), así que
 * cualquier escritura lo deja obsoleto.
 */

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { CivilDate, Period } from '@/lib/dates'
import {
  fetchGastoPorCategoria,
  fetchIngresosVsGastos,
  fetchSerieSaldo,
  fetchTotalesDelMes,
} from '@/src/application/actions/informes.actions'
import { getSaldo } from '@/src/application/actions/entity.actions'
import { INFORME_MESES_POR_DEFECTO } from '@/src/types/informe.types'

/** Desenvuelve el `ActionResult` o lanza, que es lo que espera React Query. */
const unwrap = <T>(result: { ok: true; data: T } | { ok: false; error: string }): T => {
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export function useGastoPorCategoria(periodo: Period) {
  return useQuery({
    queryKey: ['informes', 'gastoPorCategoria', periodo],
    queryFn: async () => unwrap(await fetchGastoPorCategoria(periodo)),
  })
}

export function useIngresosVsGastos(meses = INFORME_MESES_POR_DEFECTO) {
  return useQuery({
    queryKey: ['informes', 'ingresosVsGastos', meses],
    queryFn: async () => unwrap(await fetchIngresosVsGastos(meses)),
  })
}

export function useTotalesDelMes(periodo: Period) {
  return useQuery({
    queryKey: ['informes', 'totalesDelMes', periodo],
    queryFn: async () => unwrap(await fetchTotalesDelMes(periodo)),
  })
}

export function useSerieSaldo(options: { desde?: CivilDate; hasta?: CivilDate } = {}) {
  return useQuery({
    queryKey: ['informes', 'serieSaldo', options.desde ?? null, options.hasta ?? null],
    queryFn: async () => unwrap(await fetchSerieSaldo(options)),
  })
}

/**
 * El saldo de la cuenta: la suma de todos los movimientos vivos.
 *
 * No hay un saldo guardado en ninguna parte y no lo va a haber (regla dura 7):
 * un saldo almacenado es un saldo que puede divergir de sus movimientos, y
 * entonces la cifra que se enseña es falsa.
 */
export function useSaldo() {
  return useQuery({
    queryKey: ['informes', 'saldo'],
    queryFn: async () => unwrap(await getSaldo()),
  })
}

/**
 * Tira todo lo derivado.
 *
 * Lo llama cualquier mutación —crear, editar, borrar o restaurar un
 * movimiento—, porque todas cambian sumas que están cacheadas en otro árbol de
 * queries del que Refine no sabe nada. Sin esto se anota un gasto y la portada
 * sigue enseñando la cifra de antes, que es el peor fallo posible en una
 * aplicación de dinero: no parece un error, parece un dato.
 */
export function useInvalidarDerivados() {
  const queryClient = useQueryClient()
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['informes'] }),
    [queryClient],
  )
}
