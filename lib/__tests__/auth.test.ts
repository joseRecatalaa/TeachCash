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
      user: { id: UID, email: 'ana@example.com', esInvitado: false },
    })
  })

  test('un invitado: sin email y marcado como invitado', async () => {
    h.respuesta = { data: { claims: { sub: UID, email: '', is_anonymous: true } }, error: null }
    expect(await getSession()).toEqual({ user: { id: UID, email: null, esInvitado: true } })
  })

  test('el userId es el `sub` del token, nada más', async () => {
    h.respuesta = { data: { claims: { sub: UID, user_id: 'otro' } }, error: null }
    expect(await requireUserId()).toBe(UID)
  })
})
