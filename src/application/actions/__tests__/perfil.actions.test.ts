/**
 * Server Actions del perfil.
 *
 * Lo que se comprueba es la frontera: sin sesión no se lee ni se escribe, el
 * perfil es el del usuario de la sesión y un valor mal formado vuelve como
 * error del campo, no como excepción. Las reglas del importe las prueba
 * `perfiles.repository.test.ts`.
 */

import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/lib/auth', async () => (await import('@/test/mocks/auth')).authMock())

import { harness, usarBaseDeTest } from '@/test/harness'
import { getPatrimonioInicial } from '@/src/infrastructure/repositories/perfiles.repository'
import { USER_A, USER_B } from '@/src/infrastructure/repositories/__tests__/helpers'
import { fetchPatrimonioInicial, guardarPatrimonioInicial } from '../perfil.actions'

usarBaseDeTest()

describe('sesión', () => {
  test.each([
    ['fetchPatrimonioInicial', () => fetchPatrimonioInicial()],
    ['guardarPatrimonioInicial', () => guardarPatrimonioInicial({ patrimonioInicial: 1000 })],
  ])('%s sin sesión no hace nada', async (_nombre, llamar) => {
    harness.userId = null
    expect(await llamar()).toEqual({ ok: false, error: 'No autorizado' })
    expect(await getPatrimonioInicial(USER_A)).toBeNull()
  })
})

describe('el perfil es el de la sesión', () => {
  test('guarda en el usuario de la sesión y lo lee de vuelta', async () => {
    harness.userId = USER_B
    expect(await guardarPatrimonioInicial({ patrimonioInicial: 5000 })).toEqual({
      ok: true,
      data: 5000,
    })
    expect(await fetchPatrimonioInicial()).toEqual({ ok: true, data: 5000 })

    harness.userId = USER_A
    expect(await fetchPatrimonioInicial()).toEqual({ ok: true, data: null })
  })
})

describe('errores', () => {
  test('un importe mal formado vuelve como error del campo', async () => {
    const r = await guardarPatrimonioInicial({ patrimonioInicial: 'mucho' })
    expect(r).toEqual({
      ok: false,
      error: 'Revisa el importe',
      fieldErrors: { patrimonioInicial: expect.any(String) },
    })
  })
})
