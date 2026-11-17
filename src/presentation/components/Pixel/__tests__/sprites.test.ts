/**
 * Los sprites se dibujan a mano, carácter a carácter, y lo que se rompe al
 * retocarlos no da ningún error: una fila con un píxel de más desplaza el
 * resto del dibujo, y una letra que no está en la paleta se pinta con una
 * variable que no existe, es decir, transparente.
 */

import { describe, expect, test } from 'vitest'
import * as sprites from '../sprites'
import type { Paleta, Sprite } from '../sprites'
import * as spritesGrande from '../spritesGrande'
import * as spritesEquipo from '../spritesEquipo'
import { ALTO_HEROE_GRANDE, ANCHO_HEROE_GRANDE } from '../HeroeGrande'
import { ALTO_HEROE } from '../PixelHero'
import { TIPOS_OBJETO } from '@/lib/tienda'

const esSprite = (v: unknown): v is Sprite =>
  typeof v === 'object' && v !== null && 'filas' in v && Array.isArray((v as Sprite).filas)

const DEL_MUNDO = new Set(['NUBE', 'PINO', 'ISLA'])
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

const grandes = Object.entries(spritesGrande).filter((e): e is [string, Sprite] => esSprite(e[1]))

describe.each(grandes)('%s', (nombre, sprite) => {
  test('todas sus filas miden lo mismo', () => {
    expect(new Set(sprite.filas.map((f) => f.length)).size).toBe(1)
  })

  test('solo usa claves de su paleta', () => {
    const claves = new Set(sprite.filas.join('').replaceAll('.', ''))
    expect([...claves].filter((c) => !(c in spritesGrande.PALETA_HEROE_GRANDE))).toEqual([])
  })

  // El equipo puede salirse: alas, arma y escudo van fuera de la caja a propósito.
  test.runIf(nombre.startsWith('GRANDE_'))('cabe en la caja del héroe', () => {
    expect(sprite.x).toBeGreaterThanOrEqual(0)
    expect(sprite.y).toBeGreaterThanOrEqual(0)
    expect(sprite.x + sprite.filas[0].length).toBeLessThanOrEqual(ANCHO_HEROE_GRANDE)
    expect(sprite.y + sprite.filas.length).toBeLessThanOrEqual(ALTO_HEROE_GRANDE)
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

/* ── El equipo del héroe pequeño ─────────────────────────────────────────── */

const pequenas = Object.entries(spritesEquipo).filter((e): e is [string, Sprite] => esSprite(e[1]))

describe.each(pequenas)('%s', (_nombre, sprite) => {
  test('todas sus filas miden lo mismo', () => {
    expect(new Set(sprite.filas.map((f) => f.length)).size).toBe(1)
  })

  test('solo usa claves de su paleta', () => {
    const claves = new Set(sprite.filas.join('').replaceAll('.', ''))
    expect([...claves].filter((c) => !(c in spritesEquipo.PALETA_EQUIPO))).toEqual([])
  })

  // Puede salirse por los lados y el casco asoma una fila, pero nada baja de las
  // botas: el héroe se apoya en su fila 43 y debajo está el suelo de la escena.
  test('no baja de las botas del héroe', () => {
    expect(sprite.y + sprite.filas.length).toBeLessThanOrEqual(ALTO_HEROE)
  })
})

describe('el equipo pequeño', () => {
  test('cada tipo del catálogo tiene su versión pequeña, y es una de las exportadas', () => {
    const exportadas = new Set(pequenas.map(([, s]) => s))
    for (const tipo of TIPOS_OBJETO) {
      expect(spritesEquipo.PIEZAS_PEQUENAS[tipo].length).toBeGreaterThan(0)
      for (const s of spritesEquipo.PIEZAS_PEQUENAS[tipo]) expect(exportadas.has(s)).toBe(true)
    }
  })

  test('la paleta es la misma que la del héroe grande', () => {
    expect(spritesGrande.PALETA_HEROE_GRANDE).toBe(spritesEquipo.PALETA_EQUIPO)
  })

  test('las alas no le añaden alto: no pasan de su cabeza', () => {
    expect(spritesEquipo.EQUIPO_ALAS.y).toBeGreaterThanOrEqual(0)
  })

  test('las botas de cada paso tienen el ancho de las quietas y apoyan en el mismo suelo', () => {
    const { EQUIPO_BOTAS: quietas, EQUIPO_BOTAS_PASO_1: paso1, EQUIPO_BOTAS_PASO_2: paso2 } = spritesEquipo
    const suelo = (s: Sprite) => s.y + s.filas.length
    for (const paso of [paso1, paso2]) {
      expect([paso.x, paso.filas[0].length, suelo(paso)]).toEqual([quietas.x, quietas.filas[0].length, suelo(quietas)])
      // Una bota levantada dos píxeles, como las piernas del paso.
      expect(paso.filas).toHaveLength(quietas.filas.length + 2)
    }
  })

  test('las botas de un paso son el espejo de las del otro, como las piernas', () => {
    const espejo = (filas: readonly string[]) => filas.map((f) => [...f].reverse().join(''))
    const silueta = (filas: readonly string[]) => filas.map((f) => f.replace(/[^.o]/g, '#'))
    expect(silueta(espejo(spritesEquipo.EQUIPO_BOTAS_PASO_1.filas))).toEqual(
      silueta(spritesEquipo.EQUIPO_BOTAS_PASO_2.filas),
    )
  })
})
