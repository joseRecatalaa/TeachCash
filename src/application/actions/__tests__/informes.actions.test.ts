/**
 * Server Actions de informes.
 *
 * Son endpoints POST públicos como cualquier otra acción: lo que se comprueba
 * aquí es la frontera —sin sesión no hay datos, los datos son del usuario de
 * la sesión y un fallo no filtra el interior de la base—. Las cifras en sí las
 * prueba `informes.repository.test.ts`.
 */

import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/lib/auth', async () => (await import('@/test/mocks/auth')).authMock())

import { harness, usarBaseDeTest } from '@/test/harness'
import { seedMovimiento, USER_A, USER_B } from '@/src/infrastructure/repositories/__tests__/helpers'
import {
  fetchGastoPorCategoria,
  fetchIngresosVsGastos,
  fetchSerieSaldo,
  fetchTotalesDelMes,
} from '../informes.actions'

const base = usarBaseDeTest()

describe('sesión', () => {
  test.each([
    ['fetchGastoPorCategoria', () => fetchGastoPorCategoria('2026-03')],
    ['fetchIngresosVsGastos', () => fetchIngresosVsGastos()],
    ['fetchTotalesDelMes', () => fetchTotalesDelMes('2026-03')],
    ['fetchSerieSaldo', () => fetchSerieSaldo()],
  ])('%s sin sesión no devuelve nada', async (_nombre, llamar) => {
    harness.userId = null
    expect(await llamar()).toEqual({ ok: false, error: 'No autorizado' })
  })
})

describe('aislamiento', () => {
  test('los totales son los del usuario de la sesión', async () => {
    await seedMovimiento(base().db, 'mio', USER_A, { amount: -1000 })
    await seedMovimiento(base().db, 'ajeno', USER_B, { amount: -99999 })

    expect(await fetchTotalesDelMes('2026-03')).toEqual({
      ok: true,
      data: expect.objectContaining({ gastos: 1000, ingresos: 0 }),
    })
  })
})

describe('serie de saldo', () => {
  test('con rango explícito, un punto por día y saldo acumulado', async () => {
    await seedMovimiento(base().db, 'a', USER_A, { date: '2026-03-02', amount: -500 })

    const r = await fetchSerieSaldo({ desde: '2026-03-01', hasta: '2026-03-03' })

    expect(r).toEqual({
      ok: true,
      data: [
        { fecha: '2026-03-01', saldo: 0 },
        { fecha: '2026-03-02', saldo: -500 },
        { fecha: '2026-03-03', saldo: -500 },
      ],
    })
  })

  test('sin rango, arranca en el primer movimiento', async () => {
    await seedMovimiento(base().db, 'a', USER_A, { date: '2026-03-02', amount: -500 })

    const r = await fetchSerieSaldo()

    // Solo el primer punto: la serie sigue, un punto por día, hasta hoy.
    expect(r.ok && r.data[0]).toEqual({ fecha: '2026-03-02', saldo: -500 })
  })
})

describe('errores', () => {
  test('un fallo inesperado no filtra el detalle al cliente', async () => {
    // Sin la tabla, la consulta revienta dentro de Postgres. El mensaje real
    // («relation "transactions" does not exist») se queda en el log del servidor.
    await base().pg.exec('drop table transactions cascade')
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})

    const r = await fetchTotalesDelMes('2026-03')

    expect(r).toEqual({ ok: false, error: 'Se ha producido un error inesperado' })
    expect(JSON.stringify(espia.mock.calls)).toContain('does not exist')
  })
})
