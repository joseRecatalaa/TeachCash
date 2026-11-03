'use client'

/*
 * Si quien mira pidió menos movimiento. Lo comparten las escenas a píxel: el
 * CSS ya anula las animaciones con el bloque de `globals.css`, pero lo que
 * mueve JavaScript (el reloj del splash, el héroe que camina) no se entera
 * del CSS y lo tiene que preguntar aparte.
 */

import { useSyncExternalStore } from 'react'

const CONSULTA_MOVIMIENTO = '(prefers-reduced-motion: reduce)'

/**
 * La preferencia de movimiento, leída sin romper la hidratación.
 *
 * `matchMedia` no existe en el servidor, así que el tercer argumento devuelve
 * `false` allí: React pinta lo mismo en las dos partes y ya en el cliente
 * vuelve a pintar con el valor de verdad. Leerlo con `useState` daría un aviso
 * de hidratación a quien tenga el movimiento reducido, y hacerlo dentro de un
 * efecto obligaría a un `setState` que ESLint —con razón— no quiere.
 */
export function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(CONSULTA_MOVIMIENTO)
      mq.addEventListener('change', avisar)
      return () => mq.removeEventListener('change', avisar)
    },
    () => window.matchMedia(CONSULTA_MOVIMIENTO).matches,
    () => false,
  )
}
