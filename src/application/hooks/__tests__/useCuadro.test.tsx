/**
 * Lo que sostiene la invalidación del Cuadro de mando: depende de movimientos, de
 * partidas y de compras, y si alguna no lo tira, el héroe y el radar se quedan
 * con lo de antes sin que falle nada.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { nuevoQueryClient } from '@/test/render'
import {
  CLAVE_CUADRO,
  CLAVE_TIENDA,
  useComprarObjeto,
  useCuadro,
  useEquiparObjeto,
  useQuitarObjeto,
  useTienda,
} from '../useCuadro'
import { useEnviarNivel } from '../useHeroe'

const cuadro = vi.hoisted(() => ({ fetchCuadro: vi.fn() }))
const tienda = vi.hoisted(() => ({
  fetchTienda: vi.fn(),
  comprarObjeto: vi.fn(),
  equiparObjeto: vi.fn(),
  quitarObjeto: vi.fn(),
}))
const heroe = vi.hoisted(() => ({ enviarNivel: vi.fn(), fetchMapa: vi.fn(), fetchMundo: vi.fn(), fetchNivel: vi.fn() }))
vi.mock('@/src/application/actions/cuadro.actions', () => cuadro)
vi.mock('@/src/application/actions/tienda.actions', () => tienda)
vi.mock('@/src/application/actions/heroe.actions', () => heroe)

const montar = <T,>(hook: () => T) => {
  const queryClient = nuevoQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(hook, { wrapper }) }
}

const caducado = (queryClient: ReturnType<typeof nuevoQueryClient>) =>
  queryClient.getQueryState(CLAVE_CUADRO)?.isInvalidated

beforeEach(() => vi.clearAllMocks())

describe('las consultas', () => {
  test('el cuadro cuelga de ["informes"], y por eso lo tira anotar un movimiento', async () => {
    cuadro.fetchCuadro.mockResolvedValue({ ok: true, data: 'dato' })
    const { result, queryClient } = montar(() => useCuadro())
    await waitFor(() => expect(result.current.data).toBe('dato'))

    // Lo mismo que hace `useInvalidarDerivados()` tras cada movimiento.
    await act(() => queryClient.invalidateQueries({ queryKey: ['informes'] }))

    expect(cuadro.fetchCuadro).toHaveBeenCalledTimes(2)
  })

  test('la tienda cuelga de ["heroe"]', async () => {
    tienda.fetchTienda.mockResolvedValue({ ok: true, data: 'dato' })
    const { result } = montar(() => useTienda())
    await waitFor(() => expect(result.current.data).toBe('dato'))
    expect(CLAVE_TIENDA[0]).toBe('heroe')
  })

  test('un error de la acción llega como error', async () => {
    cuadro.fetchCuadro.mockResolvedValue({ ok: false, error: 'No autorizado' })
    const { result } = montar(() => useCuadro())
    await waitFor(() => expect(result.current.error?.message).toBe('No autorizado'))
  })
})

describe('lo que invalida el cuadro', () => {
  test.each<[string, () => { mutateAsync: (id: string) => Promise<unknown> }, ReturnType<typeof vi.fn>]>([
    ['comprar', () => useComprarObjeto(), tienda.comprarObjeto],
    ['equipar', () => useEquiparObjeto(), tienda.equiparObjeto],
    ['quitar', () => useQuitarObjeto(), tienda.quitarObjeto],
  ])('%s lo invalida y deja la tienda al día', async (_nombre, hook, accion) => {
    accion.mockResolvedValue({ ok: true, data: { equipo: ['casco-basica'] } })
    const { result, queryClient } = montar(hook)
    queryClient.setQueryData(CLAVE_CUADRO, 'viejo')

    await act(() => result.current.mutateAsync('casco-basica'))

    expect(accion).toHaveBeenCalledWith('casco-basica')
    expect(caducado(queryClient)).toBe(true)
    expect(queryClient.getQueryData(CLAVE_TIENDA)).toEqual({ equipo: ['casco-basica'] })
  })

  test('una compra fallida no toca nada y dice por qué', async () => {
    tienda.comprarObjeto.mockResolvedValue({ ok: false, error: 'No tienes estrellas suficientes' })
    const { result, queryClient } = montar(() => useComprarObjeto())
    queryClient.setQueryData(CLAVE_CUADRO, 'viejo')

    await expect(act(() => result.current.mutateAsync('casco-alta'))).rejects.toThrow(
      'No tienes estrellas suficientes',
    )
    expect(caducado(queryClient)).toBe(false)
  })

  test('superar un nivel también: da estrellas y sube las estadísticas', async () => {
    heroe.enviarNivel.mockResolvedValue({ ok: true, data: {} })
    const { result, queryClient } = montar(() => useEnviarNivel())
    queryClient.setQueryData(CLAVE_CUADRO, 'viejo')
    queryClient.setQueryData(CLAVE_TIENDA, 'viejo')

    await act(() => result.current.mutateAsync({ levelId: 'a/b', respuestas: [] }))

    expect(caducado(queryClient)).toBe(true)
    expect(queryClient.getQueryState(CLAVE_TIENDA)?.isInvalidated).toBe(true)
  })
})
