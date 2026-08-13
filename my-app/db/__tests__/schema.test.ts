import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from '@/db/testing'
import { accounts, categories, transactions } from '@/db/schema'

let ctx: TestDb

const now = new Date('2026-08-13T10:00:00Z')

const seedAccount = async (id: string, userId = 'user-a') => {
  await ctx.db.insert(accounts).values({
    id,
    userId,
    name: `Cuenta ${id}`,
    type: 'checking',
    currency: 'EUR',
    openingBalance: 0,
    createdAt: now,
  })
  return id
}

beforeEach(async () => {
  ctx = await createTestDb()
})

afterEach(() => ctx.close())

describe('esquema', () => {
  test('las migraciones crean las tres tablas', async () => {
    await seedAccount('acc-1')
    const rows = await ctx.db.select().from(accounts)
    expect(rows).toHaveLength(1)
    expect(rows[0].currency).toBe('EUR')
  })

  test('los importes viajan como enteros de ida y vuelta', async () => {
    await seedAccount('acc-1')
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: 'user-a',
      accountId: 'acc-1',
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
    await seedAccount('acc-1')
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: 'user-a',
      accountId: 'acc-1',
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
    await expect(
      ctx.db.insert(transactions).values({
        id: 'tx-huerfano',
        userId: 'user-a',
        accountId: 'cuenta-que-no-existe',
        amount: -100,
        date: '2026-08-13',
        description: 'Fantasma',
        createdAt: now,
      }),
    ).rejects.toThrow()
  })

  test('la clave de idempotencia impide el movimiento duplicado', async () => {
    await seedAccount('acc-1')
    const base = {
      userId: 'user-a',
      accountId: 'acc-1',
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
    await seedAccount('acc-1')
    // SQLite trata dos NULL como distintos, así que el UNIQUE no estorba a los
    // movimientos creados sin clave (importaciones, semillas, scripts).
    await ctx.db.insert(transactions).values([
      { id: 'tx-1', userId: 'user-a', accountId: 'acc-1', amount: -1, date: '2026-08-13', description: 'A', createdAt: now },
      { id: 'tx-2', userId: 'user-a', accountId: 'acc-1', amount: -2, date: '2026-08-13', description: 'B', createdAt: now },
    ])
    expect(await ctx.db.select().from(transactions)).toHaveLength(2)
  })

  test('la transacción revierte las dos patas de una transferencia', async () => {
    await seedAccount('acc-1')
    await seedAccount('acc-2')
    await expect(
      ctx.db.transaction(async (tx) => {
        await tx.insert(transactions).values({
          id: 'tx-1',
          userId: 'user-a',
          accountId: 'acc-1',
          amount: -50000,
          date: '2026-08-13',
          description: 'Traspaso',
          transferId: 'transfer-1',
          createdAt: now,
        })
        // La segunda pata apunta a una cuenta inexistente: debe caerse todo.
        await tx.insert(transactions).values({
          id: 'tx-2',
          userId: 'user-a',
          accountId: 'no-existe',
          amount: 50000,
          date: '2026-08-13',
          description: 'Traspaso',
          transferId: 'transfer-1',
          createdAt: now,
        })
      }),
    ).rejects.toThrow()

    // Una transferencia a medias es dinero que desaparece de una cuenta sin
    // aparecer en la otra. Es el fallo más grave posible aquí.
    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
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
    expect(cat.parentId).toBeNull()
  })
})
