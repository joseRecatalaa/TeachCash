import { describe, expect, it } from 'vitest'
import { construirCsp, generarNonce } from '../csp'

function directiva(csp: string, nombre: string): string | undefined {
  return csp
    .split('; ')
    .find((d) => d.startsWith(`${nombre} `) || d === nombre)
}

describe('generarNonce', () => {
  it('es distinto en cada llamada y tiene 128 bits', () => {
    const nonces = new Set(Array.from({ length: 100 }, generarNonce))
    expect(nonces.size).toBe(100)
    for (const n of nonces) expect(atob(n)).toHaveLength(16)
  })
})

describe('construirCsp', () => {
  const produccion = construirCsp('abc123', { desarrollo: false, https: true })
  const desarrollo = construirCsp('abc123', { desarrollo: true, https: false })

  it('solo deja ejecutar los scripts con el nonce', () => {
    const scripts = directiva(produccion, 'script-src')
    expect(scripts).toContain("'nonce-abc123'")
    expect(scripts).toContain("'strict-dynamic'")
    // Cualquiera de estas dos reabre la puerta a un XSS.
    expect(scripts).not.toContain("'unsafe-inline'")
    expect(scripts).not.toContain("'unsafe-eval'")
  })

  it("'unsafe-eval' solo en desarrollo", () => {
    expect(directiva(desarrollo, 'script-src')).toContain("'unsafe-eval'")
  })

  it('los estilos no llevan nonce: anularía el unsafe-inline que Mantine necesita', () => {
    const estilos = directiva(produccion, 'style-src')
    expect(estilos).toContain("'unsafe-inline'")
    expect(estilos).not.toContain('nonce-')
  })

  it('deja cargar Turnstile y pintar su iframe', () => {
    expect(directiva(produccion, 'frame-src')).toContain('https://challenges.cloudflare.com')
  })

  it('cierra objetos, base, iframes ajenos y formularios a terceros', () => {
    expect(directiva(produccion, 'object-src')).toBe("object-src 'none'")
    expect(directiva(produccion, 'base-uri')).toBe("base-uri 'self'")
    expect(directiva(produccion, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directiva(produccion, 'form-action')).toBe("form-action 'self'")
  })

  it('fuerza https solo si ya se entró por https', () => {
    expect(directiva(produccion, 'upgrade-insecure-requests')).toBeDefined()
    const httpLocal = construirCsp('abc123', { desarrollo: false, https: false })
    expect(directiva(httpLocal, 'upgrade-insecure-requests')).toBeUndefined()
  })
})
