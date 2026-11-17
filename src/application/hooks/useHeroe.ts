'use client'

/**
 * Hooks del Camino del héroe.
 *
 * Escritos a mano, como los del perfil: no es un CRUD de Refine. Todos cuelgan
 * de la raíz `['heroe']`, y enviar una partida la invalida entera: el mapa, el
 * camino y la ficha del nivel enseñan progreso DERIVADO (regla dura 7) y los
 * tres cambian con cada partida superada. `queryClient.clear()` al cambiar de
 * usuario (CuentaProvider) ya cubre esta raíz.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  enviarNivel,
  fetchMapa,
  fetchMundo,
  fetchNivel,
} from '@/src/application/actions/heroe.actions'
import { revelar } from '@/lib/ocultar'
import type { Nivel, NivelDto } from '@/src/types/heroe.types'

/** Desenvuelve el `ActionResult` o lanza, que es lo que espera React Query. */
const unwrap = <T>(result: { ok: true; data: T } | { ok: false; error: string }): T => {
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export const CLAVE_HEROE = ['heroe'] as const

export function useMapaHeroe() {
  return useQuery({
    queryKey: [...CLAVE_HEROE, 'mapa'],
    queryFn: async () => unwrap(await fetchMapa()),
  })
}

export function useMundoHeroe(mundoId: string | null) {
  return useQuery({
    queryKey: [...CLAVE_HEROE, 'mundo', mundoId],
    queryFn: async () => unwrap(await fetchMundo(mundoId as string)),
    enabled: !!mundoId,
  })
}

export function useNivelHeroe(levelId: string | null) {
  return useQuery({
    queryKey: [...CLAVE_HEROE, 'nivel', levelId],
    queryFn: async (): Promise<NivelDto> => {
      // Llega oculto (`lib/ocultar.ts`) y se abre aquí, en memoria: las
      // pantallas no saben nada de ello.
      const { nivel, clave, ...resto } = unwrap(await fetchNivel(levelId as string))
      return { ...resto, nivel: revelar<Nivel>(nivel, clave) }
    },
    enabled: !!levelId,
    // Una partida a medias no se recarga sola al volver a la pestaña: el
    // contenido no cambia mientras se juega, y refrescarlo baraja otra vez los
    // ejercicios delante de quien está respondiendo.
    refetchOnWindowFocus: false,
  })
}

/** Envía una partida. Lanza con el mensaje del servidor si las respuestas no valen. */
export function useEnviarNivel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ levelId, respuestas }: { levelId: string; respuestas: unknown[] }) =>
      unwrap(await enviarNivel(levelId, respuestas)),
    // Las partidas también mueven el Cuadro de mando (estrellas y estadísticas),
    // que cuelga de `['informes']`, y la tienda, que cuelga de esta misma raíz.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: CLAVE_HEROE }),
        queryClient.invalidateQueries({ queryKey: ['informes', 'cuadro'] }),
      ]),
  })
}
