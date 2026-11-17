'use client'

/*
 * Reparte el equipo del héroe a todo el Camino (`HeroeCamino`). Lo monta el
 * layout del módulo, que persiste al ir del mapa a un mundo y a un nivel: la
 * tienda se pide una vez y no en cada página.
 *
 * El equipo sale de la tienda (`useTienda`, raíz `['heroe']`): no hay otra
 * consulta. Mientras carga, o si falla, el héroe sale sin equipo. Como
 * `useEnviarNivel` invalida `['heroe']` entera, la tienda se vuelve a pedir al
 * jugar, igual que el mapa, y el héroe no se queda con un equipo viejo.
 */

import type { ReactNode } from 'react'
import { useTienda } from '@/src/application/hooks/useCuadro'
import { EquipoContext, SIN_EQUIPO } from './HeroeCamino'

export function EquipoDelCamino({ children }: { children: ReactNode }) {
  const tienda = useTienda()
  return <EquipoContext value={tienda.data?.equipo ?? SIN_EQUIPO}>{children}</EquipoContext>
}
