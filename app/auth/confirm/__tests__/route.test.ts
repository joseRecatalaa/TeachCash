/**
 * El destino de los enlaces de email.
 *
 * Es el único endpoint HTTP de la aplicación y llega desde fuera —un enlace en
 * un correo que cualquiera puede fabricar—, así que lo que se prueba es lo que
 * hace con una entrada hostil: un `next` que intenta salir del sitio, un `type`
 * inventado, un enlace incompleto. Supabase se sustituye por un doble; la base
 * es real, porque confirmar una cuenta le crea su catálogo.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/lib/supabase/server', () => ({ crearClienteSupabase: async () => ({ auth }) }))

import { eq } from 'drizzle-orm'
import { categories } from '@/db/schema'
import { usarBaseDeTest } from '@/test/harness'
import { USER_A } from '@/src/infrastructure/repositories/__tests__/helpers'
import { GET } from '../route'

const base = usarBaseDeTest()

const pedir = (query: string) => GET(new NextRequest(`https://teachcash.example.com/auth/confirm?${query}`))
const usuario = { data: { user: { id: USER_A } }, error: null }
const fallo = { data: { user: null }, error: new Error('Token has expired') }

beforeEach(() => {
  auth.exchangeCodeForSession.mockResolvedValue(usuario)
  auth.verifyOtp.mockResolvedValue(usuario)
})

describe('enlace válido', () => {
  test('con `code` (plantillas por defecto) entra y va al destino pedido', async () => {
    const r = await pedir('code=abc&next=/CambiarPassword')

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc')
    expect(r.headers.get('location')).toBe('https://teachcash.example.com/CambiarPassword')
  })

  test('un `token_hash` NO abre sesión, aunque el tipo sea válido (login CSRF)', async () => {
    // Un `token_hash` no está ligado al navegador que pidió el enlace: un
    // atacante podría mandar el SUYO y dejar a la víctima dentro de la cuenta
    // del atacante, anotando allí sus finanzas. Hasta que haya SMTP propio y una
    // página que confirme antes de cambiar de sesión, no se acepta.
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r = await pedir('token_hash=h1&type=recovery&next=/CambiarPassword')

    expect(auth.verifyOtp).not.toHaveBeenCalled()
    expect(r.headers.get('location')).toBe('https://teachcash.example.com/Login?enlace=invalido')
  })

  test('una cuenta recién confirmada recibe su catálogo de categorías', async () => {
    await pedir('code=abc')
    const cats = await base().db.select().from(categories).where(eq(categories.userId, USER_A))
    expect(cats.length).toBeGreaterThan(0)
  })
})

describe('entrada hostil', () => {
  test.each([
    'https://banco-falso.com',
    '//banco-falso.com',
    '/\\banco-falso.com',
    'javascript:alert(1)',
  ])('un `next` externo (%s) acaba en la portada, no fuera', async (next) => {
    const r = await pedir(`code=abc&next=${encodeURIComponent(next)}`)
    expect(r.headers.get('location')).toBe('https://teachcash.example.com/')
  })

  test('un `type` que no está en la lista no llega a Supabase', async () => {
    const r = await pedir('token_hash=h1&type=magiclink_admin')

    expect(auth.verifyOtp).not.toHaveBeenCalled()
    expect(r.headers.get('location')).toBe('https://teachcash.example.com/Login?enlace=invalido')
  })

  test('sin `code` ni `token_hash`, enlace inválido', async () => {
    const r = await pedir('next=/Movimientos')
    expect(r.headers.get('location')).toBe('https://teachcash.example.com/Login?enlace=invalido')
  })

  test('un enlace caducado no dice por qué falló', async () => {
    auth.exchangeCodeForSession.mockResolvedValue(fallo)

    const r = await pedir('code=viejo')

    // El motivo («Token has expired») le sirve a quien prueba enlaces, no a
    // quien lo lee: no viaja en la URL.
    const destino = r.headers.get('location') ?? ''
    expect(destino).toBe('https://teachcash.example.com/Login?enlace=invalido')
    expect(destino).not.toMatch(/expired/i)
  })
})

describe('endurecimiento (docs/SECURITY.md)', () => {
  test.each([
    ['válido', 'code=abc'],
    ['caducado', 'code=caducado'],
  ])('la redirección de un enlace %s no se queda en ninguna caché (lleva la cookie de sesión)', async (_caso, query) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    if (query.includes('caducado')) auth.exchangeCodeForSession.mockResolvedValue(fallo)
    const r = await pedir(query)
    expect(r.headers.get('cache-control')).toBe('no-store')
  })

  test('canjear un enlace deja un evento de seguridad, bueno o malo', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await pedir('code=abc')
    auth.exchangeCodeForSession.mockResolvedValue(fallo)
    await pedir('code=caducado')

    const eventos = aviso.mock.calls.map((c) => JSON.parse(String(c[0])))
    expect(eventos.map((e) => [e.evento, e.resultado, e.userId])).toEqual([
      ['enlace_email', 'ok', USER_A],
      ['enlace_email', 'fallo', undefined],
    ])
  })
})
