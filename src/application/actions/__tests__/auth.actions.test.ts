/**
 * Server Actions de autenticación.
 *
 * Supabase Auth se sustituye por un doble (no se le puede pedir a un test que
 * resuelva un CAPTCHA). La base sí es real: crear un invitado le da su catálogo
 * de categorías, y su fecha de caducidad sale de `auth.users`.
 *
 * Lo que importa probar aquí no es que Supabase funcione, sino lo que hace
 * ESTE código alrededor: que no revele si un email existe, que no cree
 * invitados para bots, que valide antes de llamar y que convierta al invitado
 * en cuenta SOBRE el mismo usuario.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

type ErrorAuth = { code: string; message: string } | null

const h = vi.hoisted(() => ({
  db: null as unknown as import('@/db/client').Database,
  session: null as null | { user: { id: string; email: string | null; esInvitado: boolean } },
  cabeceras: new Map<string, string>(),
  auth: {} as Record<string, ReturnType<typeof vi.fn>>,
}))

vi.mock('@/db', async () => {
  const schema = await import('@/db/schema')
  return {
    ...schema,
    get db() {
      return h.db
    },
  }
})
vi.mock('@/lib/auth', () => ({ getSession: async () => h.session }))
vi.mock('@/lib/supabase/server', () => ({ crearClienteSupabase: async () => ({ auth: h.auth }) }))
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => h.cabeceras.get(k.toLowerCase()) ?? null }),
}))

import { createTestDb, crearUsuario, USER_A, type TestDb } from '@/db/testing'
import { categories } from '@/db/schema'
import {
  cambiarPassword,
  getCuenta,
  iniciarInvitado,
  iniciarSesion,
  registrarse,
  solicitarRecuperacion,
} from '../auth.actions'

const INVITADO = '00000000-0000-4000-8000-0000000000c1'
const NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36'
const error = (code: string): ErrorAuth => ({ code, message: code })

let ctx: TestDb

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
  h.session = null
  h.cabeceras = new Map([
    ['user-agent', NAVEGADOR],
    ['origin', 'http://localhost:3000'],
  ])
  h.auth = {
    signInAnonymously: vi.fn(async () => ({ data: { user: { id: INVITADO } }, error: null })),
    signInWithPassword: vi.fn(async () => ({
      data: { user: { email: 'ana@example.com' } },
      error: null,
    })),
    signUp: vi.fn(async () => ({ data: {}, error: null })),
    updateUser: vi.fn(async () => ({ data: {}, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(async () => {
  vi.restoreAllMocks()
  await ctx.close()
})

describe('invitado', () => {
  test('crea la sesión anónima con el token del CAPTCHA y le da su catálogo', async () => {
    // Supabase da de alta el usuario en auth.users; aquí lo hace el test.
    await crearUsuario(ctx.pg, INVITADO, { anonimo: true })

    const r = await iniciarInvitado('token-ok')

    expect(h.auth.signInAnonymously).toHaveBeenCalledWith({
      options: { captchaToken: 'token-ok' },
    })
    expect(r.ok && r.data.tipo).toBe('invitado')
    const cats = await ctx.db.select().from(categories).where(eq(categories.userId, INVITADO))
    expect(cats).toHaveLength(17)
  })

  test('caduca a los 4 días de su alta', async () => {
    await crearUsuario(ctx.pg, INVITADO, { anonimo: true })
    await ctx.pg.query(`update auth.users set created_at = '2026-10-01T10:00:00Z' where id = $1`, [
      INVITADO,
    ])
    h.session = { user: { id: INVITADO, email: null, esInvitado: true } }

    const r = await getCuenta()
    expect(r).toEqual({ ok: true, data: { tipo: 'invitado', caducaEl: '2026-10-05T10:00:00.000Z' } })
  })

  test('con sesión ya abierta no crea otro invitado', async () => {
    h.session = { user: { id: USER_A, email: 'ana@example.com', esInvitado: false } }
    const r = await iniciarInvitado('token-ok')
    expect(r).toEqual({ ok: true, data: { tipo: 'usuario', email: 'ana@example.com' } })
    expect(h.auth.signInAnonymously).not.toHaveBeenCalled()
  })

  test.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 HeadlessChrome/140.0',
    '',
  ])('no crea invitados para bots (%s)', async (agente) => {
    h.cabeceras.set('user-agent', agente)
    const r = await iniciarInvitado('token-ok')
    expect(r.ok).toBe(false)
    expect(h.auth.signInAnonymously).not.toHaveBeenCalled()
  })

  test('sin token de CAPTCHA no llama a Supabase', async () => {
    const r = await iniciarInvitado('')
    expect(r.ok).toBe(false)
    expect(h.auth.signInAnonymously).not.toHaveBeenCalled()
  })
})

describe('iniciar sesión', () => {
  const datos = { email: ' Ana@Example.com ', password: 'x', captchaToken: 't' }

  test('normaliza el email y pasa el CAPTCHA', async () => {
    const r = await iniciarSesion(datos)
    expect(r).toEqual({ ok: true, data: { tipo: 'usuario', email: 'ana@example.com' } })
    expect(h.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: 'x',
      options: { captchaToken: 't' },
    })
  })

  test('credenciales malas: un mensaje que no dice cuál de las dos falla', async () => {
    h.auth.signInWithPassword.mockResolvedValue({ data: {}, error: error('invalid_credentials') })
    const r = await iniciarSesion(datos)
    expect(r).toEqual({ ok: false, error: 'Email o contraseña incorrectos' })
  })

  test('un email mal escrito no llega a Supabase', async () => {
    const r = await iniciarSesion({ ...datos, email: 'no-es-un-email' })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.fieldErrors?.email).toBeTruthy()
    expect(h.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  test('un fallo desconocido no filtra el mensaje interno', async () => {
    h.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'unexpected_failure', message: 'db connection refused at 10.0.0.3' },
    })
    const r = await iniciarSesion(datos)
    expect(r).toEqual({ ok: false, error: 'Se ha producido un error inesperado' })
  })
})

describe('crear cuenta', () => {
  test('siendo invitado, la cuenta se crea SOBRE el invitado (mismo usuario)', async () => {
    h.session = { user: { id: INVITADO, email: null, esInvitado: true } }
    const r = await registrarse({ email: 'ana@example.com', captchaToken: 't' })

    expect(r.ok).toBe(true)
    expect(h.auth.updateUser).toHaveBeenCalledWith(
      { email: 'ana@example.com' },
      { emailRedirectTo: 'http://localhost:3000/auth/confirm?next=/CambiarPassword' },
    )
    expect(h.auth.signUp).not.toHaveBeenCalled()
  })

  test('un email ya registrado responde igual que uno nuevo', async () => {
    h.session = { user: { id: INVITADO, email: null, esInvitado: true } }
    h.auth.updateUser.mockResolvedValue({ data: {}, error: error('email_exists') })
    const existe = await registrarse({ email: 'ya@example.com', captchaToken: 't' })

    h.auth.updateUser.mockResolvedValue({ data: {}, error: null })
    const nuevo = await registrarse({ email: 'nuevo@example.com', captchaToken: 't' })

    expect(existe).toEqual(nuevo)
  })

  test('con una cuenta ya iniciada no se puede crear otra encima', async () => {
    h.session = { user: { id: USER_A, email: 'ana@example.com', esInvitado: false } }
    const r = await registrarse({ email: 'otra@example.com', captchaToken: 't' })
    expect(r.ok).toBe(false)
    expect(h.auth.updateUser).not.toHaveBeenCalled()
  })
})

describe('recuperar contraseña', () => {
  test('responde lo mismo exista o no la cuenta', async () => {
    const ok = await solicitarRecuperacion({ email: 'ana@example.com', captchaToken: 't' })
    h.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: error('user_not_found') })
    const noExiste = await solicitarRecuperacion({ email: 'nadie@example.com', captchaToken: 't' })
    expect(noExiste).toEqual(ok)
  })

  test('el enlace vuelve a la página de cambiar contraseña', async () => {
    await solicitarRecuperacion({ email: 'ana@example.com', captchaToken: 't' })
    expect(h.auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@example.com', {
      redirectTo: 'http://localhost:3000/auth/confirm?next=/CambiarPassword',
      captchaToken: 't',
    })
  })
})

describe('cambiar contraseña', () => {
  const valida = { password: 'Segura#2026x', repetir: 'Segura#2026x' }

  test('un invitado no puede (primero tiene que confirmar un email)', async () => {
    h.session = { user: { id: INVITADO, email: null, esInvitado: true } }
    expect((await cambiarPassword(valida)).ok).toBe(false)
    expect(h.auth.updateUser).not.toHaveBeenCalled()
  })

  test('sin sesión, tampoco', async () => {
    expect(await cambiarPassword(valida)).toEqual({ ok: false, error: 'No autorizado' })
  })

  test('aplica la política de contraseñas antes de llamar', async () => {
    h.session = { user: { id: USER_A, email: 'ana@example.com', esInvitado: false } }
    const r = await cambiarPassword({ password: 'corta', repetir: 'corta' })
    expect(!r.ok && r.fieldErrors?.password).toBeTruthy()
    expect(h.auth.updateUser).not.toHaveBeenCalled()
  })

  test('las dos tienen que coincidir', async () => {
    h.session = { user: { id: USER_A, email: 'ana@example.com', esInvitado: false } }
    const r = await cambiarPassword({ ...valida, repetir: 'Otra#2026xx' })
    expect(!r.ok && r.fieldErrors?.repetir).toBe('Las contraseñas no coinciden')
  })

  test('con todo bien, la guarda', async () => {
    h.session = { user: { id: USER_A, email: 'ana@example.com', esInvitado: false } }
    const r = await cambiarPassword(valida)
    expect(r).toEqual({ ok: true, data: { tipo: 'usuario', email: 'ana@example.com' } })
    expect(h.auth.updateUser).toHaveBeenCalledWith({ password: 'Segura#2026x' })
  })
})
