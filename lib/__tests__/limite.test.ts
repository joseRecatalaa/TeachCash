/**
 * El limitador de peticiones (OWASP API4 y API6).
 *
 * Lo que se prueba es el contrato que sostiene la seguridad: pasado el máximo
 * dentro de la ventana se deniega, la ventana se abre otra vez al caducar, las
 * claves no se pisan entre sí y la memoria no crece sin tope aunque alguien
 * invente una clave por petición.
 */

import { beforeEach, describe, expect, test } from 'vitest'
import { claveSegura, clavesVivas, consumir, MAX_CLAVES, reiniciarLimites, type Regla } from '../limite'

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

  test('la memoria tiene tope: lleno de claves nuevas, se olvidan las de menos cuenta', () => {
    for (let i = 0; i <= MAX_CLAVES; i++) consumir(REGLA, `k${i}`, 0)
    // Todas llevan 1: al entrar la MAX_CLAVES + 1 se ha olvidado alguna, y la
    // memoria no pasa del tope.
    expect(clavesVivas(REGLA)).toBeLessThanOrEqual(MAX_CLAVES)
  })

  test('al llenarse, primero barre las ventanas caducadas', () => {
    for (let i = 0; i < MAX_CLAVES; i++) consumir(REGLA, `k${i}`, 0)
    for (let i = 0; i < 3; i++) consumir(REGLA, 'viva', 5000)
    // Entra una nueva cuando todas las k* han caducado: se barren ellas, no "viva".
    consumir(REGLA, 'nueva', 5000)
    expect(consumir(REGLA, 'viva', 5000).permitido).toBe(false)
  })

  test('llenar la memoria de claves nuevas NO desbloquea una clave bloqueada', () => {
    for (let i = 0; i < 3; i++) consumir(REGLA, 'victima', 0)
    expect(consumir(REGLA, 'victima', 0).permitido).toBe(false)
    for (let i = 0; i < 3 * MAX_CLAVES; i++) consumir(REGLA, `basura${i}`, 0)
    expect(consumir(REGLA, 'victima', 0).permitido).toBe(false)
  })

  test('ni le borra los intentos a quien está a medias', () => {
    consumir(REGLA, 'victima', 0)
    consumir(REGLA, 'victima', 0)
    for (let i = 0; i < 3 * MAX_CLAVES; i++) consumir(REGLA, `basura${i}`, 0)
    expect(consumir(REGLA, 'victima', 0).permitido).toBe(true)
    expect(consumir(REGLA, 'victima', 0).permitido).toBe(false)
  })

  test('las claves de una regla no echan de la memoria a las de otra', () => {
    const otra: Regla = { ...REGLA, nombre: 'otra' }
    consumir(otra, 'a', 0)
    for (let i = 0; i < 3 * MAX_CLAVES; i++) consumir(REGLA, `basura${i}`, 0)
    consumir(otra, 'a', 0)
    consumir(otra, 'a', 0)
    expect(consumir(otra, 'a', 0).permitido).toBe(false)
  })

  test('lleno solo de claves bloqueadas, deja entrar la nueva y la memoria sigue con tope', () => {
    for (let i = 0; i < MAX_CLAVES; i++) {
      for (let j = 0; j < 3; j++) consumir(REGLA, `b${i}`, i % 500)
    }
    expect(consumir(REGLA, 'nueva', 600).permitido).toBe(true)
    expect(clavesVivas(REGLA)).toBeLessThanOrEqual(MAX_CLAVES)
    // Se olvida la que antes iba a caducar (b0, que acaba en 1000), no otra.
    expect(consumir(REGLA, 'b499', 600).permitido).toBe(false)
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

describe('clavesVivas', () => {
  test('de una regla que aún no ha contado nada, ninguna', () => {
    expect(clavesVivas({ ...REGLA, nombre: 'sin-usar' })).toBe(0)
  })
})
