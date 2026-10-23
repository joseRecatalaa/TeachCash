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
  HEROE_INICIO,
  altoCamino,
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

  test('propiedad: enteros, de arriba abajo y dentro del lienzo', () => {
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
        const ys = puntos.map((p) => p.y)
        expect(ys).toEqual([...ys].sort((a, b) => a - b))
        expect(new Set(ys).size).toBe(ys.length)
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
      // El nodo más ancho (el jefe) tiene radio 15 + 2 de borde.
      const solapa = h.x < nodo.x + 17 && h.x + ANCHO_HEROE > nodo.x - 17
      expect(solapa).toBe(false)
    },
  )

  test('las botas quedan a la altura del nodo, y el de arranque, arriba del todo', () => {
    const nodo = posicionesNodos(1)[0]
    expect(posicionHeroe(nodo).y + ALTO_HEROE).toBeGreaterThan(nodo.y)
    expect(HEROE_INICIO.y).toBe(0)
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
