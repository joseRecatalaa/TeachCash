/**
 * El analizador de negrita y cursiva del contenido. Lo que importa: que el
 * texto normal (cuentas, nombres con guion bajo, el hueco de los ejercicios)
 * no se convierta en marcas, y que una marca sin cerrar se detecte.
 */

import { describe, expect, test } from 'vitest'
import fc from 'fast-check'
import { analizar, errorDeMarcas, type NodoMarcado } from '@/lib/marcas'

const nodos = (texto: string) => analizar(texto).nodos

/** El texto que se lee, sin las marcas: lo que diría un lector de pantalla. */
const plano = (n: NodoMarcado[]): string => n.map((x) => (typeof x === 'string' ? x : plano(x.hijos))).join('')

describe('marcas', () => {
  test('negrita y cursiva', () => {
    expect(nodos('Esto es **clave** y esto _matiz_.')).toEqual([
      'Esto es ',
      { marca: 'strong', hijos: ['clave'] },
      ' y esto ',
      { marca: 'em', hijos: ['matiz'] },
      '.',
    ])
  })

  test('anidadas, en los dos sentidos', () => {
    expect(nodos('**muy _importante_**')).toEqual([
      { marca: 'strong', hijos: ['muy ', { marca: 'em', hijos: ['importante'] }] },
    ])
    expect(nodos('_casi **todo**_')).toEqual([
      { marca: 'em', hijos: ['casi ', { marca: 'strong', hijos: ['todo'] }] },
    ])
  })

  test('al principio, al final y junto a signos', () => {
    expect(nodos('**Ojo**: (_siempre_) ¡**ya**!')).toEqual([
      { marca: 'strong', hijos: ['Ojo'] },
      ': (',
      { marca: 'em', hijos: ['siempre'] },
      ') ¡',
      { marca: 'strong', hijos: ['ya'] },
      '!',
    ])
  })
})

describe('lo que NO es una marca', () => {
  test.each([
    ['un asterisco suelto', '3 * 4 = 12'],
    ['dos asteriscos con espacios', '2 ** 3 son 8'],
    ['tres asteriscos', 'separador *** aquí'],
    ['un guion bajo dentro de una palabra', 'la variable mi_cuenta_ahorro'],
    ['el hueco de los ejercicios', 'Entre 3 y ___ meses'],
    ['un guion bajo suelto', 'a _ b'],
  ])('%s', (_caso, texto) => {
    expect(nodos(texto)).toEqual([texto])
    expect(errorDeMarcas(texto)).toBeNull()
  })

  test('propiedad: un texto sin * ni _ sale tal cual', () => {
    fc.assert(
      fc.property(fc.string().filter((s) => !/[*_]/.test(s)), (texto) => {
        expect(plano(nodos(texto))).toBe(texto)
        expect(analizar(texto).sinCerrar).toEqual([])
      }),
    )
  })

  test('propiedad: nunca se pierde ni se inventa texto que no sea un símbolo de marca', () => {
    fc.assert(
      fc.property(fc.string(), (texto) => {
        const sinSimbolos = (s: string) => s.replace(/\*\*|_/g, '')
        expect(sinSimbolos(plano(nodos(texto)))).toBe(sinSimbolos(texto))
      }),
    )
  })
})

describe('sin cerrar', () => {
  test('una negrita sin cerrar se queda como texto y se avisa', () => {
    expect(analizar('esto es **clave')).toEqual({ nodos: ['esto es **clave'], sinCerrar: ['**'] })
    expect(errorDeMarcas('esto es **clave')).toBe('Hay una negrita (**) sin cerrar')
  })

  test('una cursiva sin cerrar dentro de una negrita: se avisa de las dos', () => {
    expect(analizar('**muy _importante**').sinCerrar).toEqual(['**', '_'])
    expect(errorDeMarcas('**muy _importante**')).toBe('Hay una negrita (**) y una cursiva (_) sin cerrar')
  })

  test('lo que había dentro de la marca abierta se conserva, también lo marcado', () => {
    expect(nodos('**abierta _y cerrada_ ahí')).toEqual([
      '**abierta ',
      { marca: 'em', hijos: ['y cerrada'] },
      ' ahí',
    ])
  })

  test('cerrar con espacio delante no cierra', () => {
    expect(analizar('**hola **').sinCerrar).toEqual(['**'])
  })
})
