/**
 * Las reglas puras del Camino del héroe: qué respuesta es buena y cuántas
 * estrellas vale una partida. Al 100 %: lo que diga esto es lo que el servidor
 * guarda como superado.
 */

import { describe, expect, test } from 'vitest'
import fc from 'fast-check'
import { APROBADO_POR_DEFECTO, esCorrecta, estrellas, supera } from '@/lib/heroe'

describe('esCorrecta', () => {
  test.each([
    ['opcion', { tipo: 'opcion', correcta: 2 } as const, 2, 1],
    ['hueco', { tipo: 'hueco', correcta: 0 } as const, 0, 1],
    ['verdaderoFalso', { tipo: 'verdaderoFalso', correcta: false } as const, false, true],
  ])('%s: solo la buena', (_tipo, pregunta, buena, mala) => {
    expect(esCorrecta(pregunta, buena)).toBe(true)
    expect(esCorrecta(pregunta, mala)).toBe(false)
  })

  test('verdadero/falso no acepta lo que "parece" falso', () => {
    const p = { tipo: 'verdaderoFalso', correcta: false } as const
    expect(esCorrecta(p, 0)).toBe(false)
    expect(esCorrecta(p, null)).toBe(false)
  })

  test.each([
    ['ordenar', { tipo: 'ordenar', pasos: ['a', 'b', 'c'] } as const],
    ['emparejar', { tipo: 'emparejar', pares: [{}, {}, {}] } as const],
  ])('%s: solo la identidad', (_tipo, pregunta) => {
    expect(esCorrecta(pregunta, [0, 1, 2])).toBe(true)
    expect(esCorrecta(pregunta, [0, 2, 1])).toBe(false)
    expect(esCorrecta(pregunta, [0, 1])).toBe(false)
    expect(esCorrecta(pregunta, [0, 1, 2, 3])).toBe(false)
    expect(esCorrecta(pregunta, '012')).toBe(false)
  })

  test('ordenar: cualquier permutación que no sea la identidad es un fallo', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { minLength: 3, maxLength: 6 }), (claves) => {
        const n = claves.length
        const orden = [...Array(n).keys()].sort((a, b) => claves[a] - claves[b] || a - b)
        const esIdentidad = orden.every((v, i) => v === i)
        expect(esCorrecta({ tipo: 'ordenar', pasos: Array(n).fill('x') }, orden)).toBe(esIdentidad)
      }),
    )
  })

  describe('calcula', () => {
    const pregunta = (solucion: number, tolerancia: number) =>
      ({ tipo: 'calcula', solucion, tolerancia }) as const

    test('acepta justo en el borde de la tolerancia, por los dos lados', () => {
      expect(esCorrecta(pregunta(10_000, 50), 10_050)).toBe(true)
      expect(esCorrecta(pregunta(10_000, 50), 9_950)).toBe(true)
      expect(esCorrecta(pregunta(10_000, 50), 10_051)).toBe(false)
      expect(esCorrecta(pregunta(10_000, 50), 9_949)).toBe(false)
    })

    test('con tolerancia cero, solo la exacta', () => {
      expect(esCorrecta(pregunta(525, 0), 525)).toBe(true)
      expect(esCorrecta(pregunta(525, 0), 526)).toBe(false)
    })

    test('un decimal, un texto o algo fuera de rango no valen (regla dura 1)', () => {
      expect(esCorrecta(pregunta(100, 10), 100.5)).toBe(false)
      expect(esCorrecta(pregunta(100, 10), '100')).toBe(false)
      expect(esCorrecta(pregunta(100, 10), Number.NaN)).toBe(false)
      expect(esCorrecta(pregunta(0, 10), Number.MAX_SAFE_INTEGER + 1)).toBe(false)
    })

    test('propiedad: es buena si y solo si |respuesta − solución| ≤ tolerancia', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1_000_000_000, max: 1_000_000_000 }),
          fc.integer({ min: 0, max: 1_000_000 }),
          fc.integer({ min: -2_000_000, max: 2_000_000 }),
          (solucion, tolerancia, desvio) => {
            const r = esCorrecta(pregunta(solucion, tolerancia), solucion + desvio)
            expect(r).toBe(Math.abs(desvio) <= tolerancia)
          },
        ),
      )
    })
  })
})

describe('supera', () => {
  test('con enteros: 3 de 5 es exactamente un 60 %', () => {
    expect(supera(3, 5, 60)).toBe(true)
    expect(supera(2, 5, 60)).toBe(false)
    expect(supera(7, 10, 70)).toBe(true)
    expect(supera(6, 10, 70)).toBe(false)
  })
})

describe('estrellas', () => {
  test.each([
    [5, 5, 3],
    [4, 5, 2],
    [3, 5, 1],
    [2, 5, 0],
    [0, 5, 0],
    [8, 10, 2],
    [7, 10, 1],
  ] as const)('%i de %i con el aprobado por defecto: %i', (aciertos, total, esperadas) => {
    expect(estrellas(aciertos, total, APROBADO_POR_DEFECTO)).toBe(esperadas)
  })

  test('un jefe con un 90 %: 8 de 10 no lo supera, aunque llegue al 80 %', () => {
    expect(estrellas(8, 10, 90)).toBe(0)
    expect(estrellas(9, 10, 90)).toBe(2)
  })

  test('sin preguntas no hay estrellas', () => {
    expect(estrellas(0, 0, 60)).toBe(0)
  })

  test('propiedad: más aciertos nunca dan menos estrellas', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 50, max: 100 }),
        (total, aprobado) => {
          for (let a = 1; a <= total; a++) {
            expect(estrellas(a, total, aprobado)).toBeGreaterThanOrEqual(estrellas(a - 1, total, aprobado))
          }
        },
      ),
    )
  })

  test('propiedad: hay estrellas si y solo si se supera', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), fc.nat(20), fc.integer({ min: 50, max: 100 }), (total, a, aprobado) => {
        const aciertos = Math.min(a, total)
        expect(estrellas(aciertos, total, aprobado) > 0).toBe(supera(aciertos, total, aprobado))
      }),
    )
  })
})
