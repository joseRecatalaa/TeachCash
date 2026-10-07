import { afterEach, describe, expect, test, vi } from 'vitest'
import { uuid } from '../ids'

/**
 * `uuid()` genera la clave de idempotencia de cada formulario: la que impide que
 * un doble clic cree dos movimientos. Node siempre tiene `crypto.randomUUID`,
 * así que el camino de repuesto (navegadores sin contexto seguro, como el `dev`
 * abierto por IP) solo se ejecuta si se le quita a propósito.
 */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => vi.unstubAllGlobals())

describe('uuid', () => {
  test('con randomUUID, devuelve un UUID v4', () => {
    expect(uuid()).toMatch(UUID_V4)
  })

  test('sin randomUUID, el repuesto marca versión y variante', () => {
    // Arrange: un crypto que solo tiene getRandomValues, y que devuelve todos
    // los bits a 1 — el peor caso para los marcadores de versión y variante.
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(0xff),
    })

    // Act
    const id = uuid()

    // Assert: sin las máscaras saldría "ffffffff-ffff-ffff-ffff-…", que tiene
    // forma de UUID pero no es un v4.
    expect(id).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff')
    expect(id).toMatch(UUID_V4)
  })

  test('dos llamadas no repiten', () => {
    expect(uuid()).not.toBe(uuid())
  })
})
