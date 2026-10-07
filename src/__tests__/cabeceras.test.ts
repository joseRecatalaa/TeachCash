/**
 * Las cabeceras de seguridad que pone `next.config.ts` en todas las respuestas.
 *
 * La CSP no está aquí (la pone `proxy.ts` con su nonce, y la prueba
 * `lib/__tests__/csp.test.ts`). Esto comprueba la lista fija: que ninguna se
 * pierda en un refactor de la configuración, que es justo cuando no se mira.
 */

import { describe, expect, test } from 'vitest'
import config from '@/next.config'

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
    ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'],
    // Una ventana abierta desde otra web (window.open) no conserva referencia a
    // la nuestra ni puede manipularla.
    ['Cross-Origin-Opener-Policy', 'same-origin'],
  ])('pone %s en todas las rutas', async (nombre, valor) => {
    expect((await cabeceras()).get(nombre)).toBe(valor)
  })
})
