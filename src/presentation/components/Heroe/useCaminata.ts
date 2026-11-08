'use client'

/*
 * El héroe caminando de un punto a otro del camino.
 *
 * Lo mueve JavaScript y no una animación CSS porque el destino sale de los
 * datos (el siguiente nivel disponible) y cambia con cada partida. Avanza de
 * píxel ENTERO en píxel entero: un sprite en medio píxel se emborrona, y es
 * lo que hace que parezca un juego y no un vector que se desliza.
 *
 * Quien lo usa lo monta con una `key` por trayecto (`desde→hasta`): un
 * trayecto nuevo es un componente nuevo que vuelve a salir de `desde`, sin
 * tener que reiniciar el estado desde un efecto.
 *
 * Con el movimiento reducido no camina: aparece ya en su sitio.
 */

import { useEffect, useState } from 'react'
import type { Punto } from './camino'
import { useMovimientoReducido } from '../Pixel/useMovimientoReducido'

/** Píxeles de juego por segundo, andando. Lento a propósito: se tiene que ver andar. */
const VELOCIDAD = 40
/** Lo que espera antes de echar a andar, para que se vea dónde estaba. */
const ESPERA_MS = 350

export interface Caminata {
  pos: Punto
  andando: boolean
  mirando: 'izq' | 'der'
}

const redondear = ({ x, y }: Punto): Punto => ({ x: Math.round(x), y: Math.round(y) })

export interface OpcionesCaminata {
  velocidad?: number
  /** Con 0 echa a andar en el mismo pintado: es para responder a la mano. */
  espera?: number
}

export function useCaminata(
  desde: Punto,
  hasta: Punto,
  { velocidad = VELOCIDAD, espera = ESPERA_MS }: OpcionesCaminata = {},
): Caminata {
  const reducido = useMovimientoReducido()
  const [pos, setPos] = useState(() => redondear(desde))
  const [arrancado, setArrancado] = useState(espera === 0)
  const [llegado, setLlegado] = useState(false)
  const distancia = Math.hypot(hasta.x - desde.x, hasta.y - desde.y)
  const mirando = hasta.x < desde.x ? 'izq' : 'der'

  useEffect(() => {
    if (reducido || distancia === 0) return
    let cuadro = 0
    let inicio: number | null = null
    const avanzar = (ahora: number) => {
      inicio ??= ahora
      const t = Math.min(1, ((ahora - inicio) / 1000) * (velocidad / distancia))
      setPos(redondear({ x: desde.x + (hasta.x - desde.x) * t, y: desde.y + (hasta.y - desde.y) * t }))
      if (t < 1) cuadro = requestAnimationFrame(avanzar)
      else setLlegado(true)
    }
    if (espera === 0) {
      cuadro = requestAnimationFrame(avanzar)
      return () => cancelAnimationFrame(cuadro)
    }
    const temporizador = window.setTimeout(() => {
      setArrancado(true)
      cuadro = requestAnimationFrame(avanzar)
    }, espera)
    return () => {
      window.clearTimeout(temporizador)
      cancelAnimationFrame(cuadro)
    }
    // El trayecto no cambia durante la vida del componente (ver la `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducido])

  if (reducido || distancia === 0) return { pos: redondear(hasta), andando: false, mirando }
  return { pos, andando: arrancado && !llegado, mirando }
}
