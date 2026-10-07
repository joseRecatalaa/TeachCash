/**
 * La frontera: lo que llega a una Server Action desde fuera.
 *
 * Cada export de un fichero 'use server' es un POST público (regla dura 3), y
 * el tipo de TypeScript de sus argumentos no existe en tiempo de ejecución:
 * quien llama puede mandar un `pageSize` de mil millones, un id que es un
 * objeto o un rango de fechas de diez mil años. Aquí se comprueba que todo eso
 * se para en la puerta, con un mensaje, y sin llegar a la base.
 */

import { describe, expect, test, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/lib/auth', async () => (await import('@/test/mocks/auth')).authMock())

import { usarBaseDeTest } from '@/test/harness'
import { categories } from '@/db/schema'
import {
  BUSQUEDA_MAX,
  ID_MAX,
  IMPORTE_MAXIMO,
  INFORME_MESES_MAX,
  SERIE_SALDO_MAX_DIAS,
  TAMANO_PAGINA_MAXIMO,
} from '@/src/types/limites.types'
import { addDays } from '@/lib/dates'
import {
  activarCategoria,
  deleteEntity,
  getEntity,
  listEntity,
  ocultarCategoria,
  updateEntity,
} from '../entity.actions'
import {
  fetchGastoPorCategoria,
  fetchIngresosVsGastos,
  fetchSerieSaldo,
  fetchTotalesDelMes,
} from '../informes.actions'
import { seedCategoria, USER_A } from '@/src/infrastructure/repositories/__tests__/helpers'

const base = usarBaseDeTest()

const PARAMETROS_NO_VALIDOS = { ok: false, error: 'Parámetros de consulta no válidos' }

// Lo que manda alguien que llama a la acción a mano. El tipo lo prohíbe; el
// cast es justo lo que hace quien no usa nuestra interfaz.
const hostil = <T>(valor: unknown) => valor as T

describe('listEntity valida ListParams', () => {
  test.each([
    ['pageSize desmesurado', { pageSize: 1e9 }],
    ['pageSize por encima del máximo', { pageSize: TAMANO_PAGINA_MAXIMO + 1 }],
    ['pageSize cero', { pageSize: 0 }],
    ['página cero', { page: 0 }],
    ['página negativa', { page: -3 }],
    ['página con decimales', { page: 1.5 }],
    ['página que no es número', { page: '2' }],
    ['sortDir fuera de lista', { sortDir: 'asc; drop table categories' }],
    ['búsqueda larguísima', { search: 'x'.repeat(BUSQUEDA_MAX + 1) }],
    ['filtro que es un objeto', { filters: { tipo: { $ne: 'x' } } }],
    ['sortBy larguísimo', { sortBy: 'x'.repeat(ID_MAX + 1) }],
    ['paginate que no es booleano', { paginate: 'false' }],
  ])('rechaza %s sin consultar', async (_caso, params) => {
    expect(await listEntity('Categorias', hostil(params))).toEqual(PARAMETROS_NO_VALIDOS)
  })

  test('acepta unos parámetros normales', async () => {
    await seedCategoria(base().db, 'a', USER_A, { name: 'Alfa', kind: 'income' })

    const r = await listEntity('Categorias', {
      page: 1,
      pageSize: 10,
      sortBy: 'nombre',
      sortDir: 'desc',
      search: 'alf',
      filters: { tipo: 'income', oculta: undefined },
      paginate: true,
    })

    expect(r).toMatchObject({ ok: true, data: { total: 1 } })
  })

  test('un filtro numérico llega como texto (el data provider los manda así)', async () => {
    const r = await listEntity('Categorias', { filters: { tipo: 7 } })
    expect(r).toMatchObject({ ok: true, data: { total: 0 } })
  })
})

describe('los ids se validan antes de llegar al repositorio', () => {
  test.each([
    ['un objeto', { $gt: '' }],
    ['un número', 42],
    ['larguísimo', 'x'.repeat(ID_MAX + 1)],
    ['vacío', ''],
  ])('un id %s es "No encontrado" y no un error interno', async (_caso, id) => {
    const NO_ENCONTRADO = { ok: false, error: 'No encontrado' }
    const idHostil = hostil<string>(id)

    expect(await getEntity('Categorias', idHostil)).toEqual(NO_ENCONTRADO)
    expect(await deleteEntity('Categorias', idHostil)).toEqual(NO_ENCONTRADO)
    expect(await updateEntity('Categorias', idHostil, {})).toEqual(NO_ENCONTRADO)
    expect(await ocultarCategoria(idHostil)).toEqual(NO_ENCONTRADO)
    expect(await activarCategoria(idHostil, 100)).toEqual(NO_ENCONTRADO)
  })
})

describe('activarCategoria valida el presupuesto', () => {
  test.each([
    ['con decimales', 10.5],
    ['negativo', -100],
    ['que no cabe en la columna', IMPORTE_MAXIMO + 1],
    ['que es texto', '500'],
    ['infinito', Infinity],
  ])('rechaza un presupuesto %s como error del campo', async (_caso, presupuesto) => {
    await seedCategoria(base().db, 'oculta', USER_A, { hidden: true, kind: 'expense' })

    const r = await activarCategoria('oculta', hostil<number>(presupuesto))

    expect(r).toMatchObject({ ok: false, fieldErrors: { presupuesto: expect.any(String) } })
    const [fila] = await base().db.select().from(categories)
    expect(fila.hidden).toBe(true)
  })
})

describe('informes', () => {
  test.each([
    ['del año 1 al 9999 (3,6 millones de puntos)', { desde: '0001-01-01', hasta: '9999-12-31' }],
    ['al revés', { desde: '2026-03-10', hasta: '2026-03-01' }],
    ['con una fecha que no existe', { desde: '2026-02-30', hasta: '2026-03-01' }],
    ['con un instante en vez de una fecha', { desde: '2026-03-01T00:00:00Z', hasta: '2026-03-02' }],
    ['con solo uno de los extremos', { desde: '2026-03-01' }],
    [
      'más largo que el máximo',
      { desde: '2024-01-01', hasta: addDays('2024-01-01', SERIE_SALDO_MAX_DIAS) },
    ],
  ])('la serie de saldo rechaza un rango %s', async (_caso, rango) => {
    expect(await fetchSerieSaldo(hostil(rango))).toEqual({
      ok: false,
      error: 'Rango de fechas no válido',
    })
  })

  test('la serie acepta el tramo máximo exacto', async () => {
    const r = await fetchSerieSaldo({
      desde: '2024-01-01',
      hasta: addDays('2024-01-01', SERIE_SALDO_MAX_DIAS - 1),
    })
    expect(r.ok && r.data).toHaveLength(SERIE_SALDO_MAX_DIAS)
  })

  test.each(['2026-13', '2026-3', '', '2026-03-01', 202603])(
    'un periodo no válido (%j) se rechaza con su mensaje',
    async (periodo) => {
      const NO_VALIDO = { ok: false, error: 'Periodo no válido' }
      expect(await fetchTotalesDelMes(hostil(periodo))).toEqual(NO_VALIDO)
      expect(await fetchGastoPorCategoria(hostil(periodo))).toEqual(NO_VALIDO)
    },
  )

  test.each([0, -1, 1.5, INFORME_MESES_MAX + 1, 1e9, '12'])(
    'un número de meses no válido (%j) se rechaza',
    async (meses) => {
      expect(await fetchIngresosVsGastos(hostil(meses))).toEqual({
        ok: false,
        error: 'Número de meses no válido',
      })
    },
  )
})

describe('sin argumentos', () => {
  // Quien llama a mano al endpoint puede no mandar nada, o mandar null.
  test('listEntity sin parámetros lista con los de por defecto', async () => {
    await seedCategoria(base().db, 'a', USER_A, { name: 'Alfa' })
    expect(await listEntity('Categorias', hostil(undefined))).toMatchObject({
      ok: true,
      data: { total: 1 },
    })
  })

  test('fetchSerieSaldo con null usa el rango por defecto', async () => {
    expect(await fetchSerieSaldo(hostil(null))).toMatchObject({ ok: true })
  })
})
