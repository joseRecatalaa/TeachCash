import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { eq, isNull } from 'drizzle-orm'

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
  createTransaction,
  createTransfer,
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
} from '@/features/transactions/actions'
import {
  getBalanceSeries,
  getMonthTotals,
  getSpendByCategory,
  listTransactions,
} from '@/features/transactions/queries'
import { listAccounts } from '@/features/accounts/queries'

let ctx: TestDb

const form = (values: Record<string, string>): FormData => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.append(k, v)
  return fd
}

const seedAccount = async (
  id: string,
  userId = 'user-a',
  overrides: Partial<typeof accounts.$inferInsert> = {},
) => {
  await ctx.db.insert(accounts).values({
    id,
    userId,
    name: `Cuenta ${id}`,
    type: 'checking',
    currency: 'EUR',
    openingBalance: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  })
}

const seedCategory = async (
  id: string,
  userId = 'user-a',
  overrides: Partial<typeof categories.$inferInsert> = {},
) => {
  await ctx.db.insert(categories).values({
    id,
    userId,
    name: `Categoría ${id}`,
    kind: 'expense',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  })
}

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
  h.userId = 'user-a'
  await seedAccount('acc-1')
  await seedAccount('acc-2', 'user-a', { name: 'Ahorro', type: 'savings' })
  await seedCategory('cat-gasto', 'user-a', { name: 'Alimentación', kind: 'expense' })
  await seedCategory('cat-ingreso', 'user-a', { name: 'Nómina', kind: 'income' })
})

afterEach(() => ctx.close())

describe('createTransaction', () => {
  test('un gasto se guarda con importe negativo', async () => {
    const result = await createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        categoryId: 'cat-gasto',
        direction: 'expense',
        amount: '45,90',
        date: '2026-08-13',
        description: 'Mercadona',
      }),
    )

    expect(result.status).toBe('success')
    const [tx] = await ctx.db.select().from(transactions)
    // El usuario escribe 45,90 sin signo; la convención de signo es interna.
    expect(tx.amount).toBe(-4590)
    expect(tx.userId).toBe('user-a')
  })

  test('un ingreso se guarda con importe positivo', async () => {
    await createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        categoryId: 'cat-ingreso',
        direction: 'income',
        amount: '1.850,00',
        date: '2026-08-01',
        description: 'Nómina agosto',
      }),
    )

    const [tx] = await ctx.db.select().from(transactions)
    expect(tx.amount).toBe(185000)
  })

  test('rechaza un importe de cero', async () => {
    const result = await createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        direction: 'expense',
        amount: '0',
        date: '2026-08-13',
        description: 'Nada',
      }),
    )
    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
  })

  test('rechaza una fecha que no existe', async () => {
    const result = await createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        direction: 'expense',
        amount: '10',
        date: '2026-02-30',
        description: 'Imposible',
      }),
    )
    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
  })

  test('rechaza una categoría de ingresos en un gasto', async () => {
    const result = await createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        categoryId: 'cat-ingreso',
        direction: 'expense',
        amount: '10',
        date: '2026-08-13',
        description: 'Cruzada',
      }),
    )
    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
  })

  test('la clave de idempotencia evita el duplicado por doble clic', async () => {
    const data = {
      accountId: 'acc-1',
      direction: 'expense',
      amount: '20',
      date: '2026-08-13',
      description: 'Doble clic',
      idempotencyKey: 'clave-formulario-1',
    }

    const first = await createTransaction(idleState, form(data))
    const second = await createTransaction(idleState, form(data))

    expect(first.status).toBe('success')
    // El segundo envío responde bien, pero no crea dinero que no existe.
    expect(second.status).toBe('success')
    expect(await ctx.db.select().from(transactions)).toHaveLength(1)
  })
})

describe('autorización', () => {
  test('no se puede usar la cuenta de otro usuario', async () => {
    await seedAccount('acc-b', 'user-b')

    const result = await createTransaction(
      idleState,
      form({
        accountId: 'acc-b',
        direction: 'expense',
        amount: '10',
        date: '2026-08-13',
        description: 'Ajena',
      }),
    )

    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
  })

  test('no se puede usar la categoría de otro usuario', async () => {
    await seedCategory('cat-b', 'user-b')

    const result = await createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        categoryId: 'cat-b',
        direction: 'expense',
        amount: '10',
        date: '2026-08-13',
        description: 'Ajena',
      }),
    )

    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
  })

  test('no se puede editar el movimiento de otro usuario', async () => {
    await seedAccount('acc-b', 'user-b')
    await ctx.db.insert(transactions).values({
      id: 'tx-b',
      userId: 'user-b',
      accountId: 'acc-b',
      amount: -1000,
      date: '2026-08-13',
      description: 'Suya',
      createdAt: new Date(),
    })
    h.userId = 'user-a'

    const result = await updateTransaction(
      idleState,
      form({
        id: 'tx-b',
        accountId: 'acc-1',
        direction: 'expense',
        amount: '999',
        date: '2026-08-13',
        description: 'Robada',
      }),
    )

    expect(result.status).toBe('error')
    const [tx] = await ctx.db.select().from(transactions).where(eq(transactions.id, 'tx-b'))
    expect(tx.amount).toBe(-1000)
    expect(tx.description).toBe('Suya')
  })

  test('no se puede borrar el movimiento de otro usuario', async () => {
    await seedAccount('acc-b', 'user-b')
    await ctx.db.insert(transactions).values({
      id: 'tx-b',
      userId: 'user-b',
      accountId: 'acc-b',
      amount: -1000,
      date: '2026-08-13',
      description: 'Suya',
      createdAt: new Date(),
    })

    await deleteTransaction(idleState, form({ id: 'tx-b' }))

    const [tx] = await ctx.db.select().from(transactions).where(eq(transactions.id, 'tx-b'))
    expect(tx.deletedAt).toBeNull()
  })

  test('una transferencia con una cuenta ajena no se crea', async () => {
    await seedAccount('acc-b', 'user-b')

    const result = await createTransfer(
      idleState,
      form({
        fromAccountId: 'acc-1',
        toAccountId: 'acc-b',
        amount: '500',
        date: '2026-08-13',
        description: 'Fuga',
      }),
    )

    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
  })
})

describe('transferencias', () => {
  const transfer = () =>
    createTransfer(
      idleState,
      form({
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: '500,00',
        date: '2026-08-13',
        description: 'Al ahorro',
      }),
    )

  test('crea dos patas que suman cero', async () => {
    await transfer()

    const rows = await ctx.db.select().from(transactions)
    expect(rows).toHaveLength(2)
    expect(rows.reduce((acc, r) => acc + r.amount, 0)).toBe(0)
    expect(new Set(rows.map((r) => r.transferId)).size).toBe(1)
    expect(rows.every((r) => r.transferId !== null)).toBe(true)
  })

  test('mueve el saldo de las dos cuentas', async () => {
    await transfer()

    const list = await listAccounts('user-a')
    const origen = list.find((a) => a.id === 'acc-1')!
    const destino = list.find((a) => a.id === 'acc-2')!

    expect(origen.balance.amount).toBe(-50000)
    expect(destino.balance.amount).toBe(50000)
  })

  test('NO aparece como gasto en el informe por categoría', async () => {
    await transfer()
    await createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        categoryId: 'cat-gasto',
        direction: 'expense',
        amount: '45,90',
        date: '2026-08-13',
        description: 'Mercadona',
      }),
    )

    const spend = await getSpendByCategory('user-a', '2026-08')

    // Si la transferencia colara aquí, el usuario vería que "gastó" 500 € que
    // solo movió al ahorro.
    expect(spend).toHaveLength(1)
    expect(spend[0].categoryName).toBe('Alimentación')
    expect(spend[0].total.amount).toBe(-4590)
  })

  test('NO cuenta en los totales del mes', async () => {
    await transfer()
    const totals = await getMonthTotals('user-a', '2026-08')
    expect(totals.income.amount).toBe(0)
    expect(totals.expense.amount).toBe(0)
    expect(totals.net.amount).toBe(0)
  })

  test('SÍ cuenta en la evolución del saldo', async () => {
    await transfer()
    const series = await getBalanceSeries('user-a', { from: '2026-08-12', to: '2026-08-14' })
    // Las dos patas están en la misma divisa y se compensan: el patrimonio total
    // no cambia, aunque los saldos individuales sí.
    expect(series.map((p) => p.balance.amount)).toEqual([0, 0, 0])
  })

  test('borrar una pata borra las dos', async () => {
    await transfer()
    const [leg] = await ctx.db.select().from(transactions)

    await deleteTransaction(idleState, form({ id: leg.id }))

    const vivos = await ctx.db.select().from(transactions).where(isNull(transactions.deletedAt))
    // Una pata viva sin la otra es dinero que sale de una cuenta sin entrar en ninguna.
    expect(vivos).toHaveLength(0)
  })

  test('restaurar una pata restaura las dos', async () => {
    await transfer()
    const [leg] = await ctx.db.select().from(transactions)
    await deleteTransaction(idleState, form({ id: leg.id }))

    await restoreTransaction(idleState, form({ id: leg.id }))

    const vivos = await ctx.db.select().from(transactions).where(isNull(transactions.deletedAt))
    expect(vivos).toHaveLength(2)
  })

  test('rechaza transferir a la misma cuenta', async () => {
    const result = await createTransfer(
      idleState,
      form({
        fromAccountId: 'acc-1',
        toAccountId: 'acc-1',
        amount: '500',
        date: '2026-08-13',
        description: 'Circular',
      }),
    )
    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
  })

  test('rechaza transferir entre divisas distintas', async () => {
    await seedAccount('acc-usd', 'user-a', { currency: 'USD' })

    const result = await createTransfer(
      idleState,
      form({
        fromAccountId: 'acc-1',
        toAccountId: 'acc-usd',
        amount: '500',
        date: '2026-08-13',
        description: 'Cambio',
      }),
    )

    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
  })

  test('una pata no se puede editar por separado', async () => {
    await transfer()
    const [leg] = await ctx.db.select().from(transactions)

    const result = await updateTransaction(
      idleState,
      form({
        id: leg.id,
        accountId: 'acc-1',
        direction: 'expense',
        amount: '999',
        date: '2026-08-13',
        description: 'Descuadrada',
      }),
    )

    expect(result.status).toBe('error')
    const rows = await ctx.db.select().from(transactions)
    expect(rows.reduce((acc, r) => acc + r.amount, 0)).toBe(0)
  })
})

describe('borrado lógico', () => {
  test('el movimiento borrado desaparece de listados y totales pero sigue en la tabla', async () => {
    await createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        categoryId: 'cat-gasto',
        direction: 'expense',
        amount: '30',
        date: '2026-08-13',
        description: 'Error',
      }),
    )
    const [tx] = await ctx.db.select().from(transactions)

    await deleteTransaction(idleState, form({ id: tx.id }))

    expect(await listTransactions('user-a')).toHaveLength(0)
    expect((await getMonthTotals('user-a', '2026-08')).expense.amount).toBe(0)
    // Sigue ahí: quien borra sin querer un movimiento quiere recuperarlo.
    expect(await ctx.db.select().from(transactions)).toHaveLength(1)
  })
})

describe('agregaciones', () => {
  const gasto = (amount: string, date: string, categoryId = 'cat-gasto') =>
    createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        categoryId,
        direction: 'expense',
        amount,
        date,
        description: `Gasto ${date}`,
      }),
    )

  test('el gasto por categoría ordena de mayor a menor', async () => {
    await seedCategory('cat-ocio', 'user-a', { name: 'Ocio', kind: 'expense' })
    await gasto('10', '2026-08-01')
    await gasto('80', '2026-08-02', 'cat-ocio')
    await gasto('15', '2026-08-03')

    const spend = await getSpendByCategory('user-a', '2026-08')

    expect(spend.map((s) => s.categoryName)).toEqual(['Ocio', 'Alimentación'])
    expect(spend[0].total.amount).toBe(-8000)
    expect(spend[1].total.amount).toBe(-2500)
  })

  test('los movimientos sin categoría se agrupan aparte', async () => {
    await createTransaction(
      idleState,
      form({
        accountId: 'acc-1',
        direction: 'expense',
        amount: '12',
        date: '2026-08-01',
        description: 'Sin clasificar',
      }),
    )

    const spend = await getSpendByCategory('user-a', '2026-08')
    expect(spend[0].categoryName).toBe('Sin categoría')
    expect(spend[0].categoryId).toBeNull()
  })

  test('el primer y el último día del mes caen en su mes', async () => {
    await gasto('10', '2026-08-01')
    await gasto('20', '2026-08-31')
    await gasto('99', '2026-09-01')

    const totals = await getMonthTotals('user-a', '2026-08')
    expect(totals.expense.amount).toBe(-3000)
  })

  test('la serie de saldo rellena los días sin movimiento', async () => {
    await gasto('10', '2026-08-01')
    await gasto('20', '2026-08-04')

    const series = await getBalanceSeries('user-a', { from: '2026-08-01', to: '2026-08-05' })

    // Sin relleno, la línea dibujaría una pendiente falsa entre el 1 y el 4.
    expect(series.map((p) => p.balance.amount)).toEqual([-1000, -1000, -1000, -3000, -3000])
  })

  test('la serie arranca del saldo previo, no de cero', async () => {
    await ctx.db.update(accounts).set({ openingBalance: 100000 }).where(eq(accounts.id, 'acc-1'))
    await gasto('10', '2026-07-15')

    const series = await getBalanceSeries('user-a', { from: '2026-08-01', to: '2026-08-02' })

    // 1000 € de apertura menos el gasto de julio, que está fuera del rango pero
    // sí forma parte del saldo con el que se llega al 1 de agosto.
    expect(series[0].balance.amount).toBe(100000 - 1000)
  })

  test('las agregaciones no mezclan divisas', async () => {
    await seedAccount('acc-usd', 'user-a', { currency: 'USD' })
    await ctx.db.insert(transactions).values({
      id: 'tx-usd',
      userId: 'user-a',
      accountId: 'acc-usd',
      categoryId: 'cat-gasto',
      amount: -9999,
      date: '2026-08-05',
      description: 'En dólares',
      createdAt: new Date(),
    })
    await gasto('10', '2026-08-01')

    const eur = await getSpendByCategory('user-a', '2026-08', 'EUR')
    const usd = await getSpendByCategory('user-a', '2026-08', 'USD')

    expect(eur[0].total.amount).toBe(-1000)
    expect(usd[0].total.amount).toBe(-9999)
  })

  test('los listados no cruzan usuarios', async () => {
    await seedAccount('acc-b', 'user-b')
    await ctx.db.insert(transactions).values({
      id: 'tx-b',
      userId: 'user-b',
      accountId: 'acc-b',
      amount: -5000,
      date: '2026-08-13',
      description: 'Suya',
      createdAt: new Date(),
    })
    await gasto('10', '2026-08-01')

    const list = await listTransactions('user-a')
    expect(list).toHaveLength(1)
    expect(list[0].description).toBe('Gasto 2026-08-01')
  })
})
