/**
 * `ejecutar`, la envoltura de toda Server Action con sesión.
 *
 * Aquí se prueba lo que añade el límite de peticiones (OWASP API4): un usuario
 * que pasa de `LIMITE_ACCIONES` deja de llegar a la base, se le dice que espere
 * y queda un evento de seguridad; y su límite no toca al de otro usuario.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'

const h = vi.hoisted(() => ({ userId: 'u-a' as string | null }))

vi.mock('@/lib/auth', () => ({
  getSession: async () =>
    h.userId ? { user: { id: h.userId, email: null, esInvitado: true, entroConPassword: false } } : null,
}))

import { LIMITE_ACCIONES, reiniciarLimites } from '@/lib/limite'
import { DEMASIADAS_PETICIONES, ejecutar, NO_AUTORIZADO } from '../resultado'

beforeEach(() => {
  reiniciarLimites()
  h.userId = 'u-a'
})

describe('ejecutar', () => {
  test('sin sesión no ejecuta nada', async () => {
    h.userId = null
    const operacion = vi.fn()
    expect(await ejecutar('prueba', operacion)).toEqual({ ok: false, error: NO_AUTORIZADO })
    expect(operacion).not.toHaveBeenCalled()
  })

  test('pasado el límite por usuario deja de ejecutar y registra el bloqueo', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const operacion = vi.fn(async () => 1)

    for (let i = 0; i < LIMITE_ACCIONES.maximo; i++) await ejecutar('prueba', operacion)
    const r = await ejecutar('prueba', operacion)

    expect(r).toEqual({ ok: false, error: DEMASIADAS_PETICIONES })
    expect(operacion).toHaveBeenCalledTimes(LIMITE_ACCIONES.maximo)
    const evento = JSON.parse(String(aviso.mock.calls.at(-1)?.[0]))
    expect(evento).toMatchObject({ evento: 'limite', resultado: 'bloqueo', userId: 'u-a', contexto: 'prueba' })
  })

  test('el límite de un usuario no frena a otro', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (let i = 0; i <= LIMITE_ACCIONES.maximo; i++) await ejecutar('prueba', async () => 1)
    h.userId = 'u-b'
    expect(await ejecutar('prueba', async () => 1)).toEqual({ ok: true, data: 1 })
  })
})
