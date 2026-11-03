/**
 * Los sprites se dibujan a mano, carácter a carácter, y lo que se rompe al
 * retocarlos no da ningún error: una fila con un píxel de más desplaza el
 * resto del dibujo, y una letra que no está en la paleta se pinta con una
 * variable que no existe, es decir, transparente.
 */

import { describe, expect, test } from 'vitest'
import * as sprites from '../sprites'
import type { Paleta, Sprite } from '../sprites'

const esSprite = (v: unknown): v is Sprite =>
  typeof v === 'object' && v !== null && 'filas' in v && Array.isArray((v as Sprite).filas)

const DEL_MUNDO = new Set(['NUBE', 'PINO'])
const DEL_CAMINO = new Set(['HUCHA', 'ESCUDO', 'MONTANA', 'TARJETA', 'LIBRO', 'MANDO', 'MONSTRUO', 'CANDADO', 'ESTRELLA', 'CERDITO', 'MONEDA', 'CORAZON', 'BARRAS', 'TARJETITA'])

const paletaDe = (nombre: string): Paleta => {
  if (DEL_MUNDO.has(nombre)) return sprites.PALETA_MUNDO
  if (DEL_CAMINO.has(nombre)) return sprites.PALETA_CAMINO
  return sprites.PALETA_HEROE
}

const todos = Object.entries(sprites).filter((e): e is [string, Sprite] => esSprite(e[1]))

describe.each(todos)('%s', (nombre, sprite) => {
  const paleta = paletaDe(nombre)

  test('todas sus filas miden lo mismo', () => {
    const anchos = new Set(sprite.filas.map((f) => f.length))
    expect([...anchos]).toHaveLength(1)
  })

  test('solo usa claves de su paleta', () => {
    const claves = new Set(sprite.filas.join('').replaceAll('.', ''))
    expect([...claves].filter((c) => !(c in paleta))).toEqual([])
  })
})

describe('los pasos de caminar', () => {
  test('ocupan la misma caja que las piernas quietas', () => {
    for (const paso of [sprites.PIERNAS_PASO_1, sprites.PIERNAS_PASO_2]) {
      expect([paso.x, paso.y, paso.filas.length, paso.filas[0].length]).toEqual([
        sprites.PIERNAS.x,
        sprites.PIERNAS.y,
        sprites.PIERNAS.filas.length,
        sprites.PIERNAS.filas[0].length,
      ])
    }
  })

  test('cada uno es el espejo del otro', () => {
    const espejo = (filas: readonly string[]) => filas.map((f) => [...f].reverse().join(''))
    // Los tonos de sombra no son simétricos (la luz viene de un lado), así que
    // se compara la silueta: qué es contorno, qué es hueco y qué es relleno.
    const silueta = (filas: readonly string[]) =>
      filas.map((f) => f.replace(/[^.o]/g, '#'))
    expect(silueta(espejo(sprites.PIERNAS_PASO_1.filas))).toEqual(silueta(sprites.PIERNAS_PASO_2.filas))
  })
})
