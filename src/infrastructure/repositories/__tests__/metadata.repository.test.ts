/**
 * Las enumeraciones de los formularios.
 *
 * `resource` llega del cliente: se busca en un mapa, y un mapa de JavaScript
 * hereda las claves de `Object.prototype`. La única forma de que "constructor"
 * no devuelva la función `Object` es preguntar por las claves PROPIAS.
 */

import { describe, expect, test, vi } from 'vitest'

// No toca la base, pero importa de movimientos.repository, que arrastra `@/db`.
vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())

import { getFormMetadata } from '../metadata.repository'

const VACIO = { readOnlyFields: [], enumFields: {} }

describe('getFormMetadata', () => {
  test('un recurso conocido trae sus enumeraciones', () => {
    expect(getFormMetadata('Movimientos').enumFields).toHaveProperty('sentido')
  })

  test('un recurso sin metadata es un formulario sin select, no un error', () => {
    expect(getFormMetadata('NoExiste')).toEqual(VACIO)
  })

  test.each(['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'])(
    'una clave del prototipo (%s) no devuelve nada del prototipo',
    (resource) => {
      expect(getFormMetadata(resource)).toEqual(VACIO)
    },
  )
})
