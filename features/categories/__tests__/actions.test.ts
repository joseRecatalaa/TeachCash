import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

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
import { accounts, categories, transactions } from '@/db/schema'
import { idleState } from '@/lib/forms'
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/features/categories/actions'
import { listCategories } from '@/features/categories/queries'

let ctx: TestDb

const form = (values: Record<string, string>): FormData => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.append(k, v)
  return fd
}

const seedCategory = async (
  id: string,
  userId: string,
  overrides: Partial<typeof categories.$inferInsert> = {},
) => {
  await ctx.db.insert(categories).values({
    id,
    userId,
    name: `Categoría ${id}`,
    kind: 'expense',
    parentId: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  })
}

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
  h.userId = 'user-a'
})

afterEach(() => ctx.close())

describe('createCategory', () => {
  test('crea una categoría raíz', async () => {
    const result = await createCategory(idleState, form({ name: 'Ocio', kind: 'expense' }))
    expect(result.status).toBe('success')

    const [row] = await ctx.db.select().from(categories)
    expect(row.userId).toBe('user-a')
    expect(row.parentId).toBeNull()
  })

  test('rechaza un nombre duplicado en la raíz', async () => {
    // Aquí no protege la base de datos: el UNIQUE incluye parent_id y SQLite
    // trata dos NULL como distintos, así que dos raíces homónimas entrarían.
    await seedCategory('cat-1', 'user-a', { name: 'Ocio' })

    const result = await createCategory(idleState, form({ name: 'ocio', kind: 'expense' }))

    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(categories)).toHaveLength(1)
  })

  test('rechaza una categoría padre de otro usuario', async () => {
    await seedCategory('cat-b', 'user-b')

    const result = await createCategory(
      idleState,
      form({ name: 'Restaurantes', kind: 'expense', parentId: 'cat-b' }),
    )

    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(categories).where(eq(categories.userId, 'user-a'))).toHaveLength(0)
  })

  test('rechaza colgar un gasto de una categoría de ingresos', async () => {
    await seedCategory('cat-in', 'user-a', { kind: 'income', name: 'Nómina' })

    const result = await createCategory(
      idleState,
      form({ name: 'Restaurantes', kind: 'expense', parentId: 'cat-in' }),
    )

    expect(result.status).toBe('error')
  })

  test('rechaza el segundo nivel de anidamiento', async () => {
    await seedCategory('cat-raiz', 'user-a', { name: 'Comida' })
    await seedCategory('cat-hija', 'user-a', { name: 'Restaurantes', parentId: 'cat-raiz' })

    const result = await createCategory(
      idleState,
      form({ name: 'Japonés', kind: 'expense', parentId: 'cat-hija' }),
    )

    expect(result.status).toBe('error')
  })

  test('permite el mismo nombre bajo padres distintos', async () => {
    await seedCategory('cat-1', 'user-a', { name: 'Comida' })
    await seedCategory('cat-2', 'user-a', { name: 'Viajes' })

    await createCategory(idleState, form({ name: 'Extras', kind: 'expense', parentId: 'cat-1' }))
    const result = await createCategory(
      idleState,
      form({ name: 'Extras', kind: 'expense', parentId: 'cat-2' }),
    )

    expect(result.status).toBe('success')
  })
})

describe('autorización', () => {
  test('no se puede renombrar la categoría de otro usuario', async () => {
    await seedCategory('cat-a', 'user-a', { name: 'Original' })
    h.userId = 'user-b'

    const result = await updateCategory(idleState, form({ id: 'cat-a', name: 'Robada' }))

    expect(result.status).toBe('error')
    const [row] = await ctx.db.select().from(categories).where(eq(categories.id, 'cat-a'))
    expect(row.name).toBe('Original')
  })

  test('no se puede borrar la categoría de otro usuario', async () => {
    await seedCategory('cat-a', 'user-a')
    h.userId = 'user-b'

    await deleteCategory(idleState, form({ id: 'cat-a' }))

    expect(await ctx.db.select().from(categories)).toHaveLength(1)
  })

  test('el listado solo trae las del usuario', async () => {
    await seedCategory('cat-a', 'user-a')
    await seedCategory('cat-b', 'user-b')

    expect((await listCategories('user-a')).map((c) => c.id)).toEqual(['cat-a'])
  })

  test('se puede filtrar por tipo', async () => {
    await seedCategory('cat-gasto', 'user-a', { kind: 'expense', name: 'Ocio' })
    await seedCategory('cat-ingreso', 'user-a', { kind: 'income', name: 'Nómina' })

    const ingresos = await listCategories('user-a', { kind: 'income' })
    expect(ingresos.map((c) => c.id)).toEqual(['cat-ingreso'])
  })
})

describe('deleteCategory', () => {
  test('no borra una categoría en uso', async () => {
    await seedCategory('cat-a', 'user-a')
    await ctx.db.insert(accounts).values({
      id: 'acc-1',
      userId: 'user-a',
      name: 'Cuenta',
      type: 'checking',
      currency: 'EUR',
      openingBalance: 0,
      createdAt: new Date(),
    })
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: 'user-a',
      accountId: 'acc-1',
      categoryId: 'cat-a',
      amount: -1000,
      date: '2026-08-13',
      description: 'Compra',
      createdAt: new Date(),
    })

    const result = await deleteCategory(idleState, form({ id: 'cat-a' }))

    // Borrarla dejaría el movimiento sin clasificar sin que nadie se entere.
    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(categories)).toHaveLength(1)
  })

  test('no borra una categoría con subcategorías', async () => {
    await seedCategory('cat-raiz', 'user-a', { name: 'Comida' })
    await seedCategory('cat-hija', 'user-a', { name: 'Restaurantes', parentId: 'cat-raiz' })

    const result = await deleteCategory(idleState, form({ id: 'cat-raiz' }))

    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(categories)).toHaveLength(2)
  })

  test('borra una categoría suelta', async () => {
    await seedCategory('cat-a', 'user-a')
    const result = await deleteCategory(idleState, form({ id: 'cat-a' }))
    expect(result.status).toBe('success')
    expect(await ctx.db.select().from(categories)).toHaveLength(0)
  })
})
