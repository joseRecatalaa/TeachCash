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
import type { CuentaListDto } from '@/src/types/cuenta.types'
import { DataProviderError, dataProvider } from '../refine-data-provider'
import { seedCuenta, USER_A, USER_B } from '@/src/infrastructure/repositories/__tests__/helpers'

let ctx: TestDb
const provider = dataProvider()

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
  h.userId = USER_A
})

afterEach(() => ctx.close())

describe('getList', () => {
  test('devuelve datos y total', async () => {
    await seedCuenta(ctx.db, 'c1', USER_A, { openingBalance: 5000 })
    await seedCuenta(ctx.db, 'c2', USER_A)

    const res = await provider.getList<CuentaListDto>({ resource: 'Cuentas' })
    expect(res.total).toBe(2)
    expect(res.data.map((c) => c.id).sort()).toEqual(['c1', 'c2'])
    // El importe llega entero, sin pasar por ninguna serialización que lo
    // convierta en decimal por el camino.
    expect(res.data.find((c) => c.id === 'c1')!.saldo).toBe(5000)
  })

  test('traduce los CrudFilter de Refine al filtro del repositorio', async () => {
    await seedCuenta(ctx.db, 'corriente', USER_A, { type: 'checking' })
    await seedCuenta(ctx.db, 'ahorro', USER_A, { type: 'savings' })

    const res = await provider.getList<CuentaListDto>({
      resource: 'Cuentas',
      filters: [{ field: 'tipo', operator: 'eq', value: 'savings' }],
    })

    // Si el filtro no se tradujera, esto devolvería las dos y no fallaría nada:
    // por eso el test compara la lista, no solo que no reviente.
    expect(res.data.map((c) => c.id)).toEqual(['ahorro'])
  })

  test('descarta los filtros vacíos en vez de filtrar por cadena vacía', async () => {
    await seedCuenta(ctx.db, 'c1', USER_A)

    const res = await provider.getList<CuentaListDto>({
      resource: 'Cuentas',
      filters: [{ field: 'tipo', operator: 'eq', value: '' }],
    })
    expect(res.total).toBe(1)
  })

  test('la ordenación de `sorters` gana a la de `meta`', async () => {
    await seedCuenta(ctx.db, 'c1', USER_A, { name: 'Aaa' })
    await seedCuenta(ctx.db, 'c2', USER_A, { name: 'Zzz' })

    const res = await provider.getList<CuentaListDto>({
      resource: 'Cuentas',
      sorters: [{ field: 'nombre', order: 'desc' }],
      meta: { sortBy: 'nombre', sortDir: 'asc' },
    })
    // `sorters` refleja el clic más reciente en la cabecera de la tabla.
    expect(res.data.map((c) => c.nombre)).toEqual(['Zzz', 'Aaa'])
  })

  test('la paginación de `meta` recorta los datos pero no el total', async () => {
    for (let i = 0; i < 5; i++) {
      await seedCuenta(ctx.db, `c${i}`, USER_A, { name: `Cuenta ${i}` })
    }

    const res = await provider.getList<CuentaListDto>({
      resource: 'Cuentas',
      meta: { paginate: true, page: 1, pageSize: 2 },
    })
    expect(res.data).toHaveLength(2)
    expect(res.total).toBe(5)
  })

  test('la búsqueda global viaja por meta.searchQuery', async () => {
    await seedCuenta(ctx.db, 'c1', USER_A, { name: 'Nómina BBVA' })
    await seedCuenta(ctx.db, 'c2', USER_A, { name: 'Ahorro' })

    const res = await provider.getList<CuentaListDto>({
      resource: 'Cuentas',
      meta: { searchQuery: 'BBVA' },
    })
    expect(res.data.map((c) => c.id)).toEqual(['c1'])
  })
})

describe('el ciclo completo de escritura', () => {
  test('create → getOne → update → deleteOne', async () => {
    const creada = await provider.create({
      resource: 'Cuentas',
      variables: { nombre: 'Nómina', tipo: 'checking', divisa: 'EUR', saldoInicial: 1000 },
    })
    const id = String(creada.data.id)

    const leida = await provider.getOne({ resource: 'Cuentas', id })
    expect(leida.data).toMatchObject({ nombre: 'Nómina', saldoInicial: 1000 })

    await provider.update({
      resource: 'Cuentas',
      id,
      variables: { nombre: 'Nómina 2', tipo: 'savings', saldoInicial: 2000 },
    })
    const releida = await provider.getOne({ resource: 'Cuentas', id })
    expect(releida.data).toMatchObject({ nombre: 'Nómina 2', saldoInicial: 2000 })

    await provider.deleteOne({ resource: 'Cuentas', id })
    const restantes = await provider.getList({ resource: 'Cuentas' })
    expect(restantes.total).toBe(0)
  })
})

describe('los errores vuelven a ser excepciones en el cliente', () => {
  test('un fallo de validación llega como DataProviderError con sus fieldErrors', async () => {
    // Del lado del servidor viajó como VALOR; aquí, ya en el navegador, tiene
    // que volver a ser una excepción, que es lo que React Query espera.
    const fallo = await provider
      .create({
        resource: 'Cuentas',
        variables: { nombre: '', tipo: 'inventado', divisa: 'EUR', saldoInicial: 0 },
      })
      .catch((e) => e)

    expect(fallo).toBeInstanceOf(DataProviderError)
    expect(fallo.fieldErrors).toMatchObject({ tipo: expect.any(String) })
  })

  test('un registro ajeno da "No encontrado", no los datos', async () => {
    await seedCuenta(ctx.db, 'ajena', USER_B)

    await expect(provider.getOne({ resource: 'Cuentas', id: 'ajena' })).rejects.toThrow(
      'No encontrado',
    )
  })

  test('sin sesión, ninguna operación pasa', async () => {
    h.userId = null
    await expect(provider.getList({ resource: 'Cuentas' })).rejects.toThrow('No autorizado')
  })

  test('un recurso desconocido no ejecuta nada', async () => {
    await expect(provider.getList({ resource: 'Usuarios' })).rejects.toBeInstanceOf(
      DataProviderError,
    )
  })
})
