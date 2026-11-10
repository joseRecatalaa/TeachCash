/**
 * Las cabeceras de seguridad que pone `next.config.ts` en todas las respuestas.
 *
 * La CSP no está aquí (la pone `proxy.ts` con su nonce, y la prueba
 * `lib/__tests__/csp.test.ts`). Esto comprueba la lista fija: que ninguna se
 * pierda en un refactor de la configuración, que es justo cuando no se mira.
 */

import { describe, expect, test } from 'vitest'
import config from '@/next.config'
import { config as configProxy } from '@/proxy'

const cabeceras = async () => {
  const reglas = (await config.headers?.()) ?? []
  const global = reglas.find((r) => r.source === '/:path*')
  return new Map((global?.headers ?? []).map((h) => [h.key, h.value]))
}

describe('next.config.ts', () => {
  test('no anuncia el framework (X-Powered-By)', () => {
    // Decir qué versión de qué servidor corre es darle trabajo hecho a quien
    // busca una vulnerabilidad conocida.
    expect(config.poweredByHeader).toBe(false)
  })

  test.each([
    ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains'],
    ['X-Frame-Options', 'DENY'],
    ['X-Content-Type-Options', 'nosniff'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    [
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    ],
    // Una ventana abierta desde otra web (window.open) no conserva referencia a
    // la nuestra ni puede manipularla.
    ['Cross-Origin-Opener-Policy', 'same-origin'],
    // Otra web no puede incrustar nuestras respuestas (un <img>/<script> que
    // apunte aquí con la cookie puesta): cierra lecturas tipo Spectre.
    ['Cross-Origin-Resource-Policy', 'same-origin'],
    ['X-DNS-Prefetch-Control', 'off'],
    ['X-Permitted-Cross-Domain-Policies', 'none'],
  ])('pone %s en todas las rutas', async (nombre, valor) => {
    expect((await cabeceras()).get(nombre)).toBe(valor)
  })
})

describe('Server Actions', () => {
  test('el cuerpo de una petición tiene un tope por debajo del 1 MB de fábrica (OWASP API4)', () => {
    expect(config.experimental?.serverActions?.bodySizeLimit).toBe('256kb')
  })
})

describe('proxy.ts (CSP con nonce)', () => {
  // El matcher es una expresión de path-to-regexp; para estas rutas basta con
  // leerla como expresión regular entera.
  const cubre = (ruta: string) =>
    configProxy.matcher.some((m) => new RegExp(`^${m}$`).test(ruta))

  test.each(['/', '/Movimientos', '/auth/confirm', '/no-existe.png', '/x.svg'])(
    'pone la CSP en %s (una ruta con extensión de imagen también pinta HTML: el 404)',
    (ruta) => expect(cubre(ruta)).toBe(true),
  )

  test.each(['/_next/static/chunks/a.js', '/_next/image', '/favicon.ico', '/robots.txt', '/icon.svg'])(
    'deja fuera los estáticos (%s)',
    (ruta) => expect(cubre(ruta)).toBe(false),
  )
})
