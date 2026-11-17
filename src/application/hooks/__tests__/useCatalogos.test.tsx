/**
 * Las opciones de los formularios: el catálogo del usuario (sus categorías,
 * que cambian) y el metadata (enumeraciones cerradas, que no).
 */

import { describe, expect, test, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { nuevoQueryClient } from '@/test/render'
import { EMPTY_FORM_METADATA } from '@/src/types/formMetadata.types'
import { useCatalogos } from '../useCatalogos'
import { useFormMetadata } from '../useFormMetadata'

const acciones = vi.hoisted(() => ({ fetchCatalogos: vi.fn(), fetchFormMetadata: vi.fn() }))
vi.mock('@/src/application/actions/entity.actions', () => acciones)

const montar = <T,>(hook: () => T) => {
  const queryClient = nuevoQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(hook, { wrapper })
}

describe('useCatalogos', () => {
  test('parte las categorías por tipo, ordenadas en castellano', async () => {
    acciones.fetchCatalogos.mockResolvedValue({
      ok: true,
      data: {
        categorias: [
          { id: 'c3', nombre: 'Ocio', tipo: 'expense', color: 'cat-3' },
          { id: 'c1', nombre: 'Nómina', tipo: 'income', color: null },
          { id: 'c2', nombre: 'Álquiler', tipo: 'expense', color: 'cat-1' },
          { id: 'c4', nombre: 'Rara', tipo: 'desconocido', color: 'cat-2' },
        ],
      },
    })

    const { result } = montar(() => useCatalogos())

    await waitFor(() => expect(result.current.categorias).toHaveLength(4))
    expect(result.current.categoriasPorTipo).toEqual({
      // "Á" se ordena con la "A", no detrás de la "Z".
      expense: [
        { value: 'c2', label: 'Álquiler' },
        { value: 'c3', label: 'Ocio' },
      ],
      income: [{ value: 'c1', label: 'Nómina' }],
    })
    expect(result.current.colorDeCategoria.get('c3')).toBe('cat-3')
    // Sin color es cadena vacía: el badge cae a su tono por defecto.
    expect(result.current.colorDeCategoria.get('c1')).toBe('')
  })

  test('mientras carga (o si falla) da listas vacías, nunca undefined', async () => {
    acciones.fetchCatalogos.mockResolvedValue({ ok: false, error: 'No autorizado' })

    const { result } = montar(() => useCatalogos())

    expect(result.current.isLoadingCatalogos).toBe(true)
    expect(result.current.categoriasPorTipo).toEqual({ income: [], expense: [] })
    await waitFor(() => expect(result.current.isLoadingCatalogos).toBe(false))
    expect(result.current.categorias).toEqual([])
  })
})

describe('useFormMetadata', () => {
  test('pide el metadata del recurso', async () => {
    const metadata = { readOnlyFields: ['tipo'], enumFields: { tipo: [{ key: 'income', label: 'Ingreso' }] } }
    acciones.fetchFormMetadata.mockResolvedValue({ ok: true, data: metadata })

    const { result } = montar(() => useFormMetadata('Categorias'))

    await waitFor(() => expect(result.current.metadata).toEqual(metadata))
    expect(acciones.fetchFormMetadata).toHaveBeenCalledWith('Categorias')
  })

  test('sin recurso no pide nada y da el metadata vacío', async () => {
    const { result } = montar(() => useFormMetadata())

    await act(async () => {})
    expect(acciones.fetchFormMetadata).not.toHaveBeenCalled()
    expect(result.current.metadata).toBe(EMPTY_FORM_METADATA)
    expect(result.current.isLoadingMetadata).toBe(false)
  })

  test('si falla, el formulario se pinta con el metadata vacío', async () => {
    acciones.fetchFormMetadata.mockResolvedValue({ ok: false, error: 'No autorizado' })

    const { result } = montar(() => useFormMetadata('Categorias'))

    await waitFor(() => expect(result.current.isLoadingMetadata).toBe(false))
    expect(result.current.metadata).toBe(EMPTY_FORM_METADATA)
  })
})
