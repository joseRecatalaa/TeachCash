/**
 * El submit genérico de los formularios. Lo que más importa aquí es lo que no
 * se ve: que toda mutación que sale bien tire lo derivado (`['informes']`).
 * Sin eso se anota un gasto y la portada sigue enseñando el saldo de antes, y
 * la cifra vieja no parece un error: parece un dato.
 */

import { describe, expect, test, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { nuevoQueryClient } from '@/test/render'
import { envoltorioRefine } from '@/test/refine'
import { useEntityFormSubmit } from '../useEntityFormSubmit'

const acciones = vi.hoisted(() => ({ createEntity: vi.fn(), updateEntity: vi.fn() }))
vi.mock('@/src/application/actions/entity.actions', () => acciones)
vi.mock('@/src/application/actions/auth.actions', () => ({}))
vi.mock('@/src/application/actions/informes.actions', () => ({}))

const avisos = vi.hoisted(() => ({ show: vi.fn() }))
vi.mock('@mantine/notifications', () => ({ notifications: avisos }))

type Config = Parameters<typeof useEntityFormSubmit>[0]

const montar = (config: Partial<Config> = {}) => {
  const queryClient = nuevoQueryClient()
  const invalidar = vi.spyOn(queryClient, 'invalidateQueries')
  const { result } = renderHook(
    () => useEntityFormSubmit({ resource: 'Movimientos', entityName: 'Movimiento', mode: 'create', genero: 'm', ...config }),
    { wrapper: envoltorioRefine(queryClient) },
  )
  return { result, invalidar }
}

const invalidoInformes = (invalidar: ReturnType<typeof vi.spyOn>) =>
  invalidar.mock.calls.some(([filtro]: unknown[]) => JSON.stringify((filtro as { queryKey?: unknown })?.queryKey) === '["informes"]')

describe('crear', () => {
  test('crea, invalida los informes y avisa en el género de la entidad', async () => {
    acciones.createEntity.mockResolvedValue({ ok: true, data: { id: 'nuevo' } })
    const { result, invalidar } = montar()

    let devuelto: unknown
    await act(async () => {
      devuelto = await result.current.handleSubmit({ importe: 250 })
    })

    expect(acciones.createEntity).toHaveBeenCalledWith('Movimientos', { importe: 250 })
    expect(devuelto).toEqual({ id: 'nuevo' })
    expect(invalidoInformes(invalidar)).toBe(true)
    expect(avisos.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Movimiento creado correctamente' }),
    )
  })

  test('el femenino es el de por defecto', async () => {
    acciones.createEntity.mockResolvedValue({ ok: true, data: { id: 'nueva' } })
    const { result } = montar({ resource: 'Categorias', entityName: 'Categoría', genero: undefined })

    await act(() => result.current.handleSubmit({}))

    expect(avisos.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Categoría creada correctamente' }),
    )
  })
})

describe('editar', () => {
  test('actualiza por id, invalida los informes y avisa', async () => {
    acciones.updateEntity.mockResolvedValue({ ok: true, data: { id: 'm1' } })
    const { result, invalidar } = montar({ mode: 'edit', id: 'm1' })

    await act(() => result.current.handleSubmit({ importe: 300 }))

    expect(acciones.updateEntity).toHaveBeenCalledWith('Movimientos', 'm1', { importe: 300 })
    expect(invalidoInformes(invalidar)).toBe(true)
    expect(avisos.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Movimiento actualizado correctamente' }),
    )
  })

  test('el femenino también en la edición', async () => {
    acciones.updateEntity.mockResolvedValue({ ok: true, data: { id: 'c1' } })
    const { result } = montar({ mode: 'edit', id: 'c1', entityName: 'Categoría', genero: 'f' })

    await act(() => result.current.handleSubmit({}))

    expect(avisos.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Categoría actualizada correctamente' }),
    )
  })

  test('sin id es un bug de cableado: no llama a nada y lo dice', async () => {
    const { result } = montar({ mode: 'edit' })

    let devuelto: unknown = 'sin tocar'
    await act(async () => {
      devuelto = await result.current.handleSubmit({})
    })

    expect(devuelto).toBeUndefined()
    expect(acciones.updateEntity).not.toHaveBeenCalled()
    expect(avisos.show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Falta el identificador del registro a editar' }),
    )
  })
})

describe('cuando falla', () => {
  test('devuelve undefined, guarda los errores por campo y NO invalida nada', async () => {
    acciones.createEntity.mockResolvedValue({
      ok: false,
      error: 'Revisa los campos marcados',
      fieldErrors: { importe: 'Tiene que ser mayor que cero' },
    })
    const { result, invalidar } = montar()

    let devuelto: unknown = 'sin tocar'
    await act(async () => {
      devuelto = await result.current.handleSubmit({ importe: 0 })
    })

    expect(devuelto).toBeUndefined()
    expect(result.current.fieldErrors).toEqual({ importe: 'Tiene que ser mayor que cero' })
    expect(invalidoInformes(invalidar)).toBe(false)
    expect(avisos.show).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'No se ha podido guardar', message: 'Revisa los campos marcados' }),
    )
  })

  test('el siguiente intento empieza sin los errores del anterior', async () => {
    acciones.createEntity
      .mockResolvedValueOnce({ ok: false, error: 'Mal', fieldErrors: { importe: 'Mal' } })
      .mockResolvedValueOnce({ ok: true, data: { id: 'ok' } })
    const { result } = montar()

    await act(() => result.current.handleSubmit({}))
    await act(() => result.current.handleSubmit({}))

    expect(result.current.fieldErrors).toEqual({})
  })

  test('mientras guarda, isSubmitting está activo', async () => {
    let terminar: (v: unknown) => void = () => {}
    acciones.createEntity.mockReturnValue(new Promise((r) => (terminar = r)))
    const { result } = montar()

    let envio: Promise<unknown> = Promise.resolve()
    act(() => {
      envio = result.current.handleSubmit({})
    })
    await vi.waitFor(() => expect(result.current.isSubmitting).toBe(true))

    await act(async () => {
      terminar({ ok: true, data: { id: 'x' } })
      await envio
    })
    expect(result.current.isSubmitting).toBe(false)
  })
})
