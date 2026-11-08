'use client'

/**
 * Un entero que cuenta hasta su valor: lo que hay debajo de `AnimatedMoney` y de
 * `AnimatedCount`. Devuelve el número que toca enseñar en cada fotograma.
 *
 * - **Solo se anima el camino, nunca el destino.** Cada fotograma se redondea a
 *   entero y el último es exactamente `valor`.
 * - **No cuenta al montar**: arranca en su valor. Solo cuenta cuando el valor
 *   CAMBIA, que es cuando hay algo que contar.
 * - **Si se pide menos movimiento, salta al valor.** Esto es JavaScript y el
 *   bloque de `prefers-reduced-motion` de `globals.css` no llega aquí: hay que
 *   preguntarlo por `matchMedia`.
 */

import { useEffect, useRef, useState } from 'react'

/** Frena al final en vez de cortar en seco: es lo que lo hace parecer un conteo. */
const easeOut = (t: number) => 1 - (1 - t) ** 3

export const DURACION_CUENTA = 650

export function useCuenta(valor: number | undefined, duracion = DURACION_CUENTA): number {
  const [mostrado, setMostrado] = useState(valor ?? 0)
  // Desde dónde arranca la próxima cuenta. En una ref y no en estado: cambiarlo
  // no tiene que provocar un render, solo alimentar al siguiente frame.
  const desde = useRef(valor ?? 0)

  useEffect(() => {
    if (valor === undefined) return

    const destino = valor
    const reducido =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducido || desde.current === destino) {
      desde.current = destino
      setMostrado(destino)
      return
    }

    const origen = desde.current
    const t0 = performance.now()
    let frame = 0

    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - t0) / duracion)
      // Redondeo a entero SIEMPRE: en un importe, un fotograma con decimales
      // haría que `money()` lanzara, que es justo la red que queremos conservar.
      setMostrado(Math.round(origen + (destino - origen) * easeOut(t)))
      if (t < 1) frame = requestAnimationFrame(paso)
      else desde.current = destino
    }

    frame = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(frame)
  }, [valor, duracion])

  return mostrado
}
