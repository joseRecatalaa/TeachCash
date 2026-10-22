/**
 * La pregunta del patrimonio inicial. Lo que se comprueba: que manda el
 * importe en CÉNTIMOS (regla dura 1), que no guarda lo que no es un importe y
 * que el error del servidor se enseña en el campo.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { nuevoQueryClient, renderConMantine } from '@/test/render'
import { ElegirPatrimonio, type ElegirPatrimonioProps } from '../ElegirPatrimonio'

const perfil = vi.hoisted(() => ({
  fetchPatrimonioInicial: vi.fn(),
  guardarPatrimonioInicial: vi.fn(),
}))
vi.mock('@/src/application/actions/perfil.actions', () => perfil)
// `usePerfil` tira de `useInvalidarDerivados`, y su módulo importa las otras
// acciones: sin cortarlas aquí, arrastran el `server-only` de los repositorios.
vi.mock('@/src/application/actions/informes.actions', () => ({}))
vi.mock('@/src/application/actions/entity.actions', () => ({}))

const pintar = (props: ElegirPatrimonioProps) =>
  renderConMantine(<ElegirPatrimonio {...props} />, { queryClient: nuevoQueryClient() })

beforeEach(() => {
  perfil.guardarPatrimonioInicial.mockReset()
  perfil.guardarPatrimonioInicial.mockResolvedValue({ ok: true, data: 0 })
})

describe('la primera vez', () => {
  test('pregunta y guarda en céntimos', async () => {
    const onGuardado = vi.fn()
    const { usuario } = pintar({ inicial: null, onGuardado })

    expect(screen.getByText('¿Con cuánto empiezas?')).toBeInTheDocument()
    await usuario.type(screen.getByLabelText('Patrimonio inicial'), '1.250,50')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onGuardado).toHaveBeenCalled())
    expect(perfil.guardarPatrimonioInicial).toHaveBeenCalledWith({ patrimonioInicial: 125_050 })
  })

  test('«Empezar en 0 €» guarda un cero, que también es una respuesta', async () => {
    const { usuario } = pintar({ inicial: null })

    await usuario.click(screen.getByRole('button', { name: 'Empezar en 0 €' }))

    await waitFor(() =>
      expect(perfil.guardarPatrimonioInicial).toHaveBeenCalledWith({ patrimonioInicial: 0 }),
    )
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
  })

  test('lo que no es un importe no se manda', async () => {
    const { usuario } = pintar({ inicial: null })

    await usuario.type(screen.getByLabelText('Patrimonio inicial'), '12,3x')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText(/Escribe un importe/)).toBeInTheDocument()
    expect(perfil.guardarPatrimonioInicial).not.toHaveBeenCalled()
  })

  test('el error del servidor se enseña en el campo', async () => {
    perfil.guardarPatrimonioInicial.mockResolvedValue({
      ok: false,
      error: 'Revisa el importe',
      fieldErrors: { patrimonioInicial: 'Importe demasiado grande' },
    })
    const { usuario } = pintar({ inicial: null })

    await usuario.type(screen.getByLabelText('Patrimonio inicial'), '1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Importe demasiado grande')).toBeInTheDocument()
  })
})

describe('al cambiarlo', () => {
  test('parte del que había y se puede cancelar', async () => {
    const onCancelar = vi.fn()
    const { usuario } = pintar({ inicial: 100_000, onCancelar })

    expect(screen.getByText('Cambiar el patrimonio inicial')).toBeInTheDocument()
    expect(screen.getByLabelText('Patrimonio inicial')).toHaveValue('1000,00')
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancelar).toHaveBeenCalled()
    expect(perfil.guardarPatrimonioInicial).not.toHaveBeenCalled()
  })
})
