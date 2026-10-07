/**
 * Los hooks de la portada. Lo que se comprueba es lo que sostiene la
 * invalidación: que TODOS cuelgan de la raíz `['informes']` (si uno no, una
 * mutación lo deja mintiendo) y que un fallo de la acción llega como error.
 */

import { describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { nuevoQueryClient } from '@/test/render'
import { INFORME_MESES_POR_DEFECTO } from '@/src/types/informe.types'
import {
  useGastoPorCategoria,
  useIngresosVsGastos,
  useInvalidarDerivados,
  useSaldo,
  useSerieSaldo,
  useTotalesDelMes,
} from '../useInformes'

const informes = vi.hoisted(() => ({
  fetchGastoPorCategoria: vi.fn(),
  fetchIngresosVsGastos: vi.fn(),
  fetchSerieSaldo: vi.fn(),
  fetchTotalesDelMes: vi.fn(),
}))
vi.mock('@/src/application/actions/informes.actions', () => informes)

const entidades = vi.hoisted(() => ({ getSaldo: vi.fn() }))
vi.mock('@/src/application/actions/entity.actions', () => entidades)

const montar = <T,>(hook: () => T) => {
  const queryClient = nuevoQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, ...renderHook(hook, { wrapper }) }
}

const PERIODO = '2026-03'

describe('cada informe pide su acción y cuelga de ["informes"]', () => {
  test.each<[string, () => { data?: unknown }, ReturnType<typeof vi.fn>, unknown[]]>([
    ['gasto por categoría', () => useGastoPorCategoria(PERIODO), informes.fetchGastoPorCategoria, [PERIODO]],
    ['ingresos frente a gastos', () => useIngresosVsGastos(), informes.fetchIngresosVsGastos, [INFORME_MESES_POR_DEFECTO]],
    ['totales del mes', () => useTotalesDelMes(PERIODO), informes.fetchTotalesDelMes, [PERIODO]],
    ['serie del saldo', () => useSerieSaldo({ desde: '2026-01-01' }), informes.fetchSerieSaldo, [{ desde: '2026-01-01' }]],
    ['serie del saldo sin rango', () => useSerieSaldo(), informes.fetchSerieSaldo, [{}]],
    ['saldo', () => useSaldo(), entidades.getSaldo, []],
  ])('%s', async (_nombre, hook, accion, argumentos) => {
    accion.mockResolvedValue({ ok: true, data: 'dato' })

    const { result, queryClient } = montar(hook)

    await waitFor(() => expect(result.current.data).toBe('dato'))
    expect(accion).toHaveBeenCalledWith(...argumentos)
    const claves = queryClient.getQueryCache().getAll().map((q) => q.queryKey[0])
    expect(claves).toEqual(['informes'])
  })

  test('un fallo de la acción llega como error con su mensaje', async () => {
    entidades.getSaldo.mockResolvedValue({ ok: false, error: 'No autorizado' })

    const { result } = montar(() => useSaldo())

    await waitFor(() => expect(result.current.error?.message).toBe('No autorizado'))
  })
})

describe('useInvalidarDerivados', () => {
  test('marca como caducado todo lo que cuelga de ["informes"], y nada más', async () => {
    entidades.getSaldo.mockResolvedValue({ ok: true, data: 100 })
    const { result, queryClient } = montar(() => ({ saldo: useSaldo(), invalidar: useInvalidarDerivados() }))
    await waitFor(() => expect(result.current.saldo.data).toBe(100))
    queryClient.setQueryData(['otraCosa'], 1)
    entidades.getSaldo.mockResolvedValue({ ok: true, data: 350 })

    await act(() => result.current.invalidar())

    // El saldo activo se vuelve a pedir: la portada enseña la cifra nueva.
    await waitFor(() => expect(result.current.saldo.data).toBe(350))
    expect(queryClient.getQueryState(['otraCosa'])?.isInvalidated).toBe(false)
  })
})
