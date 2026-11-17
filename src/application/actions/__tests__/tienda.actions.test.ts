/**
 * Server Actions de la tienda y del cuadro: la frontera. Sin sesión no se toca
 * nada, un id con otra forma es "No encontrado", y lo que se compra es del usuario
 * de la sesión. Las reglas de la compra las prueba `tienda.repository.test.ts`.
 */

import { fileURLToPath } from 'node:url'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/lib/auth', async () => (await import('@/test/mocks/auth')).authMock())
vi.mock('@/src/infrastructure/heroe/contenido', async (original) => {
  const real = await original<typeof import('@/src/infrastructure/heroe/contenido')>()
  const raiz = fileURLToPath(
    new URL('../../../infrastructure/repositories/__tests__/fixtures/heroe', import.meta.url),
  )
  return { ...real, contenido: () => real.cargarContenido(raiz) }
})

import { harness, usarBaseDeTest } from '@/test/harness'
import { heroItems, heroProgress } from '@/db/schema'
import { USER_A, USER_B } from '@/src/infrastructure/repositories/__tests__/helpers'
import { fetchCuadro } from '../cuadro.actions'
import { comprarObjeto, equiparObjeto, fetchTienda, quitarObjeto } from '../tienda.actions'

const base = usarBaseDeTest()

const sembrar = (userId: string) =>
  base()
    .db.insert(heroProgress)
    .values({ userId, levelId: 'prueba/01-lectura', stars: 3, bestScore: 1, attempts: 1 })

describe('sesión', () => {
  test.each([
    ['fetchCuadro', () => fetchCuadro()],
    ['fetchTienda', () => fetchTienda()],
    ['comprarObjeto', () => comprarObjeto('casco-basica')],
    ['equiparObjeto', () => equiparObjeto('casco-basica')],
    ['quitarObjeto', () => quitarObjeto('casco-basica')],
  ])('%s sin sesión no hace nada', async (_nombre, llamar) => {
    harness.userId = null
    expect(await llamar()).toEqual({ ok: false, error: 'No autorizado' })
    expect(await base().db.select().from(heroItems)).toEqual([])
  })
})

describe('ids en la frontera', () => {
  test.each([
    ['que no es un texto', { id: 'casco-basica' }],
    ['larguísimo', 'a'.repeat(5_000)],
    ['que no está en el catálogo', 'casco-de-diamante'],
  ])('un id %s es "No encontrado"', async (_caso, id) => {
    await sembrar(harness.userId as string)
    for (const accion of [comprarObjeto, equiparObjeto, quitarObjeto]) {
      expect(await accion(id as string)).toEqual({ ok: false, error: 'No encontrado' })
    }
    expect(await base().db.select().from(heroItems)).toEqual([])
  })
})

describe('el usuario es el de la sesión', () => {
  test('la compra va a su nombre y se ve en la tienda y en el cuadro', async () => {
    harness.userId = USER_A
    await sembrar(USER_A)

    const compra = await comprarObjeto('casco-basica')
    expect(compra.ok && compra.data.equipo).toEqual(['casco-basica'])
    const [fila] = await base().db.select().from(heroItems)
    expect(fila.userId).toBe(USER_A)

    const cuadro = await fetchCuadro()
    expect(cuadro.ok && cuadro.data.equipo).toEqual(['casco-basica'])
    const tienda = await fetchTienda()
    expect(tienda.ok && tienda.data.estrellas.gastadas).toBe(3)
  })

  test('otro usuario no puede quitar ni ponerse lo que compró el primero', async () => {
    harness.userId = USER_A
    await sembrar(USER_A)
    await comprarObjeto('casco-basica')

    harness.userId = USER_B
    expect(await quitarObjeto('casco-basica')).toEqual({ ok: false, error: 'No encontrado' })
    expect(await equiparObjeto('casco-basica')).toEqual({ ok: false, error: 'No encontrado' })
  })

  test('sin estrellas, el error llega como valor y legible', async () => {
    harness.userId = USER_A
    expect(await comprarObjeto('casco-basica')).toEqual({
      ok: false,
      error: 'No tienes estrellas suficientes',
    })
  })
})
