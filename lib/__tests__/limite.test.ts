/**
 * El limitador de peticiones (OWASP API4 y API6).
 *
 * Lo que se prueba es el contrato que sostiene la seguridad: pasado el máximo
 * dentro de la ventana se deniega, la ventana se abre otra vez al caducar, las
 * claves no se pisan entre sí y la memoria no crece sin tope aunque alguien
 * invente una clave por petición.
 */

import { beforeEach, describe, expect, test } from 'vitest'
import { claveSegura, consumir, MAX_CLAVES, reiniciarLimites, type Regla } from '../limite'

const REGLA: Regla = { nombre: 'prueba', maximo: 3, ventanaMs: 1000 }

beforeEach(() => reiniciarLimites())

describe('consumir', () => {
  test('deja pasar hasta el máximo y deniega el siguiente', () => {
    const r = [1, 2, 3, 4].map(() => consumir(REGLA, 'a', 0))
    expect(r.map((x) => x.permitido)).toEqual([true, true, true, false])
  })

  test('dice cuánto falta para volver a intentarlo', () => {
    for (let i = 0; i < 3; i++) consumir(REGLA, 'a', 100)
    expect(consumir(REGLA, 'a', 400)).toEqual({ permitido: false, reintentarEnMs: 700 })
  })

  test('al caducar la ventana vuelve a contar desde cero', () => {
    for (let i = 0; i < 4; i++) consumir(REGLA, 'a', 0)
    expect(consumir(REGLA, 'a', 1000).permitido).toBe(true)
  })

  test('cada clave lleva su propia cuenta', () => {
    for (let i = 0; i < 3; i++) consumir(REGLA, 'a', 0)
    expect(consumir(REGLA, 'a', 0).permitido).toBe(false)
    expect(consumir(REGLA, 'b', 0).permitido).toBe(true)
  })

  test('la misma clave en dos reglas no comparte cuenta', () => {
    const otra: Regla = { ...REGLA, nombre: 'otra' }
    for (let i = 0; i < 3; i++) consumir(REGLA, 'a', 0)
    expect(consumir(otra, 'a', 0).permitido).toBe(true)
  })

  test('la memoria tiene tope: con más claves que el máximo, se olvidan las más viejas', () => {
    for (let i = 0; i <= MAX_CLAVES; i++) consumir(REGLA, `k${i}`, 0)
    // Al entrar la clave MAX_CLAVES + 1 se ha olvidado la primera: vuelve a
    // empezar su cuenta, que es lo menos malo (el tope protege la memoria).
    for (let i = 0; i < 3; i++) expect(consumir(REGLA, 'k0', 0).permitido).toBe(true)
  })

  test('al llenarse, primero barre las ventanas caducadas', () => {
    for (let i = 0; i < MAX_CLAVES; i++) consumir(REGLA, `k${i}`, 0)
    for (let i = 0; i < 3; i++) consumir(REGLA, 'viva', 5000)
    // Entra una nueva cuando todas las k* han caducado: se barren ellas, no "viva".
    consumir(REGLA, 'nueva', 5000)
    expect(consumir(REGLA, 'viva', 5000).permitido).toBe(false)
  })

  test('usa el reloj si no se le pasa', () => {
    expect(consumir(REGLA, 'a').permitido).toBe(true)
  })
})

describe('claveSegura', () => {
  test('una clave larga se acorta sin dejar de distinguirse', () => {
    const a = claveSegura('x'.repeat(5000))
    const b = claveSegura('x'.repeat(4999) + 'y')
    expect(a.length).toBeLessThanOrEqual(64)
    expect(a).not.toBe(b)
  })

  test('es estable y no distingue mayúsculas (un email es el mismo con o sin ellas)', () => {
    expect(claveSegura('Pepito@Example.com')).toBe(claveSegura('pepito@example.com'))
  })
})
