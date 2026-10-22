/**
 * Los hooks del patrimonio inicial. Lo que se comprueba: que la query cuelga de
 * `['informes']` (o el cambio de usuario y las mutaciones no la tirarían), que
 * guardar invalida lo derivado y que un fallo llega con el mensaje del campo.
 */

import { describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { nuevoQueryClient } from '@/test/render'
import { useGuardarPatrimonioInicial, usePatrimonioInicial } from '../usePerfil'

const perfil = vi.hoisted(() => ({
  fetchPatrimonioInicial: vi.fn(),
  guardarPatrimonioInicial: vi.fn(),
}))
vi.mock('@/src/application/actions/perfil.actions', () => perfil)
// `usePerfil` tira de `useInvalidarDerivados`, y su módulo importa las otras
// acciones: sin cortarlas aquí, arrastran el `server-only` de los repositorios.
vi.mock('@/src/application/actions/informes.actions', () => ({}))
vi.mock('@/src/application/actions/entity.actions', () => ({}))

const montar = <T,>(hook: () => T) => {
  const queryClient = nuevoQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(hook, { wrapper }) }
}

describe('usePatrimonioInicial', () => {
  test('sin elegir, devuelve null (no undefined: ya se sabe)', async () => {
    perfil.fetchPatrimonioInicial.mockResolvedValue({ ok: true, data: null })
    const { result, queryClient } = montar(() => usePatrimonioInicial())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(queryClient.getQueryCache().getAll()[0].queryKey[0]).toBe('informes')
  })

  test('un fallo de la acción llega como error', async () => {
    perfil.fetchPatrimonioInicial.mockResolvedValue({ ok: false, error: 'No autorizado' })
    const { result } = montar(() => usePatrimonioInicial())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('No autorizado')
  })
})

describe('useGuardarPatrimonioInicial', () => {
  test('manda el importe con su nombre e invalida lo derivado', async () => {
    perfil.guardarPatrimonioInicial.mockResolvedValue({ ok: true, data: 5000 })
    const { result, queryClient } = montar(() => useGuardarPatrimonioInicial())
    const invalidar = vi.spyOn(queryClient, 'invalidateQueries')

    await act(() => result.current.mutateAsync(5000))

    expect(perfil.guardarPatrimonioInicial).toHaveBeenCalledWith({ patrimonioInicial: 5000 })
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['informes'] })
  })

  test('el error del campo gana al general, que solo dice que algo falló', async () => {
    perfil.guardarPatrimonioInicial.mockResolvedValue({
      ok: false,
      error: 'Revisa el importe',
      fieldErrors: { patrimonioInicial: 'Importe demasiado grande' },
    })
    const { result } = montar(() => useGuardarPatrimonioInicial())

    await expect(act(() => result.current.mutateAsync(1))).rejects.toThrow(
      'Importe demasiado grande',
    )
  })

  test('sin error de campo, llega el general', async () => {
    perfil.guardarPatrimonioInicial.mockResolvedValue({ ok: false, error: 'No autorizado' })
    const { result } = montar(() => useGuardarPatrimonioInicial())

    await expect(act(() => result.current.mutateAsync(1))).rejects.toThrow('No autorizado')
  })
})
