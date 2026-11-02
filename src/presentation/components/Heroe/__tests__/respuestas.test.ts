/**
 * La lógica pura del reproductor. Lo que importa: que lo que se manda tenga
 * la forma que espera el servidor (si no, rechaza la partida entera) y que
 * los pasos de "ordenar" no salgan nunca ya ordenados.
 */

import { describe, expect, test } from 'vitest'
import fc from 'fast-check'
import type { Pregunta } from '@/src/types/heroe.types'
import { barajar, completa, formatoCifra, solucion, valorInicial } from '../reproductor/respuestas'
import { aCentesimas, aEntero } from '../ejercicios/Calcula'

const base = { id: 'p', enunciado: '¿?', explicacion: 'Porque.' }
const P = {
  opcion: { ...base, tipo: 'opcion', opciones: ['a', 'b'], correcta: 1 },
  hueco: { ...base, tipo: 'hueco', enunciado: 'Un ___ aquí', opciones: ['a', 'b'], correcta: 0 },
  vf: { ...base, tipo: 'verdaderoFalso', correcta: false },
  ordenar: { ...base, tipo: 'ordenar', pasos: ['uno', 'dos', 'tres'] },
  emparejar: {
    ...base,
    tipo: 'emparejar',
    pares: [
      { concepto: 'A', definicion: 'a' },
      { concepto: 'B', definicion: 'b' },
      { concepto: 'C', definicion: 'c' },
    ],
  },
  calcula: { ...base, tipo: 'calcula', unidad: 'euros', solucion: 285_000, tolerancia: 0 },
} satisfies Record<string, Pregunta>

describe('barajar', () => {
  test('propiedad: una permutación de 0..n-1 que nunca es la identidad', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), fc.infiniteStream(fc.double({ min: 0, max: 0.999, noNaN: true })), (n, numeros) => {
        const it = numeros[Symbol.iterator]()
        const orden = barajar(n, () => it.next().value)
        expect([...orden].sort((a, b) => a - b)).toEqual([...Array(n).keys()])
        expect(orden).not.toEqual([...Array(n).keys()])
      }),
    )
  })

  test('con un azar que siempre deja el orden bueno, rota uno en vez de colgarse', () => {
    // Siempre el máximo: Fisher-Yates intercambia cada posición consigo misma.
    expect(barajar(3, () => 0.999)).toEqual([1, 2, 0])
  })

  test('con menos de dos no hay nada que barajar', () => {
    expect(barajar(1)).toEqual([0])
  })
})

describe('valorInicial y completa', () => {
  test('cada tipo arranca sin contestar, salvo ordenar, que ya es una respuesta', () => {
    expect(valorInicial(P.opcion)).toBeNull()
    expect(completa(P.opcion, null)).toBe(false)
    expect(completa(P.ordenar, valorInicial(P.ordenar))).toBe(true)
    expect(valorInicial(P.emparejar)).toEqual([null, null, null])
  })

  test.each([
    ['opcion', P.opcion, 0, true],
    ['hueco', P.hueco, 1, true],
    ['verdadero/falso con false', P.vf, false, true],
    ['verdadero/falso sin contestar', P.vf, null, false],
    ['calcula con un importe', P.calcula, 0, true],
    ['calcula a medio escribir', P.calcula, null, false],
    ['emparejar a medias', P.emparejar, [0, null, 2], false],
    ['emparejar con una repetida', P.emparejar, [0, 0, 2], false],
    ['emparejar entero', P.emparejar, [2, 0, 1], true],
  ] as const)('%s', (_caso, pregunta, valor, esperado) => {
    expect(completa(pregunta, valor as never)).toBe(esperado)
  })
})

describe('solucion', () => {
  test.each([
    [P.opcion, 'b'],
    [P.hueco, 'a'],
    [P.vf, 'Falso'],
    [P.ordenar, '1. uno · 2. dos · 3. tres'],
    [P.emparejar, 'A: a · B: b · C: c'],
  ] as const)('%#', (pregunta, texto) => {
    expect(solucion(pregunta)).toBe(texto)
  })

  test('calcula en euros se dice como un importe', () => {
    // es-ES no agrupa los miles con cuatro cifras: "2850,00 €", como en el resto de la app.
    expect(solucion(P.calcula)).toMatch(/^2850,00\s€$/)
  })
})

describe('las cifras de calcula', () => {
  test.each([
    ['porcentaje', 525, '5,25 %'],
    ['porcentaje', 500, '5 %'],
    ['numero', 1200, '1200'],
  ] as const)('%s %i → %s', (unidad, valor, texto) => {
    expect(formatoCifra(unidad, valor).replace(/\s/g, ' ')).toBe(texto)
  })

  test.each([
    ['5,25', 525],
    ['5', 500],
    ['0,5', 50],
    ['cinco', null],
    ['', null],
  ])('porcentaje "%s" → %s centésimas', (texto, valor) => {
    expect(aCentesimas(texto)).toBe(valor)
  })

  test.each([
    ['12', 12],
    ['1.200', 1200],
    ['-3', -3],
    ['1,5', null],
    ['doce', null],
  ])('número "%s" → %s', (texto, valor) => {
    expect(aEntero(texto)).toBe(valor)
  })
})
