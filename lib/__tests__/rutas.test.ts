import { describe, expect, test } from 'vitest'
import { rutaInterna } from '../rutas'

describe('rutaInterna', () => {
  test.each(['/', '/Movimientos', '/CambiarPassword', '/Movimientos/Edit?id=abc'])(
    'acepta la ruta propia %s',
    (ruta) => {
      expect(rutaInterna(ruta)).toBe(ruta)
    },
  )

  test.each([
    'https://banco-falso.com',
    '//banco-falso.com',
    '/\\banco-falso.com',
    'javascript:alert(1)',
    'Movimientos',
    '/ok\r\nSet-Cookie: x=1',
  ])('rechaza %s y cae a la portada', (destino) => {
    expect(rutaInterna(destino)).toBe('/')
  })

  test('sin destino, la portada (o el que se diga)', () => {
    expect(rutaInterna(null)).toBe('/')
    expect(rutaInterna('', '/Login')).toBe('/Login')
  })
})
