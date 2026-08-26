'use client'

/**
 * Hooks de informes. Escritos a mano, no salen de `createEntityHooks`: los
 * informes no son un CRUD, son agregaciones con su propia forma de entrada y de
 * salida.
 *
 * Todos toman la divisa como parámetro y la meten en la `queryKey`. Sin eso, el
 * gráfico en euros y el gráfico en dólares compartirían entrada de cache y uno
 * pintaría los datos del otro (regla dura 2: nada mezcla divisas, ni siquiera
 * el cache).
 */

import { useQuery } from '@tanstack/react-query'
import type { Currency } from '@/lib/money'
import type { CivilDate, Period } from '@/lib/dates'
import {
  fetchGastoPorCategoria,
  fetchIngresosVsGastos,
  fetchSerieSaldo,
  fetchTotalesDelMes,
} from '@/src/application/actions/informes.actions'
import { getPatrimonioTotal } from '@/src/application/actions/entity.actions'

/** Desenvuelve el `ActionResult` o lanza, que es lo que espera React Query. */
const unwrap = <T>(result: { ok: true; data: T } | { ok: false; error: string }): T => {
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export function useGastoPorCategoria(periodo: Period, divisa: Currency = 'EUR') {
  return useQuery({
    queryKey: ['informes', 'gastoPorCategoria', periodo, divisa],
    queryFn: async () => unwrap(await fetchGastoPorCategoria(periodo, divisa)),
  })
}

export function useIngresosVsGastos(meses = 12, divisa: Currency = 'EUR') {
  return useQuery({
    queryKey: ['informes', 'ingresosVsGastos', meses, divisa],
    queryFn: async () => unwrap(await fetchIngresosVsGastos(meses, divisa)),
  })
}

export function useTotalesDelMes(periodo: Period, divisa: Currency = 'EUR') {
  return useQuery({
    queryKey: ['informes', 'totalesDelMes', periodo, divisa],
    queryFn: async () => unwrap(await fetchTotalesDelMes(periodo, divisa)),
  })
}

export function useSerieSaldo(
  options: { desde?: CivilDate; hasta?: CivilDate; cuentaId?: string; divisa?: Currency } = {},
) {
  return useQuery({
    queryKey: [
      'informes',
      'serieSaldo',
      options.desde ?? null,
      options.hasta ?? null,
      options.cuentaId ?? null,
      options.divisa ?? 'EUR',
    ],
    queryFn: async () => unwrap(await fetchSerieSaldo(options)),
  })
}

/**
 * Patrimonio, una cifra POR DIVISA. Nunca un total único: sumar euros y dólares
 * da un número que no significa nada.
 */
export function usePatrimonio() {
  return useQuery({
    queryKey: ['informes', 'patrimonio'],
    queryFn: async () => unwrap(await getPatrimonioTotal()),
  })
}
