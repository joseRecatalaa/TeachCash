/**
 * El estado de un listado. Se le da un hook de lista falso y se mira qué le
 * pide y qué props le pasa a la tabla. La regla que más importa: cualquier
 * cambio de tamaño, orden, filtro o búsqueda vuelve a la página 1; si no, el
 * servidor recibe una página que ya no existe y la tabla sale vacía.
 */

import { describe, expect, test, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { TAMANO_PAGINA_POR_DEFECTO } from '@/src/types/limites.types'
import { usePaginacion, type UsePaginacionConfig } from '../usePaginacion'

type Fila = { id: string }
type Filtros = Record<string, string | undefined>

const FILAS: Fila[] = [{ id: 'a' }, { id: 'b' }]

const montar = (config: UsePaginacionConfig<Filtros> = {}) => {
  const hook = vi.fn<(f?: Filtros, p?: unknown, o?: unknown) => unknown>(() => ({
    query: { isFetching: false },
    result: { data: FILAS, total: 42 },
  }))
  const r = renderHook(() => usePaginacion(hook as never, config))
  /** Lo último que se le pidió al hook de lista. */
  const ultima = () => {
    const [filtros, paginacion, opciones] = hook.mock.calls.at(-1) ?? []
    return { filtros, paginacion, opciones }
  }
  return { ...r, hook, ultima }
}

const props = (r: ReturnType<typeof montar>['result']) => r.current.tableProps

describe('modo servidor (por defecto)', () => {
  test('pide la página 1 con el tamaño por defecto y pasa el total a la tabla', () => {
    const { result, ultima } = montar()

    expect(ultima().paginacion).toEqual({ page: 1, pageSize: TAMANO_PAGINA_POR_DEFECTO, searchQuery: '' })
    expect(result.current.data).toEqual(FILAS)
    expect(props(result)).toMatchObject({
      manualPagination: true,
      manualSorting: true,
      manualFiltering: true,
      serverTotalRecords: 42,
      currentPage: 1,
    })
  })

  test('respeta el tamaño y el orden iniciales, y el enabled', () => {
    const { ultima } = montar({
      initialPageSize: 50,
      initialSort: { sortBy: 'fecha', sortDir: 'desc' },
      enabled: false,
    })
    expect(ultima().paginacion).toEqual({
      page: 1,
      pageSize: 50,
      sortBy: 'fecha',
      sortDir: 'desc',
      searchQuery: '',
    })
    expect(ultima().opciones).toEqual({ enabled: false })
  })

  test('cambiar de página la pide', () => {
    const { result, ultima } = montar()

    act(() => props(result).onPageChange?.(3))

    expect(ultima().paginacion).toMatchObject({ page: 3 })
    expect(props(result).currentPage).toBe(3)
  })

  test.each([
    ['tamaño', (p: ReturnType<typeof props>) => p.onPageSizeChange?.(50), { pageSize: 50 }],
    [
      'orden',
      (p: ReturnType<typeof props>) =>
        p.onSortChange?.({ columnAccessor: 'importe', direction: 'asc' } as never),
      { sortBy: 'importe', sortDir: 'asc' },
    ],
    ['búsqueda', (p: ReturnType<typeof props>) => p.onSearchChange?.('pan'), { searchQuery: 'pan' }],
  ])('cambiar el %s vuelve a la página 1', (_nombre, cambiar, esperado) => {
    const { result, ultima } = montar()
    act(() => props(result).onPageChange?.(4))

    act(() => cambiar(props(result)))

    expect(ultima().paginacion).toMatchObject({ page: 1, ...esperado })
  })

  test('los filtros de columna llegan como igualdades planas, sin los vacíos, y vuelven a la página 1', () => {
    const { result, ultima } = montar({ baseFilter: { desde: '2026-03-01' } })
    act(() => props(result).onPageChange?.(2))

    act(() =>
      props(result).onFiltersChange?.({
        categoriaId: { operator: 'equals', value: 'cat-1' },
        importe: { operator: 'equals', value: 250 },
        vacio: { operator: 'equals', value: '' },
        nulo: { operator: 'equals', value: null },
      }),
    )

    expect(ultima().filtros).toEqual({ desde: '2026-03-01', categoriaId: 'cat-1', importe: '250' })
    expect(ultima().paginacion).toMatchObject({ page: 1 })
    expect(result.current.columnFilters).toEqual({ categoriaId: 'cat-1', importe: '250' })
  })

  test('sin total del servidor, la tabla recibe 0 y no undefined', () => {
    const hook = vi.fn(() => ({ query: { isFetching: true }, result: { data: undefined, total: undefined } }))
    const { result } = renderHook(() => usePaginacion(hook as never))

    expect(props(result).serverTotalRecords).toBe(0)
    expect(result.current.data).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })
})

describe('modo cliente', () => {
  test('pide el conjunto entero y no le pasa nada manual a la tabla', () => {
    const { result, ultima } = montar({ server: false, baseFilter: { tipo: 'expense' } })

    expect(ultima().paginacion).toEqual({ paginate: false })
    expect(ultima().filtros).toEqual({ tipo: 'expense' })
    expect(props(result)).toEqual({})
  })
})
