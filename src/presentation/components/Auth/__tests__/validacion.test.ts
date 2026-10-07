/**
 * La comprobación de email de los formularios de auth. Es cortesía (quien
 * valida de verdad es `auth.actions.ts`), pero corre en el navegador con cada
 * tecla, así que no puede ser una expresión regular con retroceso cuadrático.
 */

import { describe, expect, test } from 'vitest'
import { validarEmail } from '../validacion'

const MENSAJE = 'Escribe un email válido'

describe('validarEmail', () => {
  test.each(['ana@example.com', '  ana@example.com  ', 'a.b+c@sub.dominio.es'])(
    'acepta %j',
    (email) => {
      expect(validarEmail(email)).toBeNull()
    },
  )

  test.each(['', 'ana', 'ana@', '@example.com', 'ana@example', 'ana@example.', 'ana @example.com', 'ana@.com'])(
    'rechaza %j',
    (email) => {
      expect(validarEmail(email)).toBe(MENSAJE)
    },
  )

  test('un texto enorme y sin arroba se resuelve en tiempo lineal', () => {
    // Con /^\S+@\S+\.\S+$/, una cadena así obliga al motor a probar cada
    // reparto posible de los \S+ antes de rendirse.
    const hostil = 'a'.repeat(50_000) + '@' + 'a'.repeat(50_000)
    const inicio = performance.now()
    expect(validarEmail(hostil)).toBe(MENSAJE)
    expect(performance.now() - inicio).toBeLessThan(100)
  })
})
