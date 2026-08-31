/**
 * El DataProvider contra las Server Actions.
 *
 * Es la costura entre las dos mitades de la aplicación, y la única pieza que no
 * cubre nadie más: los repositorios tienen sus propios tests y los hooks son de
 * Refine, pero la traducción de en medio —los `CrudFilter` de Refine al
 * `ListParams` del repositorio, y el `ActionResult` de vuelta a una excepción—
 * solo se comprueba aquí.
 *
 * El error más caro que puede tener este fichero es silencioso: un filtro que
 * no se traduce devuelve resultados de más sin que nada falle.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const h = vi.hoisted(() => ({
  db: null as unknown as import('@/db/client').Database,
  userId: 'user-a' as string | null,
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

vi.mock('@/lib/auth', () => ({
  LOCAL_USER_ID: 'user-a',
  getSession: async () => (h.userId ? { user: { id: h.userId } } : null),
  requireUserId: async () => {
    if (!h.userId) throw new Error('No autorizado')
    return h.userId
  },
}))

vi.mock('@/db', async () => {
  const schema = await import('@/db/schema')
  return {
    ...schema,
    get db() {
      return h.db
    },
  }
})

import { createTestDb, type TestDb } from '@/db/testing'
import type { CategoriaListDto } from '@/src/types/categoria.types'
import { DataProviderError, dataProvider } from '../refine-data-provider'
import { seedCategoria, USER_A, USER_B } from '@/src/infrastructure/repositories/__tests__/helpers'

let ctx: TestDb
const provider = dataProvider()

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
  h.userId = USER_A
})

afterEach(() => ctx.close())

/**
 * Categorías hace de recurso de PRUEBA. Aquí no se comprueba nada del dominio
 * de categorías —eso está en su test de repositorio—: lo que se ejercita es la
 * traducción genérica de Refine a Server Actions, y para recorrerla entera hace
 * falta un recurso real del mapa cerrado.
 */
const nueva = (overrides: Record<string, unknown> = {}) => ({
  nombre: 'Comida',
  tipo: 'expense',
  icono: '',
  color: '',
  presupuesto: 500,
  ...overrides,
})

describe('getList', () => {
  test('devuelve datos y total', async () => {
    await seedCategoria(ctx.db, 'c1', USER_A)
    await seedCategoria(ctx.db, 'c2', USER_A)

    const res = await provider.getList<CategoriaListDto>({ resource: 'Categorias' })
    expect(res.total).toBe(2)
    expect(res.data.map((c) => c.id).sort()).toEqual(['c1', 'c2'])
    // El contador llega entero, sin pasar por ninguna serialización que lo
    // convierta en decimal por el camino.
    expect(res.data[0].usos).toBe(0)
  })

  test('traduce los CrudFilter de Refine al filtro del repositorio', async () => {
    await seedCategoria(ctx.db, 'gasto', USER_A, { kind: 'expense' })
    await seedCategoria(ctx.db, 'ingreso', USER_A, { kind: 'income' })

    const res = await provider.getList<CategoriaListDto>({
      resource: 'Categorias',
      filters: [{ field: 'tipo', operator: 'eq', value: 'income' }],
    })

    // Si el filtro no se tradujera, esto devolvería las dos y no fallaría nada:
    // por eso el test compara la lista, no solo que no reviente.
    expect(res.data.map((c) => c.id)).toEqual(['ingreso'])
  })

  test('descarta los filtros vacíos en vez de filtrar por cadena vacía', async () => {
    await seedCategoria(ctx.db, 'c1', USER_A)

    const res = await provider.getList<CategoriaListDto>({
      resource: 'Categorias',
      filters: [{ field: 'tipo', operator: 'eq', value: '' }],
    })
    expect(res.total).toBe(1)
  })

  test('la ordenación de `sorters` gana a la de `meta`', async () => {
    await seedCategoria(ctx.db, 'c1', USER_A, { name: 'Aaa' })
    await seedCategoria(ctx.db, 'c2', USER_A, { name: 'Zzz' })

    const res = await provider.getList<CategoriaListDto>({
      resource: 'Categorias',
      sorters: [{ field: 'nombre', order: 'desc' }],
      meta: { sortBy: 'nombre', sortDir: 'asc' },
    })
    // `sorters` refleja el clic más reciente en la cabecera de la tabla.
    expect(res.data.map((c) => c.nombre)).toEqual(['Zzz', 'Aaa'])
  })

  test('la paginación de `meta` recorta los datos pero no el total', async () => {
    for (let i = 0; i < 5; i++) {
      await seedCategoria(ctx.db, `c${i}`, USER_A, { name: `Categoría ${i}` })
    }

    const res = await provider.getList<CategoriaListDto>({
      resource: 'Categorias',
      meta: { paginate: true, page: 1, pageSize: 2 },
    })
    expect(res.data).toHaveLength(2)
    expect(res.total).toBe(5)
  })

  test('la búsqueda global viaja por meta.searchQuery', async () => {
    await seedCategoria(ctx.db, 'c1', USER_A, { name: 'Alimentación' })
    await seedCategoria(ctx.db, 'c2', USER_A, { name: 'Transporte' })

    const res = await provider.getList<CategoriaListDto>({
      resource: 'Categorias',
      meta: { searchQuery: 'Aliment' },
    })
    expect(res.data.map((c) => c.id)).toEqual(['c1'])
  })
})

describe('el ciclo completo de escritura', () => {
  test('create → getOne → update → deleteOne', async () => {
    const creada = await provider.create({
      resource: 'Categorias',
      variables: nueva({ nombre: 'Comida', color: 'cat-2' }),
    })
    const id = String(creada.data.id)

    const leida = await provider.getOne({ resource: 'Categorias', id })
    expect(leida.data).toMatchObject({ nombre: 'Comida', color: 'cat-2' })

    await provider.update({
      resource: 'Categorias',
      id,
      variables: nueva({ nombre: 'Comida y bebida', color: 'cat-5' }),
    })
    const releida = await provider.getOne({ resource: 'Categorias', id })
    expect(releida.data).toMatchObject({ nombre: 'Comida y bebida', color: 'cat-5' })

    await provider.deleteOne({ resource: 'Categorias', id })
    const restantes = await provider.getList({ resource: 'Categorias' })
    expect(restantes.total).toBe(0)
  })
})

describe('los errores vuelven a ser excepciones en el cliente', () => {
  test('un fallo de validación llega como DataProviderError con sus fieldErrors', async () => {
    // Del lado del servidor viajó como VALOR; aquí, ya en el navegador, tiene
    // que volver a ser una excepción, que es lo que React Query espera.
    const fallo = await provider
      .create({
        resource: 'Categorias',
        variables: nueva({ nombre: '', tipo: 'inventado' }),
      })
      .catch((e) => e)

    expect(fallo).toBeInstanceOf(DataProviderError)
    expect(fallo.fieldErrors).toMatchObject({ tipo: expect.any(String) })
  })

  test('un registro ajeno da "No encontrado", no los datos', async () => {
    await seedCategoria(ctx.db, 'ajena', USER_B)

    await expect(provider.getOne({ resource: 'Categorias', id: 'ajena' })).rejects.toThrow(
      'No encontrado',
    )
  })

  test('sin sesión, ninguna operación pasa', async () => {
    h.userId = null
    await expect(provider.getList({ resource: 'Categorias' })).rejects.toThrow('No autorizado')
  })

  test('un recurso desconocido no ejecuta nada', async () => {
    await expect(provider.getList({ resource: 'Usuarios' })).rejects.toBeInstanceOf(
      DataProviderError,
    )
  })
})
