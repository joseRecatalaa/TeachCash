/**
 * Cambiar la contraseña (Fase 3): con una sesión abierta escribiendo la
 * contraseña se pide la ACTUAL; llegando desde el enlace del email, no (quien
 * llega así no la conoce). Quién es quién lo decide el servidor
 * (`requisitosCambioPassword`); el formulario solo pinta lo que le dicen.
 *
 * Se sustituyen las acciones de servidor, la cuenta y el CAPTCHA: lo que se
 * prueba es la pantalla, no Supabase.
 */

import { describe, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderConMantine } from '@/test/render'
import type { CuentaDto } from '@/src/types/cuenta.types'
import { CambiarPasswordForm } from '../CambiarPasswordForm'

const acciones = vi.hoisted(() => ({
  requisitosCambioPassword: vi.fn(),
  cambiarPassword: vi.fn(),
}))
vi.mock('@/src/application/actions/auth.actions', () => acciones)

const cuenta = vi.hoisted(() => ({
  actual: { tipo: 'usuario', email: 'ana@example.com' } as CuentaDto,
  entrar: vi.fn(),
}))
vi.mock('@/src/application/providers/CuentaProvider', () => ({
  useCuenta: () => ({ cuenta: cuenta.actual, entrar: cuenta.entrar }),
}))

vi.mock('@/lib/turnstile', () => ({ obtenerTokenCaptcha: vi.fn().mockResolvedValue('token-captcha') }))

const BUENA = 'Contraseña-nueva-1'

const pintar = ({ pideActual, tipo = 'usuario' }: { pideActual: boolean; tipo?: 'usuario' | 'invitado' }) => {
  cuenta.actual =
    tipo === 'usuario'
      ? { tipo: 'usuario', email: 'ana@example.com' }
      : { tipo: 'invitado', caducaEl: '2026-03-20T00:00:00Z' }
  acciones.requisitosCambioPassword.mockResolvedValue({ ok: true, data: { pideActual } })
  acciones.cambiarPassword.mockResolvedValue({
    ok: true,
    data: { tipo: 'usuario', email: 'ana@example.com' },
  })
  return renderConMantine(<CambiarPasswordForm />)
}

const rellenarNueva = async (usuario: ReturnType<typeof pintar>['usuario'], repetir = BUENA) => {
  await usuario.type(screen.getByLabelText(/Contraseña nueva/), BUENA)
  await usuario.type(screen.getByLabelText(/Repítela/), repetir)
}

describe('qué pide', () => {
  test('con sesión de contraseña, pide la actual y la manda con el CAPTCHA', async () => {
    const { usuario } = pintar({ pideActual: true })

    const actual = await screen.findByLabelText(/Contraseña actual/)
    expect(screen.getByRole('heading', { name: 'Cambiar contraseña' })).toBeInTheDocument()
    await usuario.type(actual, 'La-de-antes-1')
    await rellenarNueva(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    await waitFor(() =>
      expect(acciones.cambiarPassword).toHaveBeenCalledWith({
        passwordActual: 'La-de-antes-1',
        password: BUENA,
        repetir: BUENA,
        captchaToken: 'token-captcha',
      }),
    )
    expect(cuenta.entrar).toHaveBeenCalledWith({ tipo: 'usuario', email: 'ana@example.com' })
  })

  test('desde el enlace del email NO pide la actual, ni la manda', async () => {
    const { usuario } = pintar({ pideActual: false })

    expect(await screen.findByRole('heading', { name: 'Elige tu contraseña' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeEnabled(),
    )
    expect(screen.queryByLabelText(/Contraseña actual/)).not.toBeInTheDocument()

    await rellenarNueva(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    await waitFor(() =>
      expect(acciones.cambiarPassword).toHaveBeenCalledWith({ password: BUENA, repetir: BUENA }),
    )
  })

  test('mientras no sabe si pedir la actual, no deja enviar', () => {
    cuenta.actual = { tipo: 'usuario', email: 'ana@example.com' }
    acciones.requisitosCambioPassword.mockReturnValue(new Promise(() => {}))

    renderConMantine(<CambiarPasswordForm />)

    expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeDisabled()
  })

  test('un invitado no ve el formulario: necesita cuenta', () => {
    pintar({ pideActual: false, tipo: 'invitado' })

    expect(screen.queryByLabelText(/Contraseña nueva/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/Registro')
    expect(acciones.requisitosCambioPassword).not.toHaveBeenCalled()
  })
})

describe('errores', () => {
  test('sin la actual, cuando hace falta, no envía', async () => {
    const { usuario } = pintar({ pideActual: true })
    await screen.findByLabelText(/Contraseña actual/)

    await rellenarNueva(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByText('Escribe tu contraseña actual')).toBeInTheDocument()
    expect(acciones.cambiarPassword).not.toHaveBeenCalled()
  })

  test('una contraseña débil o que no coincide se señala sin enviar', async () => {
    const { usuario } = pintar({ pideActual: false })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeEnabled(),
    )

    await usuario.type(screen.getByLabelText(/Contraseña nueva/), 'corta')
    await usuario.type(screen.getByLabelText(/Repítela/), 'otra')
    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByText('Mínimo 10 caracteres')).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(acciones.cambiarPassword).not.toHaveBeenCalled()
  })

  test('el error del servidor se enseña, con el de su campo', async () => {
    const { usuario } = pintar({ pideActual: true })
    acciones.cambiarPassword.mockResolvedValue({
      ok: false,
      error: 'Revisa los campos',
      fieldErrors: { passwordActual: 'La contraseña actual no es correcta' },
    })
    await usuario.type(await screen.findByLabelText(/Contraseña actual/), 'Mal-puesta-1')
    await rellenarNueva(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByText('Revisa los campos')).toBeInTheDocument()
    expect(screen.getByText('La contraseña actual no es correcta')).toBeInTheDocument()
    expect(cuenta.entrar).not.toHaveBeenCalled()
  })

  test('si la acción revienta, avisa sin dejar el botón cargando', async () => {
    const { usuario } = pintar({ pideActual: false })
    acciones.cambiarPassword.mockRejectedValue(new Error('red caída'))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeEnabled(),
    )
    await rellenarNueva(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByText('No se ha podido guardar la contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeEnabled()
  })

  test('si no puede preguntar los requisitos, lo dice', async () => {
    cuenta.actual = { tipo: 'usuario', email: 'ana@example.com' }
    acciones.requisitosCambioPassword.mockResolvedValue({ ok: false, error: 'No autorizado' })

    renderConMantine(<CambiarPasswordForm />)

    expect(await screen.findByText('No autorizado')).toBeInTheDocument()
  })

  test('si la pregunta de requisitos revienta, lo dice', async () => {
    cuenta.actual = { tipo: 'usuario', email: 'ana@example.com' }
    acciones.requisitosCambioPassword.mockRejectedValue(new Error('red caída'))

    renderConMantine(<CambiarPasswordForm />)

    expect(await screen.findByText('No se ha podido preparar el formulario')).toBeInTheDocument()
  })
})
