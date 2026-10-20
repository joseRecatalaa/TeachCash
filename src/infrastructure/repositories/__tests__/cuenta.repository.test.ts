/**
 * Lo que la app lee y borra de `auth.users`: la fecha de alta (de ella sale la
 * caducidad del invitado), si es invitado (decide su cuota) y el borrado de la
 * cuenta entera.
 */

import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())

import { crearUsuario } from '@/db/testing'
import { usarBaseDeTest } from '@/test/harness'
import { borrarUsuario, esInvitado, fechaAltaUsuario } from '../cuenta.repository'
import { USER_A, USER_B } from './helpers'

const base = usarBaseDeTest()

const INVITADO = '00000000-0000-4000-8000-0000000000c1'
const NADIE = '00000000-0000-4000-8000-0000000000ff'

describe('esInvitado', () => {
  test('una cuenta con email no es invitado', async () => {
    expect(await esInvitado(USER_A)).toBe(false)
  })

  test('un usuario anónimo sí', async () => {
    await crearUsuario(base().pg, INVITADO, { anonimo: true })
    expect(await esInvitado(INVITADO)).toBe(true)
  })

  test('un usuario que no existe cuenta como invitado: ante la duda, la cuota más baja', async () => {
    expect(await esInvitado(NADIE)).toBe(true)
  })
})

describe('fechaAltaUsuario', () => {
  test('devuelve la fecha de alta', async () => {
    await base().pg.query(`update auth.users set created_at = '2026-10-01T10:00:00Z' where id = $1`, [
      USER_A,
    ])
    expect(await fechaAltaUsuario(USER_A)).toEqual(new Date('2026-10-01T10:00:00Z'))
  })

  test('de un usuario que no existe, null', async () => {
    expect(await fechaAltaUsuario(NADIE)).toBeNull()
  })
})

describe('borrarUsuario', () => {
  test('borra solo a ese usuario', async () => {
    expect(await borrarUsuario(USER_A)).toBe(true)
    const { rows } = await base().pg.query<{ id: string }>('select id from auth.users')
    expect(rows.map((r) => r.id)).toEqual([USER_B])
  })

  test('borrar a alguien que no existe dice que no borró nada', async () => {
    expect(await borrarUsuario(NADIE)).toBe(false)
  })
})
