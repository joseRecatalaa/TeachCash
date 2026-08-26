import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

// El estado compartido con los mocks: qué base de datos usan las acciones y con
// qué sesión creen estar trabajando.
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
import { accounts, transactions } from '@/db/schema'
import { idleState } from '@/lib/forms'
import {
  archiveAccount,
  createAccount,
  deleteAccount,
  updateAccount,
} from '@/features/accounts/actions'
import { getNetWorth, listAccounts } from '@/features/accounts/queries'

let ctx: TestDb

const form = (values: Record<string, string>): FormData => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(values)) fd.append(k, v)
  return fd
}

const seedAccount = async (
  id: string,
  userId: string,
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

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
  h.userId = 'user-a'
})

afterEach(() => ctx.close())

describe('createAccount', () => {
  test('crea la cuenta con el userId de la sesión', async () => {
    const result = await createAccount(
      idleState,
      form({ name: 'BBVA Nómina', type: 'checking', currency: 'EUR', openingBalance: '1.234,56' }),
    )

    expect(result.status).toBe('success')
    const [row] = await ctx.db.select().from(accounts)
    expect(row.userId).toBe('user-a')
    expect(row.name).toBe('BBVA Nómina')
    // El saldo inicial entra como entero en céntimos, no como 1234.56.
    expect(row.openingBalance).toBe(123456)
  })

  test('ignora el userId que venga en el formulario', async () => {
    // Un atacante manda el userId que quiera; la acción no lo mira.
    await createAccount(
      idleState,
      form({ name: 'Ajena', type: 'cash', currency: 'EUR', openingBalance: '0', userId: 'user-b' }),
    )
    const [row] = await ctx.db.select().from(accounts)
    expect(row.userId).toBe('user-a')
  })

  test('rechaza un tipo de cuenta inventado', async () => {
    const result = await createAccount(
      idleState,
      form({ name: 'Rara', type: 'cripto', currency: 'EUR', openingBalance: '0' }),
    )
    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(accounts)).toHaveLength(0)
  })

  test('rechaza un importe que no se puede parsear', async () => {
    const result = await createAccount(
      idleState,
      form({ name: 'Rara', type: 'cash', currency: 'EUR', openingBalance: 'mucho dinero' }),
    )
    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(accounts)).toHaveLength(0)
  })

  test('acepta saldo inicial negativo (tarjeta en descubierto)', async () => {
    await createAccount(
      idleState,
      form({ name: 'Visa', type: 'card', currency: 'EUR', openingBalance: '-350,00' }),
    )
    const [row] = await ctx.db.select().from(accounts)
    expect(row.openingBalance).toBe(-35000)
  })
})

describe('autorización', () => {
  test('no se puede editar la cuenta de otro usuario', async () => {
    await seedAccount('acc-a', 'user-a', { name: 'Mía' })
    h.userId = 'user-b'

    const result = await updateAccount(
      idleState,
      form({ id: 'acc-a', name: 'Robada', type: 'cash', openingBalance: '999' }),
    )

    expect(result.status).toBe('error')
    // Comprobar el dato, no solo la respuesta: una acción puede devolver error
    // DESPUÉS de haber escrito.
    const [row] = await ctx.db.select().from(accounts).where(eq(accounts.id, 'acc-a'))
    expect(row.name).toBe('Mía')
    expect(row.openingBalance).toBe(0)
  })

  test('no se puede archivar la cuenta de otro usuario', async () => {
    await seedAccount('acc-a', 'user-a')
    h.userId = 'user-b'

    const result = await archiveAccount(idleState, form({ id: 'acc-a' }))

    expect(result.status).toBe('error')
    const [row] = await ctx.db.select().from(accounts).where(eq(accounts.id, 'acc-a'))
    expect(row.archivedAt).toBeNull()
  })

  test('no se puede borrar la cuenta de otro usuario', async () => {
    await seedAccount('acc-a', 'user-a')
    h.userId = 'user-b'

    await deleteAccount(idleState, form({ id: 'acc-a' }))

    expect(await ctx.db.select().from(accounts)).toHaveLength(1)
  })

  test('sin sesión no se crea nada', async () => {
    h.userId = null
    const result = await createAccount(
      idleState,
      form({ name: 'X', type: 'cash', currency: 'EUR', openingBalance: '0' }),
    )
    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(accounts)).toHaveLength(0)
  })

  test('el mensaje no distingue "no existe" de "no es tuya"', async () => {
    await seedAccount('acc-a', 'user-a')
    h.userId = 'user-b'

    const ajena = await archiveAccount(idleState, form({ id: 'acc-a' }))
    const inexistente = await archiveAccount(idleState, form({ id: 'no-existe' }))

    // Distinguirlos le diría a quien prueba IDs al azar cuáles existen.
    expect(ajena).toEqual(inexistente)
  })
})

describe('borrado y archivado', () => {
  test('no se borra una cuenta con movimientos', async () => {
    await seedAccount('acc-a', 'user-a')
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: 'user-a',
      accountId: 'acc-a',
      amount: -1000,
      date: '2026-08-13',
      description: 'Compra',
      createdAt: new Date(),
    })

    const result = await deleteAccount(idleState, form({ id: 'acc-a' }))

    expect(result.status).toBe('error')
    expect(await ctx.db.select().from(accounts)).toHaveLength(1)
  })

  test('se borra una cuenta vacía', async () => {
    await seedAccount('acc-a', 'user-a')
    const result = await deleteAccount(idleState, form({ id: 'acc-a' }))
    expect(result.status).toBe('success')
    expect(await ctx.db.select().from(accounts)).toHaveLength(0)
  })

  test('archivar la saca del listado pero conserva sus movimientos', async () => {
    await seedAccount('acc-a', 'user-a')
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: 'user-a',
      accountId: 'acc-a',
      amount: -1000,
      date: '2026-08-13',
      description: 'Compra',
      createdAt: new Date(),
    })

    await archiveAccount(idleState, form({ id: 'acc-a' }))

    expect(await listAccounts('user-a')).toHaveLength(0)
    expect(await listAccounts('user-a', { includeArchived: true })).toHaveLength(1)
    expect(await ctx.db.select().from(transactions)).toHaveLength(1)
  })
})

describe('saldos derivados', () => {
  test('saldo = apertura + movimientos, transferencias incluidas', async () => {
    await seedAccount('acc-a', 'user-a', { openingBalance: 100000 })
    await ctx.db.insert(transactions).values([
      {
        id: 'tx-1',
        userId: 'user-a',
        accountId: 'acc-a',
        amount: -2550,
        date: '2026-08-01',
        description: 'Compra',
        createdAt: new Date(),
      },
      {
        id: 'tx-2',
        userId: 'user-a',
        accountId: 'acc-a',
        amount: -50000,
        date: '2026-08-02',
        description: 'Al ahorro',
        transferId: 'tr-1', // una transferencia SÍ cambia el saldo
        createdAt: new Date(),
      },
      {
        id: 'tx-3',
        userId: 'user-a',
        accountId: 'acc-a',
        amount: -9999,
        date: '2026-08-03',
        description: 'Borrado',
        deletedAt: new Date(), // un borrado NO cuenta
        createdAt: new Date(),
      },
    ])

    const [account] = await listAccounts('user-a')
    expect(account.balance.amount).toBe(100000 - 2550 - 50000)
  })

  test('una cuenta sin movimientos no da null', async () => {
    // sum() sobre conjunto vacío devuelve NULL, no 0: sin coalesce el saldo
    // llegaría como null a la pantalla.
    await seedAccount('acc-a', 'user-a', { openingBalance: 5000 })
    const [account] = await listAccounts('user-a')
    expect(account.balance.amount).toBe(5000)
  })

  test('el listado no incluye cuentas de otro usuario', async () => {
    await seedAccount('acc-a', 'user-a')
    await seedAccount('acc-b', 'user-b')
    const list = await listAccounts('user-a')
    expect(list.map((a) => a.id)).toEqual(['acc-a'])
  })

  test('el patrimonio se agrupa por divisa, no se mezcla', async () => {
    await seedAccount('acc-eur', 'user-a', { currency: 'EUR', openingBalance: 100000 })
    await seedAccount('acc-eur2', 'user-a', { currency: 'EUR', openingBalance: 50000 })
    await seedAccount('acc-usd', 'user-a', { currency: 'USD', openingBalance: 20000 })

    const total = await getNetWorth('user-a')

    expect(total).toEqual([
      { amount: 150000, currency: 'EUR' },
      { amount: 20000, currency: 'USD' },
    ])
  })
})
