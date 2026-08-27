/**
 * Agregaciones de informes.
 *
 * La regla que se comprueba una y otra vez aquí: **el saldo es DERIVADO**
 * (regla dura 7). No hay ninguna columna con el saldo dentro, así que
 * `getSaldoActual` y el último punto de `getSerieSaldo` tienen que dar
 * exactamente la misma cifra. El día que dejen de coincidir es que alguien ha
 * materializado un saldo por su cuenta, y ese es el fallo más difícil de ver de
 * este dominio: la cifra sale, solo que está mal.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

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
import {
  getGastoPorCategoria,
  getIngresosVsGastos,
  getSaldoActual,
  getSerieSaldo,
  getTotalesDelMes,
} from '../informes.repository'
import { seedCategoria, seedMovimiento, USER_A, USER_B } from './helpers'

let ctx: TestDb

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
})

afterEach(() => ctx.close())

describe('gasto por categoría', () => {
  test('ordena de mayor a menor gasto', async () => {
    await seedCategoria(ctx.db, 'comida', USER_A, { name: 'Comida' })
    await seedCategoria(ctx.db, 'ocio', USER_A, { name: 'Ocio' })

    await seedMovimiento(ctx.db, 'a', USER_A, { categoryId: 'ocio', amount: -1000 })
    await seedMovimiento(ctx.db, 'b', USER_A, { categoryId: 'comida', amount: -9000 })

    const filas = await getGastoPorCategoria(USER_A, '2026-03')
    expect(filas.map((f) => f.categoriaNombre)).toEqual(['Comida', 'Ocio'])
    // Magnitud positiva: la base lo guarda negativo, pero un gráfico de gasto
    // con barras hacia abajo se lee mal. El cambio de signo se hace una vez.
    expect(filas[0].total).toBe(9000)
  })

  test('trae el color de la categoría, para que el gráfico no lo invente', async () => {
    await seedCategoria(ctx.db, 'comida', USER_A, { name: 'Comida', color: 'cat-4' })
    await seedMovimiento(ctx.db, 'a', USER_A, { categoryId: 'comida', amount: -1000 })

    const [fila] = await getGastoPorCategoria(USER_A, '2026-03')
    // El color sigue a la ENTIDAD: filtrar el gráfico no puede repintar las
    // categorías que quedan.
    expect(fila.categoriaColor).toBe('cat-4')
  })

  test('los movimientos sin categoría se agrupan aparte', async () => {
    await seedMovimiento(ctx.db, 'a', USER_A, { categoryId: null, amount: -500 })

    const filas = await getGastoPorCategoria(USER_A, '2026-03')
    expect(filas).toHaveLength(1)
    expect(filas[0].categoriaNombre).toBe('Sin categoría')
    expect(filas[0].categoriaId).toBe('')
    expect(filas[0].categoriaColor).toBe('')
  })

  test('NO cuenta los ingresos ni los borrados', async () => {
    await seedMovimiento(ctx.db, 'ingreso', USER_A, { amount: 200000 })
    await seedMovimiento(ctx.db, 'borrado', USER_A, {
      amount: -70000,
      deletedAt: new Date(),
    })
    await seedMovimiento(ctx.db, 'gasto', USER_A, { amount: -1000 })

    const filas = await getGastoPorCategoria(USER_A, '2026-03')
    expect(filas.reduce((s, f) => s + f.total, 0)).toBe(1000)
  })

  test('no cruza usuarios', async () => {
    await seedMovimiento(ctx.db, 'ajeno', USER_B, { amount: -99999 })

    expect(await getGastoPorCategoria(USER_A, '2026-03')).toEqual([])
  })
})

describe('totales del mes', () => {
  test('devuelve ingresos y gastos como magnitudes positivas', async () => {
    await seedMovimiento(ctx.db, 'i', USER_A, { amount: 200000 })
    await seedMovimiento(ctx.db, 'g', USER_A, { amount: -50000 })

    const t = await getTotalesDelMes(USER_A, '2026-03')
    expect(t.ingresos).toBe(200000)
    expect(t.gastos).toBe(50000)
    // El neto sí lleva signo: es la cifra donde importa si el mes cerró bien.
    expect(t.neto).toBe(150000)
  })

  test('el primer y el último día del mes caen dentro de su mes', async () => {
    await seedMovimiento(ctx.db, 'primero', USER_A, { date: '2026-03-01', amount: -100 })
    await seedMovimiento(ctx.db, 'ultimo', USER_A, { date: '2026-03-31', amount: -200 })
    await seedMovimiento(ctx.db, 'fuera', USER_A, { date: '2026-04-01', amount: -400 })

    const t = await getTotalesDelMes(USER_A, '2026-03')
    expect(t.gastos).toBe(300)
  })

  test('NO cuenta los borrados', async () => {
    await seedMovimiento(ctx.db, 'g', USER_A, { amount: -1000 })
    await seedMovimiento(ctx.db, 'papelera', USER_A, {
      amount: -50000,
      deletedAt: new Date(),
    })

    const t = await getTotalesDelMes(USER_A, '2026-03')
    expect(t.gastos).toBe(1000)
  })

  test('un mes sin datos da ceros, no null', async () => {
    const t = await getTotalesDelMes(USER_A, '2026-07')
    expect(t).toMatchObject({ ingresos: 0, gastos: 0, neto: 0 })
  })

  test('no cruza usuarios', async () => {
    await seedMovimiento(ctx.db, 'ajeno', USER_B, { amount: -99999 })

    expect(await getTotalesDelMes(USER_A, '2026-03')).toMatchObject({ gastos: 0 })
  })
})

describe('ingresos frente a gastos', () => {
  test('rellena los huecos interiores con cero', async () => {
    await seedMovimiento(ctx.db, 'ene', USER_A, { date: '2026-01-10', amount: -1000 })
    await seedMovimiento(ctx.db, 'mar', USER_A, { date: '2026-03-10', amount: -2000 })

    const filas = await getIngresosVsGastos(USER_A, { meses: 12, hasta: '2026-03' })
    expect(filas.map((f) => f.periodo)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(filas[1].gastos).toBe(0)
  })

  test('no inventa meses anteriores al primer movimiento', async () => {
    await seedMovimiento(ctx.db, 'mar', USER_A, { date: '2026-03-10', amount: -2000 })

    const filas = await getIngresosVsGastos(USER_A, { meses: 12, hasta: '2026-03' })
    // Si el usuario empezó en marzo, enero no es un mes de gasto cero: es un mes
    // que no existe, y pintarlo plano miente sobre su historial.
    expect(filas).toHaveLength(1)
    expect(filas[0].periodo).toBe('2026-03')
  })

  test('sin ningún movimiento devuelve lista vacía', async () => {
    expect(await getIngresosVsGastos(USER_A, { hasta: '2026-03' })).toEqual([])
  })
})

describe('saldo', () => {
  test('es la suma de los movimientos vivos', async () => {
    await seedMovimiento(ctx.db, 'i', USER_A, { amount: 200000 })
    await seedMovimiento(ctx.db, 'g', USER_A, { amount: -50000 })
    await seedMovimiento(ctx.db, 'papelera', USER_A, {
      amount: -900000,
      deletedAt: new Date(),
    })

    expect(await getSaldoActual(USER_A)).toBe(150000)
  })

  test('sin movimientos es cero, no null', async () => {
    // Arranca en cero: no hay saldo de apertura en ninguna parte. Para partir
    // del saldo real del banco se anota un ingreso más.
    expect(await getSaldoActual(USER_A)).toBe(0)
  })

  test('no cruza usuarios', async () => {
    await seedMovimiento(ctx.db, 'ajeno', USER_B, { amount: 999999 })

    expect(await getSaldoActual(USER_A)).toBe(0)
  })
})

describe('serie de saldo', () => {
  test('rellena los días sin movimiento heredando el saldo', async () => {
    await seedMovimiento(ctx.db, 'a', USER_A, { date: '2026-03-02', amount: -1000 })

    const serie = await getSerieSaldo(USER_A, { desde: '2026-03-01', hasta: '2026-03-04' })
    expect(serie.map((p) => p.fecha)).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
    ])
    // Sin relleno, la línea dibujaría una pendiente falsa entre puntos lejanos.
    expect(serie.map((p) => p.saldo)).toEqual([0, -1000, -1000, -1000])
  })

  test('arranca del acumulado previo, no de cero', async () => {
    await seedMovimiento(ctx.db, 'antes', USER_A, { date: '2026-02-01', amount: 80000 })

    const serie = await getSerieSaldo(USER_A, { desde: '2026-03-01', hasta: '2026-03-01' })
    // Una serie de los últimos meses que arrancara en cero dibujaría un salto
    // que no ocurrió.
    expect(serie[0].saldo).toBe(80000)
  })

  test('no cuenta los borrados', async () => {
    await seedMovimiento(ctx.db, 'papelera', USER_A, {
      date: '2026-03-01',
      amount: -50000,
      deletedAt: new Date(),
    })

    const serie = await getSerieSaldo(USER_A, { desde: '2026-03-01', hasta: '2026-03-01' })
    expect(serie[0].saldo).toBe(0)
  })

  test('no cruza usuarios', async () => {
    await seedMovimiento(ctx.db, 'ajeno', USER_B, { date: '2026-03-01', amount: -99999 })

    const serie = await getSerieSaldo(USER_A, { desde: '2026-03-01', hasta: '2026-03-01' })
    expect(serie[0].saldo).toBe(0)
  })

  /**
   * La invariante de la regla dura 7. Dos caminos distintos —una suma directa y
   * una acumulación día a día— tienen que llegar a la misma cifra. Si alguna vez
   * falla, es que uno de los dos ha dejado de derivarse de los movimientos.
   */
  test('el último punto de la serie coincide con el saldo actual', async () => {
    await seedMovimiento(ctx.db, 'a', USER_A, { date: '2026-01-15', amount: 250000 })
    await seedMovimiento(ctx.db, 'b', USER_A, { date: '2026-02-03', amount: -34567 })
    await seedMovimiento(ctx.db, 'c', USER_A, { date: '2026-03-28', amount: -1200 })
    await seedMovimiento(ctx.db, 'd', USER_A, { date: '2026-03-28', amount: -8 })

    const serie = await getSerieSaldo(USER_A, { desde: '2026-01-01', hasta: '2026-03-31' })

    expect(serie[serie.length - 1].saldo).toBe(await getSaldoActual(USER_A))
  })
})
