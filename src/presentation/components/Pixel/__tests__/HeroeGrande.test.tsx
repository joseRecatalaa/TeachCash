/**
 * Lo que decide `HeroeGrande` y no el CSS: qué piezas se pintan, en qué orden y
 * con qué calidad. Que un objeto del catálogo se quede sin dibujo no daría ningún
 * error, simplemente no se vería.
 */

import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CATALOGO, TIPOS_OBJETO, type Hueco } from '@/lib/tienda'
import { EscenaHeroe, HeroeGrande, ObjetoPixel, SPRITE_OBJETO } from '../HeroeGrande'

const piezas = (equipo: string[]) =>
  [...render(<svg><HeroeGrande equipo={equipo} /></svg>).container.querySelectorAll('[data-hueco]')].map(
    (g) => `${g.getAttribute('data-hueco')}:${g.getAttribute('data-calidad')}`,
  )

describe('HeroeGrande', () => {
  test('todos los tipos del catálogo tienen dibujo', () => {
    for (const tipo of TIPOS_OBJETO) expect(SPRITE_OBJETO[tipo].filas.length).toBeGreaterThan(0)
  })

  test('sin equipo no pinta ninguna pieza', () => {
    expect(piezas([])).toEqual([])
  })

  test('pinta cada pieza con su calidad', () => {
    expect(piezas(['casco-alta'])).toEqual(['casco:alta'])
  })

  test('el orden de pintado no depende del orden en que llegan', () => {
    const ordenado = ['botas:media', 'alas:media', 'armadura:media', 'guantes:media', 'casco:media', 'escudo:media', 'arma:media']
    const ids = ['espada-media', 'escudo-media', 'casco-media', 'guantes-media', 'armadura-media', 'alas-media', 'botas-media']
    expect(piezas(ids)).toEqual(ordenado)
  })

  test('un id que ya no está en el catálogo no se pinta ni revienta', () => {
    expect(piezas(['retirado'])).toEqual([])
  })
})

describe('EscenaHeroe', () => {
  test('dice qué lleva puesto: el dibujo no le llega a un lector de pantalla', () => {
    render(<EscenaHeroe equipo={['casco-alta', 'alas-basica']} />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'El héroe, con: Casco de oro, Alas de plumas')
  })

  test('y también si no lleva nada', () => {
    render(<EscenaHeroe />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'El héroe, sin equipo')
  })
})

describe('ObjetoPixel', () => {
  test.each(CATALOGO.map((o) => [o.id, o] as const))('%s se pinta a una escala entera que cabe', (_id, objeto) => {
    const svg = render(<ObjetoPixel objeto={objeto} />).container.querySelector('svg')!
    const sprite = SPRITE_OBJETO[objeto.tipo]
    const escala = Number(svg.getAttribute('width')) / sprite.filas[0].length
    expect(Number.isInteger(escala)).toBe(true)
    expect(Number(svg.getAttribute('height'))).toBe(sprite.filas.length * escala)
  })
})

describe('la pieza señalada', () => {
  const pintar = (equipo: string[], senalado: Hueco) =>
    render(<svg><HeroeGrande equipo={equipo} senalado={senalado} /></svg>).container

  test('una pieza puesta lleva su anillo y no se pinta dos veces', () => {
    const c = pintar(['casco-alta'], 'casco')
    expect(c.querySelectorAll('[data-anillo]')).toHaveLength(1)
    expect(c.querySelectorAll('[data-hueco="casco"]')).toHaveLength(1)
    expect(c.querySelector('[data-fantasma]')).toBeNull()
  })

  test('un hueco vacío enseña la silueta de lo que falta', () => {
    const c = pintar([], 'armadura')
    expect(c.querySelector('[data-fantasma="armadura"]')).not.toBeNull()
    expect(c.querySelector('[data-anillo]')).not.toBeNull()
  })
})
