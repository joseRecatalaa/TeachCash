/**
 * `getSession` traduce los claims del JWT VERIFICADO a la sesión de la app.
 * Supabase se sustituye: lo que se prueba es la traducción, no la criptografía.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'

const h = vi.hoisted(() => ({
  respuesta: { data: null, error: null } as {
    data: { claims: Record<string, unknown> } | null
    error: unknown
  },
}))

vi.mock('../supabase/server', () => ({
  crearClienteSupabase: async () => ({ auth: { getClaims: async () => h.respuesta } }),
}))

import { getSession, requireUserId } from '../auth'

const UID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  h.respuesta = { data: null, error: null }
})

describe('getSession', () => {
  test('sin token no hay sesión', async () => {
    expect(await getSession()).toBeNull()
    await expect(requireUserId()).rejects.toThrow('No autorizado')
  })

  test('un token que no verifica no da sesión', async () => {
    h.respuesta = { data: null, error: new Error('invalid JWT') }
    expect(await getSession()).toBeNull()
  })

  test('un usuario con email', async () => {
    h.respuesta = { data: { claims: { sub: UID, email: 'ana@example.com', is_anonymous: false } }, error: null }
    expect(await getSession()).toEqual({
      user: { id: UID, email: 'ana@example.com', esInvitado: false, entroConPassword: false },
    })
  })

  test('un invitado: sin email y marcado como invitado', async () => {
    h.respuesta = { data: { claims: { sub: UID, email: '', is_anonymous: true } }, error: null }
    expect(await getSession()).toEqual({
      user: { id: UID, email: null, esInvitado: true, entroConPassword: false },
    })
  })

  test('el userId es el `sub` del token, nada más', async () => {
    h.respuesta = { data: { claims: { sub: UID, user_id: 'otro' } }, error: null }
    expect(await requireUserId()).toBe(UID)
  })
})

describe('cómo se abrió la sesión (claim `amr`)', () => {
  // Decide si cambiar la contraseña exige la actual: quien entró con ella la
  // sabe; quien llegó desde el enlace de recuperación o de alta, no. El claim
  // va dentro del JWT firmado, así que no se puede falsificar desde la cookie.
  const conAmr = async (amr: unknown) => {
    h.respuesta = { data: { claims: { sub: UID, email: 'ana@example.com', amr } }, error: null }
    return (await getSession())?.user.entroConPassword
  }

  test('con contraseña', async () => {
    expect(await conAmr([{ method: 'password', timestamp: 1_800_000_000 }])).toBe(true)
  })

  test.each(['recovery', 'otp', 'email/signup', 'email_change', 'magiclink', 'anonymous'])(
    'desde un enlace o sin contraseña (%s)',
    async (method) => {
      expect(await conAmr([{ method, timestamp: 1_800_000_000 }])).toBe(false)
    },
  )

  test('manda el método MÁS RECIENTE, no el primero de la lista', async () => {
    expect(
      await conAmr([
        { method: 'password', timestamp: 100 },
        { method: 'recovery', timestamp: 200 },
      ]),
    ).toBe(false)
    expect(
      await conAmr([
        { method: 'recovery', timestamp: 100 },
        { method: 'password', timestamp: 200 },
      ]),
    ).toBe(true)
  })

  test('también en el formato RFC 8176 (lista de cadenas)', async () => {
    expect(await conAmr(['password'])).toBe(true)
    expect(await conAmr(['otp'])).toBe(false)
  })

  test.each([undefined, null, [], 'password', [{}], [{ method: 42 }]])(
    'un amr ausente o raro (%j) no cuenta como contraseña',
    async (amr) => {
      expect(await conAmr(amr)).toBe(false)
    },
  )
})
