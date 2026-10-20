import { describe, expect, test } from 'vitest'
import fc from 'fast-check'
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

describe('propiedad: nunca sale del sitio', () => {
  test('para CUALQUIER entrada, el resultado es una ruta de este dominio', () => {
    // Los casos de arriba son los ataques que se nos ocurrieron; esto prueba los
    // que no. La garantía: empieza por "/", no por "//" ni por "/\", y no lleva
    // caracteres de control.
    const entradas = fc.oneof(
      fc.string(),
      fc.webUrl(),
      fc.string().map((s) => `/${s}`),
      fc.constantFrom('//', '/\\', '/\n', '/\t//evil.com'),
    )
    fc.assert(
      fc.property(entradas, (entrada) => {
        const ruta = rutaInterna(entrada)
        expect(ruta.startsWith('/')).toBe(true)
        expect(ruta.startsWith('//')).toBe(false)
        expect(ruta.startsWith('/\\')).toBe(false)
        expect(/[\u0000-\u001f\u007f]/.test(ruta)).toBe(false)
      }),
      { numRuns: 500 },
    )
  })
})
