/**
 * El freno general: con la base por encima de `MAX_TAMANO_BASE` no se crean
 * movimientos ni categorías, pero se sigue pudiendo editar y borrar (borrar es
 * lo que libera sitio). El tope se pone a un byte con un mock para "llenar" la
 * base de test sin escribir 400 MB.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'

const h = vi.hoisted(() => ({ tope: Number.MAX_SAFE_INTEGER }))

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/src/types/limites.types', async (original) => ({
  ...(await original<typeof import('@/src/types/limites.types')>()),
  get MAX_TAMANO_BASE() {
    return h.tope
  },
}))

import { usarBaseDeTest } from '@/test/harness'
import { BASE_LLENA, hayEspacioEnLaBase } from '../capacidad.repository'
import { categoriasRepository } from '../categorias.repository'
import { movimientosRepository } from '../movimientos.repository'
import { seedCategoria, seedMovimiento, USER_A } from './helpers'

const base = usarBaseDeTest()

beforeEach(() => {
  h.tope = Number.MAX_SAFE_INTEGER
})

const llenar = () => {
  h.tope = 1
  return vi.spyOn(console, 'warn').mockImplementation(() => {})
}

const movimiento = (categoriaId: string) => ({
  categoriaId,
  importe: 100,
  sentido: 'expense',
  fecha: '2026-03-15',
  descripcion: 'Café',
  notas: '',
})

describe('hayEspacioEnLaBase', () => {
  test('con sitio, sí', async () => {
    expect(await hayEspacioEnLaBase()).toBe(true)
  })

  test('llena, no, y deja un evento para la alerta', async () => {
    const aviso = llenar()
    expect(await hayEspacioEnLaBase()).toBe(false)
    expect(JSON.parse(String(aviso.mock.calls.at(-1)?.[0]))).toMatchObject({
      evento: 'capacidad',
      resultado: 'bloqueo',
    })
  })
})

describe('con la base llena', () => {
  test('no se crea un movimiento', async () => {
    const categoriaId = await seedCategoria(base().db, 'cat', USER_A, { kind: 'expense' })
    llenar()
    await expect(movimientosRepository.create(USER_A, movimiento(categoriaId))).rejects.toThrow(BASE_LLENA)
  })

  test('no se crea una categoría', async () => {
    llenar()
    await expect(
      categoriasRepository.create(USER_A, { nombre: 'Nueva', tipo: 'income', icono: '', color: '', presupuesto: null }),
    ).rejects.toThrow(BASE_LLENA)
  })

  test('se puede editar y borrar lo que ya hay', async () => {
    const categoriaId = await seedCategoria(base().db, 'cat', USER_A, { kind: 'expense' })
    await seedMovimiento(base().db, 'mov', USER_A, { categoryId: categoriaId })
    llenar()
    const { rows } = await base().pg.query<{ id: string }>('select id from transactions limit 1')
    const id = rows[0].id
    await expect(movimientosRepository.update(USER_A, id, movimiento(categoriaId))).resolves.toEqual({ id })
    await expect(movimientosRepository.remove(USER_A, id)).resolves.toEqual({ id })
  })
})
