/**
 * El aviso del invitado se puede cerrar, pero no para siempre: se recuerda por
 * invitado (su fecha de borrado) y vuelve solo el último día.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderConMantine } from '@/test/render'
import { AvisoInvitado } from '../AvisoInvitado'

const estado = vi.hoisted(() => ({
  cuenta: { tipo: 'invitado', caducaEl: '' } as { tipo: string; caducaEl?: string },
}))

vi.mock('@/src/application/providers/CuentaProvider', () => ({
  useCuenta: () => ({ cuenta: estado.cuenta }),
}))

const CLAVE = 'tc-aviso-invitado-cerrado'
const DIA = 24 * 60 * 60 * 1000
const dentroDe = (ms: number) => new Date(Date.now() + ms).toISOString()

const franja = () => screen.queryByRole('note')

beforeEach(() => {
  estado.cuenta = { tipo: 'invitado', caducaEl: dentroDe(3 * DIA) }
})

afterEach(() => {
  window.localStorage.clear()
  delete document.documentElement.dataset.avisoInvitado
})

describe('AvisoInvitado', () => {
  test('un invitado ve el aviso, con su X para cerrarlo', () => {
    renderConMantine(<AvisoInvitado />)

    expect(franja()).toHaveTextContent('Estás como invitado')
    expect(screen.getByRole('button', { name: 'Cerrar el aviso' })).toBeInTheDocument()
  })

  test('una cuenta con email no ve nada', () => {
    estado.cuenta = { tipo: 'usuario' }
    renderConMantine(<AvisoInvitado />)

    expect(franja()).not.toBeInTheDocument()
  })

  test('cerrarlo lo quita y recuerda QUÉ invitado lo cerró', async () => {
    const { usuario } = renderConMantine(<AvisoInvitado />)

    await usuario.click(screen.getByRole('button', { name: 'Cerrar el aviso' }))

    expect(franja()).not.toBeInTheDocument()
    expect(window.localStorage.getItem(CLAVE)).toBe(estado.cuenta.caducaEl)
  })

  test('cerrado por este invitado, no vuelve a salir al recargar', () => {
    window.localStorage.setItem(CLAVE, estado.cuenta.caducaEl!)
    renderConMantine(<AvisoInvitado />)

    expect(franja()).not.toBeInTheDocument()
  })

  test('cerrado por OTRO invitado, este lo ve, y se retira la marca del <head>', () => {
    window.localStorage.setItem(CLAVE, dentroDe(2 * DIA))
    document.documentElement.dataset.avisoInvitado = 'cerrado'
    renderConMantine(<AvisoInvitado />)

    expect(franja()).toBeInTheDocument()
    expect(document.documentElement.dataset.avisoInvitado).toBeUndefined()
  })

  test('el último día vuelve aunque se cerrara: aún está a tiempo de crear la cuenta', () => {
    estado.cuenta = { tipo: 'invitado', caducaEl: dentroDe(DIA / 2) }
    window.localStorage.setItem(CLAVE, estado.cuenta.caducaEl!)
    renderConMantine(<AvisoInvitado />)

    expect(franja()).toBeInTheDocument()
  })
})
