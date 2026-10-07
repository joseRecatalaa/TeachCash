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

import { describe, expect, test, vi } from 'vitest'
import fc from 'fast-check'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())

import { usarBaseDeTest } from '@/test/harness'
import { transactions } from '@/db/schema'
import { addDays, compareDates, daysBetween } from '@/lib/dates'
import {
  getGastoPorCategoria,
  getIngresosVsGastos,
  getPrimeraFecha,
  getRangoPorDefecto,
  getSaldoActual,
  getSerieSaldo,
  getTotalesDelMes,
} from '../informes.repository'
import { seedCategoria, seedMovimiento, USER_A, USER_B } from './helpers'

const base = usarBaseDeTest()

describe('gasto por categoría', () => {
  test('ordena de mayor a menor gasto', async () => {
    await seedCategoria(base().db, 'comida', USER_A, { name: 'Comida' })
    await seedCategoria(base().db, 'ocio', USER_A, { name: 'Ocio' })

    await seedMovimiento(base().db, 'a', USER_A, { categoryId: 'ocio', amount: -1000 })
    await seedMovimiento(base().db, 'b', USER_A, { categoryId: 'comida', amount: -9000 })

    const filas = await getGastoPorCategoria(USER_A, '2026-03')
    expect(filas.map((f) => f.categoriaNombre)).toEqual(['Comida', 'Ocio'])
    // Magnitud positiva: la base lo guarda negativo, pero un gráfico de gasto
    // con barras hacia abajo se lee mal. El cambio de signo se hace una vez.
    expect(filas[0].total).toBe(9000)
  })

  test('trae el color de la categoría, para que el gráfico no lo invente', async () => {
    await seedCategoria(base().db, 'comida', USER_A, { name: 'Comida', color: 'cat-4' })
    await seedMovimiento(base().db, 'a', USER_A, { categoryId: 'comida', amount: -1000 })

    const [fila] = await getGastoPorCategoria(USER_A, '2026-03')
    // El color sigue a la ENTIDAD: filtrar el gráfico no puede repintar las
    // categorías que quedan.
    expect(fila.categoriaColor).toBe('cat-4')
  })

  test('NO cuenta los ingresos', async () => {
    await seedMovimiento(base().db, 'ingreso', USER_A, { amount: 200000 })
    await seedMovimiento(base().db, 'gasto', USER_A, { amount: -1000 })

    const filas = await getGastoPorCategoria(USER_A, '2026-03')
    expect(filas.reduce((s, f) => s + f.total, 0)).toBe(1000)
  })

  test('no cruza usuarios', async () => {
    await seedMovimiento(base().db, 'ajeno', USER_B, { amount: -99999 })

    expect(await getGastoPorCategoria(USER_A, '2026-03')).toEqual([])
  })
})

describe('totales del mes', () => {
  test('devuelve ingresos y gastos como magnitudes positivas', async () => {
    await seedMovimiento(base().db, 'i', USER_A, { amount: 200000 })
    await seedMovimiento(base().db, 'g', USER_A, { amount: -50000 })

    const t = await getTotalesDelMes(USER_A, '2026-03')
    expect(t.ingresos).toBe(200000)
    expect(t.gastos).toBe(50000)
    // El neto sí lleva signo: es la cifra donde importa si el mes cerró bien.
    expect(t.neto).toBe(150000)
  })

  test('el primer y el último día del mes caen dentro de su mes', async () => {
    await seedMovimiento(base().db, 'primero', USER_A, { date: '2026-03-01', amount: -100 })
    await seedMovimiento(base().db, 'ultimo', USER_A, { date: '2026-03-31', amount: -200 })
    await seedMovimiento(base().db, 'fuera', USER_A, { date: '2026-04-01', amount: -400 })

    const t = await getTotalesDelMes(USER_A, '2026-03')
    expect(t.gastos).toBe(300)
  })

  test('un mes sin datos da ceros, no null', async () => {
    const t = await getTotalesDelMes(USER_A, '2026-07')
    expect(t).toMatchObject({ ingresos: 0, gastos: 0, neto: 0 })
  })

  test('no cruza usuarios', async () => {
    await seedMovimiento(base().db, 'ajeno', USER_B, { amount: -99999 })

    expect(await getTotalesDelMes(USER_A, '2026-03')).toMatchObject({ gastos: 0 })
  })
})

describe('ingresos frente a gastos', () => {
  test('rellena los huecos interiores con cero', async () => {
    await seedMovimiento(base().db, 'ene', USER_A, { date: '2026-01-10', amount: -1000 })
    await seedMovimiento(base().db, 'mar', USER_A, { date: '2026-03-10', amount: -2000 })

    const filas = await getIngresosVsGastos(USER_A, { meses: 12, hasta: '2026-03' })
    expect(filas.map((f) => f.periodo)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(filas[1].gastos).toBe(0)
  })

  test('no inventa meses anteriores al primer movimiento', async () => {
    await seedMovimiento(base().db, 'mar', USER_A, { date: '2026-03-10', amount: -2000 })

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
  test('es la suma de los movimientos', async () => {
    await seedMovimiento(base().db, 'i', USER_A, { amount: 200000 })
    await seedMovimiento(base().db, 'g', USER_A, { amount: -50000 })

    expect(await getSaldoActual(USER_A)).toBe(150000)
  })

  test('sin movimientos es cero, no null', async () => {
    // Arranca en cero: no hay saldo de apertura en ninguna parte. Para partir
    // del saldo real del banco se anota un ingreso más.
    expect(await getSaldoActual(USER_A)).toBe(0)
  })

  test('no cruza usuarios', async () => {
    await seedMovimiento(base().db, 'ajeno', USER_B, { amount: 999999 })

    expect(await getSaldoActual(USER_A)).toBe(0)
  })
})

describe('serie de saldo', () => {
  test('rellena los días sin movimiento heredando el saldo', async () => {
    await seedMovimiento(base().db, 'a', USER_A, { date: '2026-03-02', amount: -1000 })

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
    await seedMovimiento(base().db, 'antes', USER_A, { date: '2026-02-01', amount: 80000 })

    const serie = await getSerieSaldo(USER_A, { desde: '2026-03-01', hasta: '2026-03-01' })
    // Una serie de los últimos meses que arrancara en cero dibujaría un salto
    // que no ocurrió.
    expect(serie[0].saldo).toBe(80000)
  })

  test('no cruza usuarios', async () => {
    await seedMovimiento(base().db, 'ajeno', USER_B, { date: '2026-03-01', amount: -99999 })

    const serie = await getSerieSaldo(USER_A, { desde: '2026-03-01', hasta: '2026-03-01' })
    expect(serie[0].saldo).toBe(0)
  })

  /**
   * La invariante de la regla dura 7. Dos caminos distintos —una suma directa y
   * una acumulación día a día— tienen que llegar a la misma cifra. Si alguna vez
   * falla, es que uno de los dos ha dejado de derivarse de los movimientos.
   */
  test('el último punto de la serie coincide con el saldo actual', async () => {
    await seedMovimiento(base().db, 'a', USER_A, { date: '2026-01-15', amount: 250000 })
    await seedMovimiento(base().db, 'b', USER_A, { date: '2026-02-03', amount: -34567 })
    await seedMovimiento(base().db, 'c', USER_A, { date: '2026-03-28', amount: -1200 })
    await seedMovimiento(base().db, 'd', USER_A, { date: '2026-03-28', amount: -8 })

    const serie = await getSerieSaldo(USER_A, { desde: '2026-01-01', hasta: '2026-03-31' })

    expect(serie[serie.length - 1].saldo).toBe(await getSaldoActual(USER_A))
  })
})

describe('el saldo es derivado (propiedad)', () => {
  /**
   * La regla dura 7 sobre datos al azar. El ejemplo fijo de arriba prueba un
   * caso; esto prueba cientos: movimientos con fechas e importes cualesquiera
   * (varios el mismo día, ingresos y gastos) y un rango que empieza en
   * cualquier punto. Cada punto de la serie tiene que ser la suma EXACTA de lo
   * anotado hasta ese día, y el último, el saldo actual.
   */
  const INICIO = '2026-01-01'
  const movimientos = fc.array(
    fc.record({
      dia: fc.integer({ min: 0, max: 89 }),
      importe: fc.integer({ min: -500_000, max: 500_000 }).filter((n) => n !== 0),
    }),
    { minLength: 1, maxLength: 25 },
  )

  test('cada punto es la suma de lo anterior y el último coincide con el saldo', async () => {
    await seedCategoria(base().db, 'gasto', USER_A, { kind: 'expense' })
    await seedCategoria(base().db, 'ingreso', USER_A, { kind: 'income' })

    await fc.assert(
      fc.asyncProperty(movimientos, fc.integer({ min: 0, max: 100 }), async (lista, inicioRango) => {
        // Arrange: base limpia en cada ronda (mismo PGlite) y un solo insert.
        await base().db.delete(transactions)
        await base().db.insert(transactions).values(
          lista.map((m, i) => ({
            id: `p-${i}`,
            userId: USER_A,
            categoryId: m.importe > 0 ? 'ingreso' : 'gasto',
            amount: m.importe,
            date: addDays(INICIO, m.dia),
            description: `Movimiento ${i}`,
          })),
        )
        const ultimoDia = Math.max(...lista.map((m) => m.dia))
        const desde = addDays(INICIO, Math.min(inicioRango, ultimoDia) - 5)
        const hasta = addDays(INICIO, ultimoDia)

        // Act
        const serie = await getSerieSaldo(USER_A, { desde, hasta })
        const saldo = await getSaldoActual(USER_A)

        // Assert
        expect(serie).toHaveLength(daysBetween(desde, hasta) + 1)
        for (const punto of serie) {
          const esperado = lista
            .filter((m) => compareDates(addDays(INICIO, m.dia), punto.fecha) <= 0)
            .reduce((acc, m) => acc + m.importe, 0)
          expect(punto.saldo).toBe(esperado)
        }
        expect(serie.at(-1)?.saldo).toBe(saldo)
      }),
      { numRuns: 30 },
    )
  })
})

describe('rango por defecto de la serie', () => {
  test('sin movimientos, la primera fecha es null', async () => {
    expect(await getPrimeraFecha(USER_A)).toBeNull()
  })

  test('la primera fecha es la del movimiento más antiguo, y como cadena civil', async () => {
    await seedMovimiento(base().db, 'b', USER_A, { date: '2026-03-10' })
    await seedMovimiento(base().db, 'a', USER_A, { date: '2026-02-01' })
    await seedMovimiento(base().db, 'ajeno', USER_B, { date: '2025-01-01' })

    expect(await getPrimeraFecha(USER_A)).toBe('2026-02-01')
  })

  test('sin historia, la ventana de los últimos meses acaba hoy', async () => {
    const rango = await getRangoPorDefecto(USER_A, 12, '2026-08-13')
    expect(rango).toEqual({ desde: '2025-09-01', hasta: '2026-08-13' })
  })

  test('no empieza antes del primer movimiento', async () => {
    // Pintar meses anteriores al alta dibuja una línea plana en cero que no
    // existió.
    await seedMovimiento(base().db, 'a', USER_A, { date: '2026-06-20' })
    const rango = await getRangoPorDefecto(USER_A, 12, '2026-08-13')
    expect(rango).toEqual({ desde: '2026-06-20', hasta: '2026-08-13' })
  })
})

describe('rango por defecto y movimientos posteriores a hoy', () => {
  test('termina en el último movimiento si es posterior a hoy', async () => {
    // El "hoy" de Madrid puede ir un día por detrás del de Kiritimati, que es
    // el tope de las fechas: un movimiento de "mañana" es legítimo. Si la
    // serie cortara en hoy, su último punto no incluiría ese movimiento y
    // dejaría de coincidir con el saldo actual.
    await seedMovimiento(base().db, 'a', USER_A, { date: '2026-08-10', amount: -500 })
    await seedMovimiento(base().db, 'b', USER_A, { date: '2026-08-14', amount: -300 })

    const rango = await getRangoPorDefecto(USER_A, 12, '2026-08-13')
    expect(rango).toEqual({ desde: '2026-08-10', hasta: '2026-08-14' })

    const serie = await getSerieSaldo(USER_A, rango)
    expect(serie.at(-1)?.saldo).toBe(await getSaldoActual(USER_A))
  })

  test('sin movimientos posteriores, sigue terminando hoy', async () => {
    await seedMovimiento(base().db, 'a', USER_A, { date: '2026-08-10' })
    const rango = await getRangoPorDefecto(USER_A, 12, '2026-08-13')
    expect(rango.hasta).toBe('2026-08-13')
  })
})

describe('ingresos frente a gastos: valores por defecto', () => {
  test('sin `hasta`, la ventana termina en el mes de hoy', async () => {
    vi.useFakeTimers({ now: new Date('2026-08-13T10:00:00Z'), toFake: ['Date'] })
    try {
      await seedMovimiento(base().db, 'a', USER_A, { date: '2026-08-02', amount: -500 })
      const r = await getIngresosVsGastos(USER_A)
      expect(r.at(-1)).toEqual({ periodo: '2026-08', ingresos: 0, gastos: 500, neto: -500 })
    } finally {
      vi.useRealTimers()
    }
  })

  test('si los datos empiezan antes de la ventana, la ventana manda', async () => {
    await seedMovimiento(base().db, 'viejo', USER_A, { date: '2020-01-15', amount: -100 })
    const r = await getIngresosVsGastos(USER_A, { meses: 3, hasta: '2026-08' })
    expect(r.map((p) => p.periodo)).toEqual(['2026-06', '2026-07', '2026-08'])
  })
})
