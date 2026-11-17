'use client'

/**
 * Hooks del Cuadro de mando y de la tienda, escritos a mano como los del héroe:
 * no son un CRUD de Refine.
 *
 * El cuadro depende de TRES cosas: los movimientos, las partidas y las compras.
 * Cuelga de `['informes']` para que lo tire `useInvalidarDerivados()` al anotar un
 * movimiento; `useEnviarNivel` y las mutaciones de aquí lo invalidan a mano. Si
 * una se olvida no falla nada visible: se compra algo y el héroe sigue igual.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCuadro } from '@/src/application/actions/cuadro.actions'
import {
  comprarObjeto,
  equiparObjeto,
  fetchTienda,
  quitarObjeto,
} from '@/src/application/actions/tienda.actions'
import type { TiendaDto } from '@/src/types/tienda.types'
import type { ActionResult } from '@/src/application/actions/resultado'

const unwrap = <T>(result: ActionResult<T>): T => {
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export const CLAVE_CUADRO = ['informes', 'cuadro'] as const
export const CLAVE_TIENDA = ['heroe', 'tienda'] as const

export function useCuadro() {
  return useQuery({
    queryKey: CLAVE_CUADRO,
    queryFn: async () => unwrap(await fetchCuadro()),
  })
}

export function useTienda() {
  return useQuery({
    queryKey: CLAVE_TIENDA,
    queryFn: async () => unwrap(await fetchTienda()),
  })
}

function useMutacionTienda(accion: (itemId: string) => Promise<ActionResult<TiendaDto>>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: string) => unwrap(await accion(itemId)),
    onSuccess: (tienda) => {
      queryClient.setQueryData(CLAVE_TIENDA, tienda)
      return queryClient.invalidateQueries({ queryKey: CLAVE_CUADRO })
    },
  })
}

export const useComprarObjeto = () => useMutacionTienda(comprarObjeto)
export const useEquiparObjeto = () => useMutacionTienda(equiparObjeto)
export const useQuitarObjeto = () => useMutacionTienda(quitarObjeto)
