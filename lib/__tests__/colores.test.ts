import { describe, expect, test } from 'vitest'
import {
  CLAVES_COLOR,
  colorDeCategoria,
  esClaveColor,
  NOMBRE_COLOR,
  washDeCategoria,
} from '../colores'

/**
 * La base guarda la CLAVE del color (`cat-3`), nunca el color. Lo que se
 * comprueba aquí es que una clave que no es de la paleta —un dato viejo, uno
 * escrito a mano por la API REST— no acabe pintado como `var(--sd-lo-que-sea)`,
 * que en CSS no falla: simplemente no pinta nada.
 */
describe('paleta categórica', () => {
  test('son ocho claves, y cada una tiene un nombre para el selector', () => {
    expect(CLAVES_COLOR).toHaveLength(8)
    for (const clave of CLAVES_COLOR) expect(NOMBRE_COLOR[clave]).toEqual(expect.any(String))
  })

  test('solo las claves de la paleta son claves', () => {
    expect(esClaveColor('cat-1')).toBe(true)
    expect(esClaveColor('cat-8')).toBe(true)
    expect(esClaveColor('cat-9')).toBe(false)
    expect(esClaveColor('#ff0000')).toBe(false)
    expect(esClaveColor('')).toBe(false)
  })

  test('una clave válida se traduce a su token', () => {
    expect(colorDeCategoria('cat-3')).toBe('var(--sd-cat-3)')
    expect(washDeCategoria('cat-3')).toBe('var(--sd-cat-3-wash)')
  })

  test('sin clave válida, el color sale del orden y no se inventa un noveno', () => {
    // Los tonos se asignan en orden fijo y no se ciclan generando uno nuevo:
    // la novena categoría sin color vuelve a la primera clave.
    expect(colorDeCategoria(null, 0)).toBe('var(--sd-cat-1)')
    expect(colorDeCategoria(undefined, 7)).toBe('var(--sd-cat-8)')
    expect(colorDeCategoria('rojo', 8)).toBe('var(--sd-cat-1)')
    expect(washDeCategoria(null, 9)).toBe('var(--sd-cat-2-wash)')
  })
})
