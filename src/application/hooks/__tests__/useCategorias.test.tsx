/**
 * Las operaciones de Categorías que no son CRUD (activar y ocultar) y el
 * olvido de las listas que no están en pantalla. Sobre Refine de verdad: lo
 * que se comprueba son las CLAVES que se invalidan, que es donde una
 * invalidación puede no casar con nada sin avisar.
 */

import { describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { nuevoQueryClient } from '@/test/render'
import { envoltorioRefine } from '@/test/refine'
import { useActivarCategoria, useCategorias, useOcultarCategoria } from '../useCategorias'
import { useOlvidarListas } from '../useOlvidarListas'

const acciones = vi.hoisted(() => ({
  listEntity: vi.fn(),
  activarCategoria: vi.fn(),
  ocultarCategoria: vi.fn(),
}))
vi.mock('@/src/application/actions/entity.actions', () => acciones)
vi.mock('@/src/application/actions/auth.actions', () => ({}))

const avisos = vi.hoisted(() => ({ show: vi.fn() }))
vi.mock('@mantine/notifications', () => ({ notifications: avisos }))

const montar = <T,>(hook: () => T) => {
  const queryClient = nuevoQueryClient()
  const invalidar = vi.spyOn(queryClient, 'invalidateQueries')
  return { queryClient, invalidar, ...renderHook(hook, { wrapper: envoltorioRefine(queryClient) }) }
}

/** Las listas de Categorías que hay en caché y si están caducadas. */
const listasDeCategorias = (queryClient: ReturnType<typeof nuevoQueryClient>) =>
  queryClient
    .getQueryCache()
    .getAll()
    .filter((q) => q.queryKey.includes('Categorias') && q.queryKey.includes('list'))

/** Los dos hooks con la misma forma, para probarlos con los mismos casos. */
const useActivar = () => {
  const { activar, isPending } = useActivarCategoria()
  return { ejecutar: (id: string) => activar(id), isPending }
}
const useOcultar = () => {
  const { ocultar, isPending } = useOcultarCategoria()
  return { ejecutar: ocultar, isPending }
}

describe.each([
  ['activar', useActivar, acciones.activarCategoria, 'Categoría activada'],
  ['ocultar', useOcultar, acciones.ocultarCategoria, 'Categoría ocultada'],
] as const)('%s', (_nombre, useHook, accion, aviso) => {
  test('si sale bien, invalida la lista de Categorías y el catálogo', async () => {
    acciones.listEntity.mockResolvedValue({ ok: true, data: { data: [], total: 0 } })
    accion.mockResolvedValue({ ok: true, data: { id: 'c1' } })
    const { result, queryClient, invalidar } = montar(() => ({ lista: useCategorias(), op: useHook() }))
    await waitFor(() => expect(listasDeCategorias(queryClient)).toHaveLength(1))

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.op.ejecutar('c1')
    })

    expect(ok).toBe(true)
    // La lista de verdad (la que construye Refine) se ha vuelto a pedir.
    await waitFor(() => expect(acciones.listEntity).toHaveBeenCalledTimes(2))
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['catalogos'] })
    expect(avisos.show).toHaveBeenCalledWith(expect.objectContaining({ message: aviso }))
    expect(result.current.op.isPending).toBe(false)
  })

  test('si falla, avisa con el mensaje y no invalida el catálogo', async () => {
    accion.mockResolvedValue({ ok: false, error: 'No encontrada' })
    const { result, invalidar } = montar(() => useHook())

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.ejecutar('c1')
    })

    expect(ok).toBe(false)
    expect(invalidar).not.toHaveBeenCalledWith({ queryKey: ['catalogos'] })
    expect(avisos.show).toHaveBeenCalledWith(expect.objectContaining({ message: 'No encontrada' }))
  })
})

test('activar pasa el presupuesto a la acción', async () => {
  acciones.activarCategoria.mockResolvedValue({ ok: true, data: { id: 'c1' } })
  const { result } = montar(() => useActivarCategoria())

  await act(() => result.current.activar('c1', 30000))

  expect(acciones.activarCategoria).toHaveBeenCalledWith('c1', 30000)
})

describe('useOlvidarListas', () => {
  test('saca de la caché las listas del recurso que no están en pantalla, y deja las activas', async () => {
    acciones.listEntity.mockResolvedValue({ ok: true, data: { data: [], total: 0 } })
    const { result, queryClient } = montar(() => ({
      activa: useCategorias({ tipo: 'expense' }),
      olvidar: useOlvidarListas(),
    }))
    await waitFor(() => expect(listasDeCategorias(queryClient)).toHaveLength(1))
    // Una lista que se pidió antes y ya no está montada (otra página).
    const inactiva = renderHook(() => useCategorias({ tipo: 'income' }), {
      wrapper: envoltorioRefine(queryClient),
    })
    await waitFor(() => expect(listasDeCategorias(queryClient)).toHaveLength(2))
    inactiva.unmount()

    act(() => result.current.olvidar('Categorias'))

    const quedan = listasDeCategorias(queryClient)
    expect(quedan).toHaveLength(1)
    expect(JSON.stringify(quedan[0].queryKey)).toContain('expense')
  })
})
