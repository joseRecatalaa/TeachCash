/**
 * Repositorio de Movimientos.
 *
 * Es el fichero de test más importante del proyecto: aquí viven el signo del
 * importe, el aislamiento por usuario y el borrado físico. Un fallo en
 * cualquiera de los tres es dinero mal contado, no una molestia de interfaz.
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
import { transactions } from '@/db/schema'
import { movimientosRepository as repo } from '../movimientos.repository'
import { getSaldoActual } from '../informes.repository'
import { seedCategoria, seedMovimiento, USER_A, USER_B } from './helpers'

let ctx: TestDb

const CAT_GASTO = 'cat-gasto'
const CAT_INGRESO = 'cat-ingreso'

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
  await seedCategoria(ctx.db, CAT_GASTO, USER_A, { kind: 'expense' })
  await seedCategoria(ctx.db, CAT_INGRESO, USER_A, { kind: 'income' })
})

afterEach(() => ctx.close())

const nuevo = (overrides: Record<string, unknown> = {}) => ({
  categoriaId: CAT_GASTO,
  importe: 4590,
  sentido: 'expense',
  fecha: '2026-03-15',
  descripcion: 'Compra semanal',
  notas: '',
  ...overrides,
})

const filaDe = async (id: string) =>
  (await ctx.db.select().from(transactions).where(eq(transactions.id, id)))[0]

describe('create', () => {
  test('un gasto se guarda con importe negativo', async () => {
    const { id } = await repo.create(USER_A, nuevo({ sentido: 'expense', importe: 4590 }))
    // El formulario recibe 4590 sin signo; la base guarda -4590. Esa traducción
    // es del repositorio, y es lo que evita pedirle a nadie que teclee "-45,90".
    expect((await filaDe(id)).amount).toBe(-4590)
  })

  test('un ingreso se guarda con importe positivo', async () => {
    const { id } = await repo.create(
      USER_A,
      nuevo({ sentido: 'income', categoriaId: CAT_INGRESO, importe: 200000 }),
    )
    expect((await filaDe(id)).amount).toBe(200000)
  })

  test('el get devuelve magnitud y sentido, no el signo', async () => {
    const { id } = await repo.create(USER_A, nuevo({ sentido: 'expense', importe: 4590 }))
    const dto = await repo.get(USER_A, id)

    expect(dto).toMatchObject({ importe: 4590, sentido: 'expense' })
  })

  test('rechaza un importe de cero', async () => {
    await expect(repo.create(USER_A, nuevo({ importe: 0 }))).rejects.toThrow()
  })

  test('rechaza un importe negativo (el signo lo pone el sentido)', async () => {
    await expect(repo.create(USER_A, nuevo({ importe: -100 }))).rejects.toThrow()
  })

  test('rechaza un importe con decimales', async () => {
    await expect(repo.create(USER_A, nuevo({ importe: 45.9 }))).rejects.toThrow()
  })

  test('rechaza una fecha que no existe', async () => {
    // 2026 no es bisiesto: el 29 de febrero no existe.
    await expect(repo.create(USER_A, nuevo({ fecha: '2026-02-29' }))).rejects.toThrow()
  })

  test('rechaza una fecha con hora', async () => {
    await expect(
      repo.create(USER_A, nuevo({ fecha: '2026-03-15T10:00:00Z' })),
    ).rejects.toThrow()
  })

  test('rechaza una categoría de ingresos en un gasto', async () => {
    await seedCategoria(ctx.db, 'nomina', USER_A, { kind: 'income' })
    await expect(
      repo.create(USER_A, nuevo({ sentido: 'expense', categoriaId: 'nomina' })),
    ).rejects.toThrow(/categoría/i)
  })

  test('rechaza un movimiento sin categoría', async () => {
    // No existe el movimiento sin clasificar: la categoría es obligatoria.
    await expect(repo.create(USER_A, nuevo({ categoriaId: '' }))).rejects.toThrow()
  })

  test('la clave de idempotencia evita el duplicado por doble clic', async () => {
    const primero = await repo.create(USER_A, nuevo({ idempotencyKey: 'k1' }))
    const segundo = await repo.create(USER_A, nuevo({ idempotencyKey: 'k1' }))

    // El segundo envío devuelve el movimiento que ya existe, no crea otro:
    // para quien llama es un éxito, y lo es — su movimiento está guardado.
    expect(segundo.id).toBe(primero.id)

    const { total } = await repo.list(USER_A, { paginate: false })
    expect(total).toBe(1)
  })
})

describe('autorización', () => {
  test('no se puede usar la categoría de otro usuario', async () => {
    await seedCategoria(ctx.db, 'ajena', USER_B, { kind: 'expense' })
    await expect(repo.create(USER_A, nuevo({ categoriaId: 'ajena' }))).rejects.toThrow(
      'No encontrado',
    )
  })

  test('no se puede editar el movimiento de otro usuario', async () => {
    await seedMovimiento(ctx.db, 'ajeno', USER_B, { amount: -100 })

    await expect(repo.update(USER_A, 'ajeno', nuevo())).rejects.toThrow('No encontrado')
    expect((await filaDe('ajeno')).amount).toBe(-100)
  })

  test('no se puede borrar el movimiento de otro usuario', async () => {
    await seedMovimiento(ctx.db, 'ajeno', USER_B)

    await expect(repo.remove(USER_A, 'ajeno')).rejects.toThrow('No encontrado')
    expect(await filaDe('ajeno')).toBeDefined()
  })

  test('los listados no cruzan usuarios', async () => {
    await seedMovimiento(ctx.db, 'mio', USER_A)
    await seedMovimiento(ctx.db, 'ajeno', USER_B)

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data.map((m) => m.id)).toEqual(['mio'])
  })
})

describe('borrado físico', () => {
  test('desaparece del listado y de la tabla, sin papelera', async () => {
    const { id } = await repo.create(USER_A, nuevo())
    await repo.remove(USER_A, id)

    const restantes = await repo.list(USER_A, { paginate: false })
    expect(restantes.total).toBe(0)

    // Sin fila que recuperar: el borrado es permanente y el modal de
    // confirmación de la interfaz es la única red.
    expect(await filaDe(id)).toBeUndefined()
  })

  test('un movimiento borrado no cuenta en el saldo', async () => {
    const { id } = await repo.create(USER_A, nuevo({ importe: 10000 }))
    await repo.remove(USER_A, id)

    // El saldo es una SUMA de los movimientos que quedan (regla dura 7): uno
    // borrado ya no puede seguir contando.
    expect(await getSaldoActual(USER_A)).toBe(0)
  })
})

describe('listado', () => {
  test('ordena por fecha descendente y desempata por id', async () => {
    await seedMovimiento(ctx.db, 'a', USER_A, { date: '2026-03-01' })
    await seedMovimiento(ctx.db, 'b', USER_A, { date: '2026-03-20' })
    await seedMovimiento(ctx.db, 'c', USER_A, { date: '2026-03-10' })

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data.map((m) => m.id)).toEqual(['b', 'c', 'a'])
  })

  test('el total no lo recorta la paginación', async () => {
    for (let i = 0; i < 25; i++) {
      await seedMovimiento(ctx.db, `m${i}`, USER_A, { date: '2026-03-01' })
    }

    const { data, total } = await repo.list(USER_A, { page: 1, pageSize: 10 })
    expect(data).toHaveLength(10)
    // El pie de la tabla necesita el total real, no el de la página.
    expect(total).toBe(25)
  })

  test('filtra por rango de fechas, extremos incluidos', async () => {
    await seedMovimiento(ctx.db, 'antes', USER_A, { date: '2026-02-28' })
    await seedMovimiento(ctx.db, 'primero', USER_A, { date: '2026-03-01' })
    await seedMovimiento(ctx.db, 'ultimo', USER_A, { date: '2026-03-31' })
    await seedMovimiento(ctx.db, 'despues', USER_A, { date: '2026-04-01' })

    const { data } = await repo.list(USER_A, {
      paginate: false,
      filters: { desde: '2026-03-01', hasta: '2026-03-31' },
    })

    expect(data.map((m) => m.id).sort()).toEqual(['primero', 'ultimo'])
  })

  test('la búsqueda mira la descripción', async () => {
    await seedMovimiento(ctx.db, 'a', USER_A, { description: 'Mercadona' })
    await seedMovimiento(ctx.db, 'b', USER_A, { description: 'Gasolina' })

    const { data } = await repo.list(USER_A, { paginate: false, search: 'merca' })
    expect(data.map((m) => m.id)).toEqual(['a'])
  })
})
