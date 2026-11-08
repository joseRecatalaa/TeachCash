/*
 * La geometría del camino de un mundo, en píxeles de juego.
 *
 * El camino es VERTICAL y SUBE en zigzag: empieza abajo y el jefe espera
 * arriba del todo, como una montaña que se escala. Centro, derecha, centro,
 * izquierda… Vertical porque se juega sobre todo en el móvil, donde lo que
 * sobra es alto y no ancho; y en zigzag para que se lea como un sendero y no
 * como una lista.
 *
 * Todo son enteros: un sprite colocado en medio píxel se emborrona, y el
 * héroe camina de píxel en píxel.
 */

import { ALTO_HEROE, ANCHO_HEROE } from '../Pixel/PixelHero'

export type Punto = { x: number; y: number }

/** El ancho del lienzo del camino. El alto depende de cuántos niveles tenga. */
export const ANCHO_CAMINO = 160
/**
 * Lo que hay por encima del último nodo: el monstruo del jefe y el héroe a su
 * lado. Con todo superado el héroe celebra con el billete en alto, que asoma
 * 10 píxeles por encima de su caja: con menos aire se cortaba arriba.
 */
const ARRIBA = 56
/** La distancia vertical entre dos nodos. */
const PASO = 64
/** Lo que hay por debajo del primer nodo: ahí espera el héroe antes de empezar. */
const ABAJO = 76
/** Cuánto se separa un nodo del centro en el zigzag. */
const VAIVEN = 40
/** Cuánto se separa el héroe del centro del nodo: más que el radio del jefe con su borde (17). */
const HOLGURA_HEROE = 18
/** Las botas del héroe quedan un poco por debajo del centro del nodo, como si pisara su borde. */
const PIES = 8

const CENTRO = ANCHO_CAMINO / 2
const ZIGZAG = [0, VAIVEN, 0, -VAIVEN]

export function altoCamino(niveles: number): number {
  return ARRIBA + Math.max(0, niveles - 1) * PASO + ABAJO
}

/** El centro de cada nodo, en el orden en que se juegan: de ABAJO arriba. */
export function posicionesNodos(niveles: number): Punto[] {
  const alto = altoCamino(niveles)
  return Array.from({ length: niveles }, (_, i) => ({
    x: CENTRO + ZIGZAG[i % ZIGZAG.length],
    y: alto - ABAJO - i * PASO,
  }))
}

/** Donde arranca el sendero, debajo del primer nodo. */
export function inicioSendero(niveles: number): Punto {
  return { x: CENTRO, y: altoCamino(niveles) - 8 }
}

/**
 * La esquina de arriba a la izquierda del héroe cuando espera junto a `nodo`.
 * Se pone del lado que tiene sitio: a la derecha de los nodos de la mitad
 * izquierda y a la izquierda de los de la derecha.
 */
export function posicionHeroe(nodo: Punto): Punto {
  const x = nodo.x <= CENTRO ? nodo.x + HOLGURA_HEROE : nodo.x - HOLGURA_HEROE - ANCHO_HEROE
  return { x, y: nodo.y + PIES - ALTO_HEROE }
}

/** Antes del primer nodo, el héroe espera de pie en el arranque del sendero. */
export function heroeInicio(niveles: number): Punto {
  return { x: CENTRO - ANCHO_HEROE / 2, y: altoCamino(niveles) - 4 - ALTO_HEROE }
}

/** Cada cuántos píxeles va una piedra del sendero. */
const ENTRE_PIEDRAS = 7

/**
 * El sendero: piedras de 2x2 cada pocos píxeles a lo largo de los tramos
 * rectos entre puntos. Un `<path>` para todo el sendero, como los sprites.
 */
export function trazoSendero(puntos: readonly Punto[]): string {
  let d = ''
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1]
    const b = puntos[i]
    const largo = Math.hypot(b.x - a.x, b.y - a.y)
    const piedras = Math.floor(largo / ENTRE_PIEDRAS)
    // Sin la primera ni la última: ahí está el nodo, que las taparía a medias.
    for (let k = 1; k < piedras; k++) {
      const t = k / piedras
      const x = Math.round(a.x + (b.x - a.x) * t) - 1
      const y = Math.round(a.y + (b.y - a.y) * t) - 1
      d += `M${x} ${y}h2v2h-2z`
    }
  }
  return d
}
