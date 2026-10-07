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

/**
 * Espera que Postgres rechace la operación con ESE código SQLSTATE.
 *
 * Un `rejects.toThrow()` a secas pasa con cualquier fallo: el test "la FK
 * impide el huérfano" seguiría en verde si el insert fallase por un typo en una
 * columna. Drizzle envuelve el error de la base; el código va en `cause`.
 */
const esperarSqlstate = async (promesa: Promise<unknown>, codigo: string) => {
  const error = await promesa.then(
    () => {
      throw new Error(`Se esperaba el SQLSTATE ${codigo} y la operación tuvo éxito`)
    },
    (e: unknown) => e as { code?: string; cause?: { code?: string } },
  )
  expect(error.code ?? error.cause?.code).toBe(codigo)
}

/** Los SQLSTATE de Postgres que importan aquí. */
const SQL = {
  NOT_NULL: '23502',
  FOREIGN_KEY: '23503',
  UNIQUE: '23505',
  CHECK: '23514',
  RLS: '42501',
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
    await esperarSqlstate(
      ctx.db.insert(transactions).values({
        id: 'tx-huerfano',
        userId: USER_A,
        categoryId: 'categoria-que-no-existe',
        amount: -100,
        date: '2026-08-13',
        description: 'Fantasma',
        createdAt: now,
      }),
      SQL.FOREIGN_KEY,
    )
  })

  test('no se pueden guardar datos de un usuario que no existe en auth.users', async () => {
    await esperarSqlstate(seedCategoria('cat-1', '00000000-0000-4000-8000-0000000000ff'), SQL.FOREIGN_KEY)
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
    await esperarSqlstate(
      ctx.db.insert(categories).values({ userId: USER_A, name: 'Rara', kind: 'ambas' }),
      SQL.CHECK,
    )
  })

  test('un movimiento sin categoría no es válido', async () => {
    // La categoría es obligatoria: no existe el estado "sin clasificar". El
    // tipo ya lo impide en compilación (`categoryId` es requerido en el
    // insert); el `as never` fuerza el caso para comprobar que la base
    // también lo rechaza en runtime, no solo el compilador.
    await esperarSqlstate(
      ctx.db.insert(transactions).values({
        id: 'tx-1',
        userId: USER_A,
        amount: -100,
        date: '2026-08-13',
        description: 'Sin clasificar',
        createdAt: now,
      } as never),
      SQL.NOT_NULL,
    )
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
    await esperarSqlstate(ctx.db.insert(transactions).values({ ...base, id: 'tx-2' }), SQL.UNIQUE)
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

  test('una categoría nace visible, sin color y sin presupuesto', async () => {
    // Lo que pone la BASE cuando el insert no lo dice: si `hidden` naciera a
    // true, toda categoría creada por un camino que no lo fije (un script, la
    // API REST) desaparecería del formulario de movimientos sin avisar.
    await ctx.db.insert(categories).values({ userId: USER_A, name: 'Alimentación', kind: 'expense' })
    const [cat] = await ctx.db.select().from(categories)
    expect(cat).toMatchObject({ hidden: false, color: null, monthlyBudget: null })
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
    await ctx.db.insert(transactions).values([
      { id: 'tx-a', userId: USER_A, categoryId: 'cat-a', amount: -100, date: '2026-08-13', description: 'De A' },
      { id: 'tx-b', userId: USER_B, categoryId: 'cat-b', amount: -200, date: '2026-08-13', description: 'De B' },
    ])
  })

  // Las dos tablas de datos de usuario, con la fila de cada uno. Toda tabla
  // nueva con `user_id` entra en esta lista (y el test de catálogo de abajo
  // falla hasta que tenga RLS).
  const TABLAS = [
    { tabla: 'categories', deA: 'cat-a', deB: 'cat-b' },
    { tabla: 'transactions', deA: 'tx-a', deB: 'tx-b' },
  ]

  describe.each(TABLAS)('$tabla', ({ tabla, deA, deB }) => {
    test('un usuario solo ve sus filas', async () => {
      await comoUsuario('authenticated', USER_A)
      const { rows } = await ctx.pg.query<{ id: string }>(`select id from ${tabla}`)
      expect(rows).toEqual([{ id: deA }])
    })

    test('no puede modificar ni borrar las filas de otro', async () => {
      await comoUsuario('authenticated', USER_A)
      const editadas = await ctx.pg.query(`update ${tabla} set user_id = user_id where id = $1`, [deB])
      const borradas = await ctx.pg.query(`delete from ${tabla} where id = $1`, [deB])
      expect(editadas.affectedRows).toBe(0)
      expect(borradas.affectedRows).toBe(0)
    })

    test('no puede regalarle una fila suya a otro', async () => {
      // El WITH CHECK: sin él, A podría mover sus datos al espacio de B.
      await comoUsuario('authenticated', USER_A)
      await esperarSqlstate(
        ctx.pg.query(`update ${tabla} set user_id = $1 where id = $2`, [USER_B, deA]),
        SQL.RLS,
      )
    })

    test('sin sesión (rol anon) no se ve nada', async () => {
      await comoUsuario('anon', null)
      const { rows } = await ctx.pg.query(`select id from ${tabla}`)
      expect(rows).toEqual([])
    })
  })

  test('no se puede insertar a nombre de otro', async () => {
    await comoUsuario('authenticated', USER_A)
    await esperarSqlstate(
      ctx.pg.query(`insert into categories (user_id, name, kind) values ($1, 'Robada', 'expense')`, [
        USER_B,
      ]),
      SQL.RLS,
    )
  })
})

describe('catálogo: toda tabla de datos es de un usuario', () => {
  /**
   * Guarda estructural. No prueba una tabla concreta: recorre TODAS las de
   * `public`, así que la tabla que se añada mañana (presupuestos, importaciones)
   * rompe este test hasta que tenga las tres piezas. Sin ellas, la tabla queda
   * abierta a la API REST de Supabase con la clave pública, o sus filas
   * sobreviven a que su dueño borre la cuenta.
   */
  test('RLS activado, columna user_id y FK a auth.users con borrado en cascada', async () => {
    const { rows } = await ctx.pg.query<{
      tabla: string
      rls: boolean
      cascada: boolean
    }>(`
      select c.relname as tabla,
             c.relrowsecurity as rls,
             exists (
               select 1
               from pg_constraint fk
               join pg_attribute a on a.attrelid = fk.conrelid and a.attnum = any (fk.conkey)
               where fk.conrelid = c.oid
                 and fk.contype = 'f'
                 and fk.confrelid = 'auth.users'::regclass
                 and fk.confdeltype = 'c'
                 and a.attname = 'user_id'
             ) as cascada
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname
    `)

    expect(rows.map((r) => r.tabla)).toEqual(['categories', 'transactions'])
    for (const fila of rows) expect(fila, fila.tabla).toMatchObject({ rls: true, cascada: true })
  })
})
