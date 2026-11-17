/**
 * El Cuadro de mando: que junta bien lo de los demás repositorios. Las reglas de
 * cada estadística están probadas en `lib/__tests__/estadisticas.test.ts`.
 */

import { fileURLToPath } from 'node:url'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('../../heroe/contenido', async (original) => {
  const real = await original<typeof import('../../heroe/contenido')>()
  const raiz = fileURLToPath(new URL('./fixtures/heroe', import.meta.url))
  return { ...real, contenido: () => real.cargarContenido(raiz) }
})

import { categories, heroProgress, profiles, transactions } from '@/db/schema'
import { today } from '@/lib/dates'
import { usarBaseDeTest } from '@/test/harness'
import { getCuadro } from '../cuadro.repository'
import { guardarPatrimonio } from '../perfiles.repository'
import { comprar } from '../tienda.repository'
import { USER_A, USER_B } from './helpers'

const base = usarBaseDeTest()

const anotar = async (userId: string, amount: number) => {
  const [cat] = await base()
    .db.insert(categories)
    .values({ userId, name: `Cat ${amount}`, kind: amount > 0 ? 'income' : 'expense' })
    .returning()
  await base()
    .db.insert(transactions)
    .values({ userId, categoryId: cat.id, amount, date: today(), description: 'x' })
}

const valor = (cuadro: Awaited<ReturnType<typeof getCuadro>>, clave: string) =>
  cuadro.estadisticas.find((e) => e.clave === clave)?.valor

describe('getCuadro', () => {
  test('un usuario nuevo tiene todo a cero', async () => {
    const cuadro = await getCuadro(USER_A)
    expect(cuadro.patrimonio).toBe(0)
    expect(cuadro.ganancia).toBe(0)
    expect(cuadro.inicialElegido).toBe(false)
    expect(cuadro.equipo).toEqual([])
    expect(cuadro.estadisticas.every((e) => e.valor === 0)).toBe(true)
  })

  test('la ganancia no cuenta el patrimonio inicial', async () => {
    await base().db.insert(profiles).values({ userId: USER_A, netWorthWithoutMovements: 1_000_000, firstNetWorth: 1_000_000 })
    await anotar(USER_A, 100_000)
    const cuadro = await getCuadro(USER_A)
    expect(cuadro.patrimonio).toBe(1_100_000)
    expect(cuadro.ganancia).toBe(100_000)
    expect(cuadro.inicialElegido).toBe(true)
    expect(valor(cuadro, 'RIQ')).toBe(40)
  })

  test('la ganancia es contra el PRIMER patrimonio, también tras editarlo', async () => {
    await guardarPatrimonio(USER_A, { patrimonio: 1_020_000 })
    await anotar(USER_A, 100_000)
    // Editar el total con el lápiz (sin anotar nada) también es ganar.
    await guardarPatrimonio(USER_A, { patrimonio: 1_500_000 })

    const cuadro = await getCuadro(USER_A)
    expect(cuadro.patrimonio).toBe(1_500_000)
    expect(cuadro.ganancia).toBe(480_000)
  })

  test('perder dinero deja la ganancia en negativo y Riqueza en cero', async () => {
    await anotar(USER_A, -5_000)
    const cuadro = await getCuadro(USER_A)
    expect(cuadro.ganancia).toBe(-5_000)
    expect(valor(cuadro, 'RIQ')).toBe(0)
  })

  test('un mes en positivo sube la Constancia', async () => {
    await anotar(USER_A, 5_000)
    expect(valor(await getCuadro(USER_A), 'CON')).toBe(8)
  })

  test('lo equipado sube el Poder y gasta estrellas', async () => {
    await base()
      .db.insert(heroProgress)
      .values({ userId: USER_A, levelId: 'prueba/01-lectura', stars: 3, bestScore: 1, attempts: 1 })
    await comprar(USER_A, 'casco-basica')
    const cuadro = await getCuadro(USER_A)
    expect(cuadro.equipo).toEqual(['casco-basica'])
    expect(valor(cuadro, 'POD')).toBe(4)
    expect(cuadro.estrellas).toEqual({ ganadas: 3, gastadas: 3, disponibles: 0 })
  })

  test('no ve nada de otro usuario', async () => {
    await anotar(USER_B, 100_000)
    expect((await getCuadro(USER_A)).patrimonio).toBe(0)
  })
})
