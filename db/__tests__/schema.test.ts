import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb, crearUsuario, USER_A, USER_B, type TestDb } from '@/db/testing'
import { categories, transactions } from '@/db/schema'

let ctx: TestDb

const now = new Date('2026-08-13T10:00:00Z')

const seedCategoria = async (id: string, userId = USER_A) => {
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
      userId: USER_A,
      categoryId: 'cat-1',
      amount: -100,
      date: '2026-08-13',
      description: 'Compra',
      createdAt: now,
    })
    expect(await ctx.db.select().from(categories)).toHaveLength(1)
    expect(await ctx.db.select().from(transactions)).toHaveLength(1)
  })

  test('el id y la fecha de alta los pone la base', async () => {
    const [cat] = await ctx.db
      .insert(categories)
      .values({ userId: USER_A, name: 'Sin id', kind: 'expense' })
      .returning()
    expect(cat.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(cat.createdAt).toBeInstanceOf(Date)
  })

  test('los importes viajan como enteros de ida y vuelta', async () => {
    await seedCategoria('cat-1')
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: USER_A,
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

  test('la fecha vuelve como cadena civil, no como instante', async () => {
    await seedCategoria('cat-1')
    await ctx.db.insert(transactions).values({
      id: 'tx-1',
      userId: USER_A,
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
    // Un movimiento apuntando a una categoría que no existe es como se rompen
    // los informes de meses cerrados.
    await expect(
      ctx.db.insert(transactions).values({
        id: 'tx-huerfano',
        userId: USER_A,
        categoryId: 'categoria-que-no-existe',
        amount: -100,
        date: '2026-08-13',
        description: 'Fantasma',
        createdAt: now,
      }),
    ).rejects.toThrow()
  })

  test('no se pueden guardar datos de un usuario que no existe en auth.users', async () => {
    await expect(seedCategoria('cat-1', '00000000-0000-4000-8000-0000000000ff')).rejects.toThrow()
  })

  test('borrar un usuario se lleva todos sus datos, y solo los suyos', async () => {
    // Es de lo que depende la limpieza de invitados caducados: el job borra de
    // auth.users y no toca nuestras tablas.
    const invitado = await crearUsuario(ctx.pg, '00000000-0000-4000-8000-0000000000c1', {
      anonimo: true,
    })
    await seedCategoria('cat-inv', invitado)
    await seedCategoria('cat-a', USER_A)
    await ctx.db.insert(transactions).values({
      id: 'tx-inv',
      userId: invitado,
      categoryId: 'cat-inv',
      amount: -100,
      date: '2026-08-13',
      description: 'Del invitado',
    })

    await ctx.pg.query('delete from auth.users where id = $1', [invitado])

    expect(await ctx.db.select().from(transactions)).toHaveLength(0)
    const quedan = await ctx.db.select({ id: categories.id }).from(categories)
    expect(quedan).toEqual([{ id: 'cat-a' }])
  })

  test('un tipo de categoría fuera de income/expense lo rechaza la base', async () => {
    await expect(
      ctx.db.insert(categories).values({ userId: USER_A, name: 'Rara', kind: 'ambas' }),
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
        userId: USER_A,
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
      userId: USER_A,
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
    // Postgres trata dos NULL como distintos en un UNIQUE (salvo `NULLS NOT
    // DISTINCT`, que aquí no se usa), así que no estorba a los movimientos
    // creados sin clave (importaciones, scripts).
    await seedCategoria('cat-1')
    await ctx.db.insert(transactions).values([
      { id: 'tx-1', userId: USER_A, categoryId: 'cat-1', amount: -1, date: '2026-08-13', description: 'A', createdAt: now },
      { id: 'tx-2', userId: USER_A, categoryId: 'cat-1', amount: -2, date: '2026-08-13', description: 'B', createdAt: now },
    ])
    expect(await ctx.db.select().from(transactions)).toHaveLength(2)
  })

  test('las categorías por defecto son de un solo tipo', async () => {
    await ctx.db.insert(categories).values({
      id: 'cat-1',
      userId: USER_A,
      name: 'Alimentación',
      kind: 'expense',
      createdAt: now,
    })
    const [cat] = await ctx.db.select().from(categories)
    expect(cat.kind).toBe('expense')
    expect(cat.color).toBeNull()
  })
})

describe('RLS', () => {
  /**
   * La app no depende de RLS: se conecta con un rol que se la salta y filtra por
   * userId en cada `where`. Esto comprueba la RED, que es lo que protege la API
   * REST de Supabase, a la que cualquiera puede llamar con la clave pública.
   * Se simula lo que hace Supabase con cada petición: rol `authenticated` (o
   * `anon`) y el `sub` del JWT en `request.jwt.claim.sub`.
   */
  const comoUsuario = async (rol: 'authenticated' | 'anon', sub: string | null) => {
    await ctx.pg.exec(`
      grant usage on schema public, auth to anon, authenticated;
      grant all on all tables in schema public to anon, authenticated;
    `)
    await ctx.pg.query(`select set_config('request.jwt.claim.sub', $1, false)`, [sub ?? ''])
    await ctx.pg.exec(`set role ${rol}`)
  }

  beforeEach(async () => {
    await seedCategoria('cat-a', USER_A)
    await seedCategoria('cat-b', USER_B)
  })

  test('un usuario solo ve sus filas', async () => {
    await comoUsuario('authenticated', USER_A)
    const { rows } = await ctx.pg.query<{ id: string }>('select id from categories')
    expect(rows).toEqual([{ id: 'cat-a' }])
  })

  test('un usuario no puede escribir a nombre de otro', async () => {
    await comoUsuario('authenticated', USER_A)
    await expect(
      ctx.pg.query(`insert into categories (user_id, name, kind) values ($1, 'Robada', 'expense')`, [
        USER_B,
      ]),
    ).rejects.toThrow()
    const { affectedRows } = await ctx.pg.query(`delete from categories where id = 'cat-b'`)
    expect(affectedRows).toBe(0)
  })

  test('sin sesión (rol anon) no se ve nada', async () => {
    await comoUsuario('anon', null)
    const { rows } = await ctx.pg.query('select id from categories')
    expect(rows).toEqual([])
  })
})
