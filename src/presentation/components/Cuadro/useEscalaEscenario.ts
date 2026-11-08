'use client'

/**
 * La mayor escala ENTERA a la que cabe el escenario del héroe sin que la página
 * haga scroll: de su borde de arriba al de abajo de la ventana, y a lo ancho, lo
 * que dejan las columnas del patrimonio y del radar.
 *
 * Entera porque a cualquier otra los píxeles del dibujo salen de anchos
 * distintos. Se recalcula al cambiar el tamaño de la ventana.
 */

import { useLayoutEffect, useState, type RefObject } from 'react'
import { ESCENARIO } from '../Pixel/EscenarioHeroe'

/** El `py="xl"` del `Container` de la página, más un respiro. */
const MARGEN_ABAJO = 40
/** Lo que se reserva a cada lado en escritorio: el patrimonio y el radar. */
const LATERAL = 440
const MINIMA = 3
const MAXIMA = 10

function calcular(el: HTMLElement): number {
  const escritorio = window.matchMedia('(min-width: 62em)').matches
  const ancho = escritorio ? window.innerWidth - 2 * LATERAL : window.innerWidth - 32
  // En el móvil el héroe va debajo del patrimonio: ahí manda el ancho.
  const alto = escritorio
    ? window.innerHeight - (el.getBoundingClientRect().top + window.scrollY) - MARGEN_ABAJO
    : Number.POSITIVE_INFINITY
  const escala = Math.floor(Math.min(ancho / ESCENARIO.ancho, alto / ESCENARIO.alto))
  return Math.min(MAXIMA, Math.max(MINIMA, escala))
}

export function useEscalaEscenario(ref: RefObject<HTMLElement | null>, inicial = 4): number {
  const [escala, setEscala] = useState(inicial)
  useLayoutEffect(() => {
    const medir = () => {
      if (ref.current) setEscala(calcular(ref.current))
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [ref])
  return escala
}
