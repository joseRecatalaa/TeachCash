/**
 * La geometría del camino. Lo que importa: que todo sea entero (un sprite en
 * medio píxel se emborrona), que nada se salga del lienzo y que el héroe no
 * tape el nodo junto al que espera.
 */

import { describe, expect, test } from 'vitest'
import fc from 'fast-check'
import { ALTO_HEROE, ANCHO_HEROE } from '../../Pixel/PixelHero'
import {
  ANCHO_CAMINO,
  altoCamino,
  heroeInicio,
  inicioSendero,
  posicionHeroe,
  posicionesNodos,
  trazoSendero,
} from '../camino'

const enteros = (...ns: number[]) => ns.every(Number.isInteger)

describe('posicionesNodos', () => {
  test('bajan en zigzag: centro, derecha, centro, izquierda', () => {
    const xs = posicionesNodos(5).map((p) => p.x)
    expect(xs).toEqual([80, 120, 80, 40, 80])
  })

  test('propiedad: enteros, de ABAJO arriba y dentro del lienzo', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 15 }), (n) => {
        const puntos = posicionesNodos(n)
        const alto = altoCamino(n)
        for (const p of puntos) {
          expect(enteros(p.x, p.y)).toBe(true)
          expect(p.x).toBeGreaterThan(0)
          expect(p.x).toBeLessThan(ANCHO_CAMINO)
          expect(p.y).toBeLessThan(alto)
        }
        // El primero es el de más abajo: el camino sube hacia el jefe.
        const ys = puntos.map((p) => p.y)
        expect(ys).toEqual([...ys].sort((a, b) => b - a))
        expect(new Set(ys).size).toBe(ys.length)
        expect(Math.min(...ys)).toBeGreaterThan(0)
      }),
    )
  })
})

describe('posicionHeroe', () => {
  test.each(posicionesNodos(4).map((p) => [p.x, p] as const))(
    'junto al nodo de x = %i: entero, dentro del lienzo y sin taparlo',
    (_x, nodo) => {
      const h = posicionHeroe(nodo)
      expect(enteros(h.x, h.y)).toBe(true)
      expect(h.x).toBeGreaterThanOrEqual(0)
      expect(h.x + ANCHO_HEROE).toBeLessThanOrEqual(ANCHO_CAMINO)
      // Lo más ancho de un nodo: el halo de 16 de radio o el monstruo del
      // jefe, que mide 28 (14 a cada lado).
      const solapa = h.x < nodo.x + 17 && h.x + ANCHO_HEROE > nodo.x - 17
      expect(solapa).toBe(false)
    },
  )

  test('celebrando junto al último nodo, el billete en alto cabe en el lienzo', () => {
    // El billete de `celebra` asoma 10 píxeles por encima de la caja del héroe.
    const ultimo = posicionesNodos(9).at(-1) as { x: number; y: number }
    expect(posicionHeroe(ultimo).y - 10).toBeGreaterThanOrEqual(0)
  })

  test('las botas quedan a la altura del nodo', () => {
    const nodo = posicionesNodos(1)[0]
    expect(posicionHeroe(nodo).y + ALTO_HEROE).toBeGreaterThan(nodo.y)
  })

  test.each([1, 3, 9])('con %i niveles, el héroe arranca abajo del todo, debajo del primer nodo y dentro', (n) => {
    const alto = altoCamino(n)
    const primero = posicionesNodos(n)[0]
    const heroe = heroeInicio(n)
    expect(heroe.y + ALTO_HEROE).toBeLessThanOrEqual(alto)
    // Por debajo del nodo y de sus estrellas (radio 11 + 5 + 7 de estrella).
    expect(heroe.y).toBeGreaterThan(primero.y + 23)
    expect(inicioSendero(n).y).toBeGreaterThan(primero.y)
  })
})

describe('trazoSendero', () => {
  test('sin dos puntos no hay sendero', () => {
    expect(trazoSendero([])).toBe('')
    expect(trazoSendero([{ x: 0, y: 0 }])).toBe('')
  })

  test('piedras de 2x2 en coordenadas enteras, sin pisar los extremos', () => {
    const d = trazoSendero([{ x: 80, y: 0 }, { x: 80, y: 70 }])
    const piedras = [...d.matchAll(/M(-?\d+) (-?\d+)h2v2h-2z/g)]
    expect(piedras).toHaveLength(9)
    expect(piedras.map((m) => m[0]).join('')).toBe(d)
    const ys = piedras.map((m) => Number(m[2]) + 1)
    expect(Math.min(...ys)).toBeGreaterThan(0)
    expect(Math.max(...ys)).toBeLessThan(70)
  })
})
