import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '@/db/testing'
import { categories, transactions } from '@/db/schema'

let ctx: TestDb

const now = new Date('2026-08-13T10:00:00Z')

const seedCategoria = async (id: string, userId = 'user-a') => {
  await ctx.db.insert(categories).values({
    id,
    userId,
    name: `Categoría ${id}`,
    kind: 'expense',
    createdAt: now,
  })
  return id
}

beforeEach(async () => {
  ctx = await createTestDb()
})

afterEach(() => ctx.close())

describe('esquema', () => {
  test('las migraciones crean las dos tablas', async () => {
    await seedCategoria('cat-1')
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: 'user-a',
      categoryId: 'cat-1',
      amount: -100,
      date: '2026-08-13',
      description: 'Compra',
      createdAt: now,
    })
    expect(await ctx.db.select().from(categories)).toHaveLength(1)
    expect(await ctx.db.select().from(transactions)).toHaveLength(1)
  })

  test('los importes viajan como enteros de ida y vuelta', async () => {
    await seedCategoria('cat-1')
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: 'user-a',
      categoryId: 'cat-1',
      amount: -123456,
      date: '2026-08-13',
      description: 'Compra',
      createdAt: now,
    })
    const [tx] = await ctx.db.select().from(transactions).where(eq(transactions.id, 'tx-1'))
    // Si la columna fuera real/float, esto volvería como -123456.00000000001 algún día.
    expect(Number.isInteger(tx.amount)).toBe(true)
    expect(tx.amount).toBe(-123456)
  })

  test('la fecha se guarda como texto, no como instante', async () => {
    await seedCategoria('cat-1')
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: 'user-a',
      categoryId: 'cat-1',
      amount: -100,
      date: '2026-01-01',
      description: 'Uvas',
      createdAt: now,
    })
    const [tx] = await ctx.db.select().from(transactions)
    // El día 1 sigue siendo el día 1 en cualquier huso: no hay conversión posible.
    expect(tx.date).toBe('2026-01-01')
  })

  test('las claves ajenas están activas', async () => {
    // La única FK que queda es la de categoría. Si `PRAGMA foreign_keys` se
    // apagara, este insert pasaría y un movimiento podría quedar apuntando a una
    // categoría borrada — que es como se rompen los informes de meses cerrados.
    await expect(
      ctx.db.insert(transactions).values({
        id: 'tx-huerfano',
        userId: 'user-a',
        categoryId: 'categoria-que-no-existe',
        amount: -100,
        date: '2026-08-13',
        description: 'Fantasma',
        createdAt: now,
      }),
    ).rejects.toThrow()
  })

  test('un movimiento sin categoría no es válido', async () => {
    // La categoría es obligatoria: no existe el estado "sin clasificar". El
    // tipo ya lo impide en compilación (`categoryId` es requerido en el
    // insert); el `as never` fuerza el caso para comprobar que la base
    // también lo rechaza en runtime, no solo el compilador.
    await expect(
      ctx.db.insert(transactions).values({
        id: 'tx-1',
        userId: 'user-a',
        amount: -100,
        date: '2026-08-13',
        description: 'Sin clasificar',
        createdAt: now,
      } as never),
    ).rejects.toThrow()
  })

  test('la clave de idempotencia impide el movimiento duplicado', async () => {
    await seedCategoria('cat-1')
    const base = {
      userId: 'user-a',
      categoryId: 'cat-1',
      amount: -5000,
      date: '2026-08-13',
      description: 'Doble clic',
      idempotencyKey: 'clave-1',
      createdAt: now,
    }
    await ctx.db.insert(transactions).values({ ...base, id: 'tx-1' })
    // El segundo envío del mismo formulario choca contra el índice en lugar de
    // crear dinero que no existe.
    await expect(ctx.db.insert(transactions).values({ ...base, id: 'tx-2' })).rejects.toThrow()
  })

  test('varios movimientos sin clave de idempotencia conviven', async () => {
    // SQLite trata dos NULL como distintos, así que el UNIQUE no estorba a los
    // movimientos creados sin clave (importaciones, semillas, scripts).
    await seedCategoria('cat-1')
    await ctx.db.insert(transactions).values([
      { id: 'tx-1', userId: 'user-a', categoryId: 'cat-1', amount: -1, date: '2026-08-13', description: 'A', createdAt: now },
      { id: 'tx-2', userId: 'user-a', categoryId: 'cat-1', amount: -2, date: '2026-08-13', description: 'B', createdAt: now },
    ])
    expect(await ctx.db.select().from(transactions)).toHaveLength(2)
  })

  test('las categorías por defecto son de un solo tipo', async () => {
    await ctx.db.insert(categories).values({
      id: 'cat-1',
      userId: 'user-a',
      name: 'Alimentación',
      kind: 'expense',
      createdAt: now,
    })
    const [cat] = await ctx.db.select().from(categories)
    expect(cat.kind).toBe('expense')
    expect(cat.color).toBeNull()
  })
})
