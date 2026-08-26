/**
 * Repositorio de Cuentas.
 *
 * Lo que se comprueba aquí es lo que rompe la aplicación si falla: el saldo
 * derivado, el aislamiento por usuario y las reglas de borrado. Portado del
 * suite que cubría las Server Actions antes de la migración a Clean
 * Architecture; las aserciones de dominio son las mismas, cambia contra qué
 * capa se hacen.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

const h = vi.hoisted(() => ({
  db: null as unknown as import('@/db/client').Database,
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
import { accounts } from '@/db/schema'
import { RepositoryError } from '../types'
import {
  archivarCuenta,
  cuentasRepository as repo,
  getPatrimonio,
} from '../cuentas.repository'
import { seedCuenta, seedMovimiento, USER_A, USER_B } from './helpers'

let ctx: TestDb

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
})

afterEach(() => ctx.close())

describe('create', () => {
  test('crea la cuenta con el userId que recibe', async () => {
    const { id } = await repo.create(USER_A, {
      nombre: 'BBVA Nómina',
      tipo: 'checking',
      divisa: 'EUR',
      saldoInicial: 123456,
    })

    const [fila] = await ctx.db.select().from(accounts).where(eq(accounts.id, id))
    expect(fila.userId).toBe(USER_A)
    expect(fila.name).toBe('BBVA Nómina')
    // El importe entra como entero de céntimos y sale igual. Si algún día esto
    // devuelve 1234.56, la regla dura 1 se ha roto en algún punto del camino.
    expect(fila.openingBalance).toBe(123456)
  })

  test('ignora cualquier userId que venga en los valores', async () => {
    const { id } = await repo.create(USER_A, {
      nombre: 'Intrusa',
      tipo: 'checking',
      divisa: 'EUR',
      saldoInicial: 0,
      userId: USER_B,
    })

    const [fila] = await ctx.db.select().from(accounts).where(eq(accounts.id, id))
    expect(fila.userId).toBe(USER_A)
  })

  test('rechaza un tipo de cuenta inventado', async () => {
    await expect(
      repo.create(USER_A, {
        nombre: 'Rara',
        tipo: 'criptomoneda',
        divisa: 'EUR',
        saldoInicial: 0,
      }),
    ).rejects.toBeInstanceOf(RepositoryError)
  })

  test('rechaza un saldo inicial con decimales', async () => {
    // Es la red que caza el día en que alguien deje de convertir a céntimos.
    await expect(
      repo.create(USER_A, {
        nombre: 'Decimal',
        tipo: 'checking',
        divisa: 'EUR',
        saldoInicial: 12.34,
      }),
    ).rejects.toBeInstanceOf(RepositoryError)
  })

  test('acepta saldo inicial negativo (tarjeta en descubierto)', async () => {
    const { id } = await repo.create(USER_A, {
      nombre: 'Visa',
      tipo: 'card',
      divisa: 'EUR',
      saldoInicial: -50000,
    })

    const [fila] = await ctx.db.select().from(accounts).where(eq(accounts.id, id))
    expect(fila.openingBalance).toBe(-50000)
  })
})

describe('autorización', () => {
  test('no se puede editar la cuenta de otro usuario', async () => {
    await seedCuenta(ctx.db, 'ajena', USER_B)

    await expect(
      repo.update(USER_A, 'ajena', {
        nombre: 'Secuestrada',
        tipo: 'checking',
        saldoInicial: 0,
      }),
    ).rejects.toThrow('No encontrado')

    const [fila] = await ctx.db.select().from(accounts).where(eq(accounts.id, 'ajena'))
    expect(fila.name).toBe('Cuenta ajena')
  })

  test('no se puede borrar la cuenta de otro usuario', async () => {
    await seedCuenta(ctx.db, 'ajena', USER_B)
    await expect(repo.remove(USER_A, 'ajena')).rejects.toThrow('No encontrado')
    const filas = await ctx.db.select().from(accounts).where(eq(accounts.id, 'ajena'))
    expect(filas).toHaveLength(1)
  })

  test('no se puede archivar la cuenta de otro usuario', async () => {
    await seedCuenta(ctx.db, 'ajena', USER_B)
    await expect(archivarCuenta(USER_A, 'ajena', true)).rejects.toThrow('No encontrado')
  })

  test('el mensaje no distingue "no existe" de "no es tuya"', async () => {
    await seedCuenta(ctx.db, 'ajena', USER_B)

    const inexistente = await repo.remove(USER_A, 'no-existe').catch((e) => e.message)
    const ajena = await repo.remove(USER_A, 'ajena').catch((e) => e.message)

    // Si difirieran, probar ids al azar diría cuáles existen.
    expect(inexistente).toBe(ajena)
  })

  test('get de una cuenta ajena devuelve null', async () => {
    await seedCuenta(ctx.db, 'ajena', USER_B)
    expect(await repo.get(USER_A, 'ajena')).toBeNull()
  })

  test('el listado no incluye cuentas de otro usuario', async () => {
    await seedCuenta(ctx.db, 'mia', USER_A)
    await seedCuenta(ctx.db, 'ajena', USER_B)

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data.map((c) => c.id)).toEqual(['mia'])
  })
})

describe('borrado y archivado', () => {
  test('no se borra una cuenta con movimientos', async () => {
    await seedCuenta(ctx.db, 'con-movs', USER_A)
    await seedMovimiento(ctx.db, 'm1', USER_A, { accountId: 'con-movs' })

    await expect(repo.remove(USER_A, 'con-movs')).rejects.toThrow(/Archívala/)

    const filas = await ctx.db.select().from(accounts).where(eq(accounts.id, 'con-movs'))
    expect(filas).toHaveLength(1)
  })

  test('se borra una cuenta vacía', async () => {
    await seedCuenta(ctx.db, 'vacia', USER_A)
    await repo.remove(USER_A, 'vacia')

    const filas = await ctx.db.select().from(accounts).where(eq(accounts.id, 'vacia'))
    expect(filas).toHaveLength(0)
  })

  test('archivar la saca del listado pero conserva sus movimientos', async () => {
    await seedCuenta(ctx.db, 'vieja', USER_A, { openingBalance: 10000 })
    await seedMovimiento(ctx.db, 'm1', USER_A, { accountId: 'vieja', amount: -2500 })

    await archivarCuenta(USER_A, 'vieja', true)

    const visibles = await repo.list(USER_A, { paginate: false })
    expect(visibles.data).toHaveLength(0)

    const conArchivadas = await repo.list(USER_A, {
      paginate: false,
      filters: { archivadas: '1' },
    })
    expect(conArchivadas.data).toHaveLength(1)
    // El histórico sigue contando: archivar no es borrar.
    expect(conArchivadas.data[0].saldo).toBe(7500)
    expect(conArchivadas.data[0].archivada).toBe(true)
  })

  test('restaurar la devuelve al listado', async () => {
    await seedCuenta(ctx.db, 'vieja', USER_A)
    await archivarCuenta(USER_A, 'vieja', true)
    await archivarCuenta(USER_A, 'vieja', false)

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data).toHaveLength(1)
    expect(data[0].archivada).toBe(false)
  })
})

describe('saldos derivados', () => {
  test('saldo = apertura + movimientos, transferencias incluidas', async () => {
    await seedCuenta(ctx.db, 'c1', USER_A, { openingBalance: 100000 })
    await seedMovimiento(ctx.db, 'gasto', USER_A, { accountId: 'c1', amount: -4590 })
    await seedMovimiento(ctx.db, 'ingreso', USER_A, { accountId: 'c1', amount: 200000 })
    // Una pata de transferencia SÍ mueve el saldo, a diferencia de los informes.
    await seedMovimiento(ctx.db, 'traspaso', USER_A, {
      accountId: 'c1',
      amount: -50000,
      transferId: 't1',
    })
    // Un movimiento borrado NO cuenta.
    await seedMovimiento(ctx.db, 'borrado', USER_A, {
      accountId: 'c1',
      amount: -999999,
      deletedAt: new Date(),
    })

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data[0].saldo).toBe(100000 - 4590 + 200000 - 50000)
  })

  test('una cuenta sin movimientos da su saldo de apertura, no null', async () => {
    await seedCuenta(ctx.db, 'c1', USER_A, { openingBalance: 3300 })
    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data[0].saldo).toBe(3300)
  })

  test('el patrimonio se agrupa por divisa, no se mezcla', async () => {
    await seedCuenta(ctx.db, 'euros', USER_A, { currency: 'EUR', openingBalance: 100000 })
    await seedCuenta(ctx.db, 'dolares', USER_A, { currency: 'USD', openingBalance: 50000 })

    const total = await getPatrimonio(USER_A)

    // Dos cifras, no una. Sumar euros y dólares da un número que no significa nada.
    expect(total).toHaveLength(2)
    expect(total).toEqual([
      { amount: 100000, currency: 'EUR' },
      { amount: 50000, currency: 'USD' },
    ])
  })

  test('el patrimonio no cuenta las cuentas de otro usuario', async () => {
    await seedCuenta(ctx.db, 'mia', USER_A, { openingBalance: 1000 })
    await seedCuenta(ctx.db, 'ajena', USER_B, { openingBalance: 999999 })

    expect(await getPatrimonio(USER_A)).toEqual([{ amount: 1000, currency: 'EUR' }])
  })
})

describe('update', () => {
  test('la divisa no se puede cambiar', async () => {
    await seedCuenta(ctx.db, 'c1', USER_A, { currency: 'EUR' })

    await repo.update(USER_A, 'c1', {
      nombre: 'Renombrada',
      tipo: 'savings',
      saldoInicial: 500,
      // Aunque llegue en los valores, el esquema de edición la descarta: los
      // movimientos ya registrados están en la divisa vieja.
      divisa: 'USD',
    })

    const [fila] = await ctx.db.select().from(accounts).where(eq(accounts.id, 'c1'))
    expect(fila.currency).toBe('EUR')
    expect(fila.name).toBe('Renombrada')
    expect(fila.type).toBe('savings')
  })
})
