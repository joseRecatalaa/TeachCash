import { describe, expect, test } from 'vitest'
import type { MundoPublicoDto, NivelPublicoDto } from '@/src/types/heroe.types'
import { enLetra, enLetraMayuscula, medida, resumir } from '../resumen'

const nivel = (id: string, tipo: NivelPublicoDto['tipo'], minutos: number): NivelPublicoDto => ({
  id,
  tipo,
  minutos,
  titulo: id,
  descripcion: id,
})

const mundo = (id: string, niveles: NivelPublicoDto[]): MundoPublicoDto => ({
  id,
  titulo: id,
  descripcion: id,
  decorado: 'hucha',
  seo: { titulo: id, descripcion: id },
  niveles,
  minutos: niveles.reduce((t, n) => t + n.minutos, 0),
})

describe('resumir', () => {
  test('cuenta mundos, niveles y estrellas, y el tramo de minutos de las lecciones', () => {
    const r = resumir([
      mundo('a', [nivel('a/1', 'lectura', 3), nivel('a/2', 'interactivo', 9), nivel('a/3', 'jefe', 12)]),
      mundo('b', [nivel('b/1', 'lectura', 5)]),
    ])
    expect(r).toMatchObject({ mundos: 2, niveles: 4, estrellas: 12, minutosMin: 3, minutosMax: 5 })
    expect(r.primero?.id).toBe('a/1')
  })

  test('sin contenido no inventa nada', () => {
    expect(resumir([])).toEqual({ mundos: 0, niveles: 0, estrellas: 0, minutosMin: 0, minutosMax: 0, primero: undefined })
  })
})

describe('enLetra', () => {
  test('en letra hasta diez y en cifra después', () => {
    expect(enLetra(4)).toBe('cuatro')
    expect(enLetraMayuscula(4)).toBe('Cuatro')
    expect(enLetra(11)).toBe('11')
  })
})

test('medida dice niveles y minutos, en singular cuando toca', () => {
  expect(medida(mundo('a', [nivel('a/1', 'lectura', 3)]))).toBe('1 nivel · 3 minutos')
  expect(medida(mundo('a', [nivel('a/1', 'lectura', 3), nivel('a/2', 'jefe', 8)]))).toBe('2 niveles · 11 minutos')
})
