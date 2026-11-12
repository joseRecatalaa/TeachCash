/**
 * De qué cabecera sale la IP que usan los límites. La que pone el proxy de
 * despliegue (`x-real-ip`) manda sobre la cadena que trae la petición.
 */

import { describe, expect, test } from 'vitest'
import { ipDe } from '../ip'

const cabeceras = (c: Record<string, string>) => new Headers(c)

describe('ipDe', () => {
  test('x-real-ip primero', () => {
    expect(ipDe(cabeceras({ 'x-real-ip': ' ip-real ', 'x-forwarded-for': 'ip-cadena' }))).toBe('ip-real')
  })

  test('si no, la primera de x-forwarded-for', () => {
    expect(ipDe(cabeceras({ 'x-forwarded-for': 'ip-cliente, ip-intermedio' }))).toBe('ip-cliente')
  })

  test('sin ninguna, "desconocida" (y todas cuentan juntas)', () => {
    expect(ipDe(cabeceras({}))).toBe('desconocida')
    expect(ipDe(cabeceras({ 'x-forwarded-for': ' ' }))).toBe('desconocida')
  })
})
