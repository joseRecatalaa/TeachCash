/**
 * La factory de hooks CRUD, sobre Refine de verdad (`test/refine.tsx`): lo
 * único sustituido son las Server Actions. Se comprueba lo que llega a la
 * acción —qué filtros, qué paginación— y el atajo `desdeLista`.
 */

import { describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { nuevoQueryClient } from '@/test/render'
import { envoltorioRefine } from '@/test/refine'
import { TAMANO_PAGINA_POR_DEFECTO } from '@/src/types/limites.types'
import type { CategoriaListDto } from '@/src/types/categoria.types'
import type { MovimientoListDto } from '@/src/types/movimiento.types'
import {
  useCategoria,
  useCategorias,
  useCreateCategoria,
  useDeleteCategoria,
  useUpdateCategoria,
} from '../useCategorias'
import { useMovimiento, useMovimientos } from '../useMovimientos'

const acciones = vi.hoisted(() => ({
  listEntity: vi.fn(),
  getEntity: vi.fn(),
  createEntity: vi.fn(),
  updateEntity: vi.fn(),
  deleteEntity: vi.fn(),
}))
vi.mock('@/src/application/actions/entity.actions', () => acciones)
// `providers.tsx` (de donde salen los recursos reales) monta la cuenta, que
// importa las acciones de auth, que arrastran la base.
vi.mock('@/src/application/actions/auth.actions', () => ({}))

const CATEGORIA: CategoriaListDto = {
  id: 'cat-1',
  nombre: 'Súper',
  tipo: 'expense',
  icono: null,
  color: 'cat-2',
  presupuesto: 30000,
  usos: 4,
  oculta: false,
}

const MOVIMIENTO = {
  id: 'mov-1',
  fecha: '2026-03-01',
  descripcion: 'Pan',
  importe: -250,
  categoriaId: 'cat-1',
} as unknown as MovimientoListDto

const montar = () => {
  const queryClient = nuevoQueryClient()
  return { queryClient, wrapper: envoltorioRefine(queryClient) }
}

describe('useList', () => {
  test('manda a la acción los filtros con valor y la paginación de la tabla', async () => {
    acciones.listEntity.mockResolvedValue({ ok: true, data: { data: [CATEGORIA], total: 1 } })
    const { wrapper } = montar()

    const { result } = renderHook(
      () => useCategorias({ tipo: 'expense', oculta: '' }, { page: 2, sortBy: 'nombre', sortDir: 'desc' }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.result.data).toEqual([CATEGORIA]))
    expect(acciones.listEntity).toHaveBeenCalledWith('Categorias', {
      // `oculta: ''` es "todas": no viaja como filtro.
      filters: { tipo: 'expense' },
      search: '',
      paginate: true,
      page: 2,
      pageSize: TAMANO_PAGINA_POR_DEFECTO,
      sortBy: 'nombre',
      sortDir: 'desc',
    })
  })

  test('paginate:false pide el conjunto entero (modo cliente)', async () => {
    acciones.listEntity.mockResolvedValue({ ok: true, data: { data: [], total: 0 } })
    const { wrapper } = montar()

    renderHook(() => useCategorias(undefined, { paginate: false }), { wrapper })

    await waitFor(() =>
      expect(acciones.listEntity).toHaveBeenCalledWith(
        'Categorias',
        expect.objectContaining({ paginate: false }),
      ),
    )
  })

  test('sin paginación propia usa la de Refine', async () => {
    acciones.listEntity.mockResolvedValue({ ok: true, data: { data: [MOVIMIENTO], total: 1 } })
    const { wrapper } = montar()

    renderHook(() => useMovimientos({ categoriaId: 'cat-1', desde: undefined }), { wrapper })

    await waitFor(() =>
      expect(acciones.listEntity).toHaveBeenCalledWith(
        'Movimientos',
        expect.objectContaining({ filters: { categoriaId: 'cat-1' }, paginate: true }),
      ),
    )
  })

  test('un filtro numérico viaja como número', async () => {
    acciones.listEntity.mockResolvedValue({ ok: true, data: { data: [], total: 0 } })
    const { wrapper } = montar()

    renderHook(
      () => useMovimientos({ importe: 250 } as Parameters<typeof useMovimientos>[0]),
      { wrapper },
    )

    await waitFor(() =>
      expect(acciones.listEntity).toHaveBeenCalledWith(
        'Movimientos',
        expect.objectContaining({ filters: { importe: 250 } }),
      ),
    )
  })

  test('enabled:false no pide nada', async () => {
    const { wrapper } = montar()

    renderHook(() => useCategorias(undefined, undefined, { enabled: false }), { wrapper })

    await act(async () => {})
    expect(acciones.listEntity).not.toHaveBeenCalled()
  })

  test('un fallo de la acción deja la query en error con su mensaje', async () => {
    acciones.listEntity.mockResolvedValue({ ok: false, error: 'No autorizado' })
    const { wrapper } = montar()

    const { result } = renderHook(() => useCategorias(), { wrapper })

    await waitFor(() => expect(result.current.query.error?.message).toBe('No autorizado'))
  })
})

describe('useOne y desdeLista', () => {
  test('sin id no pide nada', async () => {
    const { wrapper } = montar()

    renderHook(() => useCategoria(''), { wrapper })

    await act(async () => {})
    expect(acciones.getEntity).not.toHaveBeenCalled()
  })

  test('con id pide el detalle', async () => {
    acciones.getEntity.mockResolvedValue({ ok: true, data: { id: 'mov-1', importe: 250 } })
    const { wrapper } = montar()

    const { result } = renderHook(() => useMovimiento('mov-1'), { wrapper })

    await waitFor(() => expect(result.current.result).toEqual({ id: 'mov-1', importe: 250 }))
    expect(acciones.getEntity).toHaveBeenCalledWith('Movimientos', 'mov-1')
  })

  test('Categorías (con desdeLista) pinta al instante con la fila de una lista cargada', async () => {
    acciones.listEntity.mockResolvedValue({ ok: true, data: { data: [CATEGORIA], total: 1 } })
    // El detalle no llega nunca: lo que se ve tiene que salir de la lista.
    acciones.getEntity.mockReturnValue(new Promise(() => {}))
    const { wrapper } = montar()
    const lista = renderHook(() => useCategorias(), { wrapper })
    await waitFor(() => expect(lista.result.current.result.data).toHaveLength(1))

    const { result } = renderHook(() => useCategoria('cat-1'), { wrapper })

    // Sin `usos` ni `oculta`, y el icono vacío como cadena: el FormDto.
    expect(result.current.result).toEqual({
      id: 'cat-1',
      nombre: 'Súper',
      tipo: 'expense',
      icono: '',
      color: 'cat-2',
      presupuesto: 30000,
    })
  })

  test('una fila que no está en ninguna lista cargada no se inventa', async () => {
    acciones.listEntity.mockResolvedValue({ ok: true, data: { data: [CATEGORIA], total: 1 } })
    acciones.getEntity.mockReturnValue(new Promise(() => {}))
    const { wrapper } = montar()
    const lista = renderHook(() => useCategorias(), { wrapper })
    await waitFor(() => expect(lista.result.current.result.data).toHaveLength(1))

    const { result } = renderHook(() => useCategoria('otra'), { wrapper })

    expect(result.current.result).toBeUndefined()
  })

  test('Movimientos (sin desdeLista) NO usa la fila: el importe con signo no es el del formulario', async () => {
    acciones.listEntity.mockResolvedValue({ ok: true, data: { data: [MOVIMIENTO], total: 1 } })
    acciones.getEntity.mockReturnValue(new Promise(() => {}))
    const { wrapper } = montar()
    const lista = renderHook(() => useMovimientos(), { wrapper })
    await waitFor(() => expect(lista.result.current.result.data).toHaveLength(1))

    const { result } = renderHook(() => useMovimiento('mov-1'), { wrapper })

    expect(result.current.result).toBeUndefined()
    expect(acciones.getEntity).toHaveBeenCalledWith('Movimientos', 'mov-1')
  })
})

describe('mutaciones', () => {
  test('crear, actualizar y borrar llaman a su acción con el recurso', async () => {
    acciones.createEntity.mockResolvedValue({ ok: true, data: { id: 'n' } })
    acciones.updateEntity.mockResolvedValue({ ok: true, data: { id: 'n' } })
    acciones.deleteEntity.mockResolvedValue({ ok: true, data: { id: 'n' } })
    const { wrapper } = montar()
    const { result } = renderHook(
      () => ({ crear: useCreateCategoria(), editar: useUpdateCategoria(), borrar: useDeleteCategoria() }),
      { wrapper },
    )
    const valores = { nombre: 'Luz', tipo: 'expense', icono: '', color: '', presupuesto: null }

    await act(() => result.current.crear.mutateAsync({ resource: 'Categorias', values: valores }))
    await act(() => result.current.editar.mutateAsync({ resource: 'Categorias', id: 'n', values: valores }))
    await act(() => result.current.borrar.mutateAsync({ resource: 'Categorias', id: 'n' }))

    expect(acciones.createEntity).toHaveBeenCalledWith('Categorias', valores)
    expect(acciones.updateEntity).toHaveBeenCalledWith('Categorias', 'n', valores)
    expect(acciones.deleteEntity).toHaveBeenCalledWith('Categorias', 'n')
  })
})
