/**
 * Los hooks del Camino del héroe. Lo que se comprueba es lo que sostiene la
 * invalidación: que todos cuelgan de `['heroe']` y que enviar una partida la
 * tira entera, porque el mapa y el camino enseñan progreso derivado.
 */

import { describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { nuevoQueryClient } from '@/test/render'
import { useEnviarNivel, useMapaHeroe, useMundoHeroe, useNivelHeroe } from '../useHeroe'

const acciones = vi.hoisted(() => ({
  fetchMapa: vi.fn(),
  fetchMundo: vi.fn(),
  fetchNivel: vi.fn(),
  enviarNivel: vi.fn(),
}))
vi.mock('@/src/application/actions/heroe.actions', () => acciones)

const montar = <T,>(hook: () => T) => {
  const queryClient = nuevoQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(hook, { wrapper }) }
}

describe('cada consulta pide su acción y cuelga de ["heroe"]', () => {
  test.each<[string, () => { data?: unknown }, ReturnType<typeof vi.fn>, unknown[]]>([
    ['mapa', () => useMapaHeroe(), acciones.fetchMapa, []],
    ['mundo', () => useMundoHeroe('ahorro'), acciones.fetchMundo, ['ahorro']],
    ['nivel', () => useNivelHeroe('ahorro/01'), acciones.fetchNivel, ['ahorro/01']],
  ])('%s', async (_nombre, hook, accion, argumentos) => {
    accion.mockResolvedValue({ ok: true, data: 'dato' })
    const { result, queryClient } = montar(hook)

    await waitFor(() => expect(result.current.data).toBe('dato'))
    expect(accion).toHaveBeenCalledWith(...argumentos)
    expect(queryClient.getQueryCache().getAll().map((q) => q.queryKey[0])).toEqual(['heroe'])
  })

  test('sin id no se pide nada', () => {
    montar(() => useMundoHeroe(null))
    montar(() => useNivelHeroe(null))
    expect(acciones.fetchMundo).not.toHaveBeenCalled()
    expect(acciones.fetchNivel).not.toHaveBeenCalled()
  })

  test('un fallo de la acción llega como error con su mensaje', async () => {
    acciones.fetchMapa.mockResolvedValue({ ok: false, error: 'No autorizado' })
    const { result } = montar(() => useMapaHeroe())
    await waitFor(() => expect(result.current.error?.message).toBe('No autorizado'))
  })
})

describe('enviar una partida', () => {
  test('manda las respuestas e invalida todo ["heroe"]', async () => {
    acciones.enviarNivel.mockResolvedValue({ ok: true, data: { estrellas: 3 } })
    const { result, queryClient } = montar(() => useEnviarNivel())
    const invalidar = vi.spyOn(queryClient, 'invalidateQueries')

    await act(() => result.current.mutateAsync({ levelId: 'ahorro/01', respuestas: [1, true] }))

    expect(acciones.enviarNivel).toHaveBeenCalledWith('ahorro/01', [1, true])
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['heroe'] })
  })

  test('un rechazo del servidor llega como error', async () => {
    acciones.enviarNivel.mockResolvedValue({ ok: false, error: 'Respuestas no válidas' })
    const { result } = montar(() => useEnviarNivel())
    await expect(
      act(() => result.current.mutateAsync({ levelId: 'ahorro/01', respuestas: [] })),
    ).rejects.toThrow('Respuestas no válidas')
  })
})
