/**
 * El contenido de un nivel viaja al navegador ilegible a simple vista: las
 * soluciones no se leen en la pestaña de red. NO es cifrado (la clave viaja al
 * lado); lo que importa aquí es que vuelva idéntico y que no se lea nada.
 */

import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { claveNueva, ocultar, revelar } from '../ocultar'

describe('ocultar / revelar', () => {
  test('vuelve exactamente lo que entró, sea el JSON que sea', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (valor) => {
        const clave = claveNueva()
        expect(revelar(ocultar(valor, clave), clave)).toEqual(JSON.parse(JSON.stringify(valor)))
      }),
    )
  })

  test('con tildes, eñes y emojis', () => {
    const valor = { texto: 'Ahorro: ¿cuánto? 😀 ñandú', correcta: 2 }
    const clave = claveNueva()
    expect(revelar(ocultar(valor, clave), clave)).toEqual(valor)
  })

  test('no se lee nada del original', () => {
    const bloque = ocultar({ opciones: ['Depósito a plazo', 'Fondo indexado'], correcta: 1 }, claveNueva())
    for (const trozo of ['Depósito', 'Dep', 'Fondo', 'correcta', 'opciones', '"']) {
      expect(bloque).not.toContain(trozo)
    }
  })

  test('cada visita sale distinta: la clave es nueva cada vez', () => {
    const a = claveNueva()
    const b = claveNueva()
    expect(a).not.toBe(b)
    expect(ocultar({ x: 1 }, a)).not.toBe(ocultar({ x: 1 }, b))
  })

  test('con otra clave no sale el original', () => {
    const valor = { correcta: 'la buena' }
    const bloque = ocultar(valor, claveNueva())
    expect(() => revelar(bloque, claveNueva())).toThrow()
  })

  test('una clave vacía no se acepta', () => {
    expect(() => ocultar({}, '')).toThrow()
    expect(() => revelar('', '')).toThrow()
  })
})
