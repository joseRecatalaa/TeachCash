/**
 * La tienda: que no se gastan estrellas que no hay, que el precio es el del
 * catálogo, que hay uno equipado por hueco y que cada usuario tiene lo suyo.
 *
 * Con el contenido de prueba (`fixtures/heroe/`) y estrellas sembradas
 * directamente en `hero_progress`: aquí no se prueba cómo se ganan.
 */

import { fileURLToPath } from 'node:url'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('../../heroe/contenido', async (original) => {
  const real = await original<typeof import('../../heroe/contenido')>()
  const raiz = fileURLToPath(new URL('./fixtures/heroe', import.meta.url))
  return { ...real, contenido: () => real.cargarContenido(raiz) }
})

import { usarBaseDeTest } from '@/test/harness'
import { heroItems, heroProgress } from '@/db/schema'
import { comprar, equipar, getEquipo, getEstrellas, getTienda, quitar } from '../tienda.repository'
import { USER_A, USER_B } from './helpers'

const base = usarBaseDeTest()

/** Las tres de cada nivel de prueba suman 9 estrellas. */
const LECTURA = 'prueba/01-lectura'
const INTERACTIVO = 'prueba/02-interactivo'
const JEFE = 'prueba/03-jefe'

const sembrar = async (userId: string, niveles = [LECTURA, INTERACTIVO, JEFE]) => {
  await base()
    .db.insert(heroProgress)
    .values(niveles.map((levelId) => ({ userId, levelId, stars: 3, bestScore: 1, attempts: 1 })))
}

const equipado = (tienda: Awaited<ReturnType<typeof getTienda>>, id: string) =>
  tienda.objetos.find((o) => o.id === id)?.equipado

describe('las estrellas', () => {
  test('sin jugar no hay', async () => {
    expect(await getEstrellas(USER_A)).toEqual({ ganadas: 0, gastadas: 0, disponibles: 0 })
  })

  test('comprar gasta y no le quita nada a lo ganado', async () => {
    await sembrar(USER_A)
    await comprar(USER_A, 'casco-media')
    expect(await getEstrellas(USER_A)).toEqual({ ganadas: 9, gastadas: 6, disponibles: 3 })
  })

  test('un nivel que ya no existe no suma y nunca enseña un saldo negativo', async () => {
    await sembrar(USER_A)
    await base().db.insert(heroItems).values({ userId: USER_A, itemId: 'casco-alta', pricePaid: 50 })
    await base()
      .db.insert(heroProgress)
      .values({ userId: USER_A, levelId: 'retirado/01', stars: 3, bestScore: 1, attempts: 1 })
    expect(await getEstrellas(USER_A)).toEqual({ ganadas: 9, gastadas: 50, disponibles: 0 })
  })
})

describe('comprar', () => {
  test('sin estrellas suficientes no compra nada', async () => {
    await sembrar(USER_A, [LECTURA])
    await expect(comprar(USER_A, 'casco-media')).rejects.toThrow('No tienes estrellas suficientes')
    expect(await getEquipo(USER_A)).toEqual([])
  })

  test('con las justas sí, y se lo pone', async () => {
    await sembrar(USER_A, [LECTURA])
    const tienda = await comprar(USER_A, 'casco-basica')
    expect(tienda.estrellas.disponibles).toBe(0)
    expect(tienda.equipo).toEqual(['casco-basica'])
  })

  test('guarda el precio del catálogo', async () => {
    await sembrar(USER_A)
    await comprar(USER_A, 'casco-media')
    const [fila] = await base().db.select().from(heroItems)
    expect(fila.pricePaid).toBe(6)
  })

  test('dos veces el mismo objeto no se cobra dos veces', async () => {
    await sembrar(USER_A)
    await comprar(USER_A, 'casco-basica')
    await expect(comprar(USER_A, 'casco-basica')).rejects.toThrow('Ya tienes este objeto')
    expect((await getEstrellas(USER_A)).gastadas).toBe(3)
  })

  test('dos compras a la vez no gastan más de lo que hay', async () => {
    await sembrar(USER_A)
    const r = await Promise.allSettled([comprar(USER_A, 'casco-media'), comprar(USER_A, 'botas-media')])
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1)
    expect(await getEstrellas(USER_A)).toEqual({ ganadas: 9, gastadas: 6, disponibles: 3 })
  })

  test('un objeto que no está en el catálogo no se compra', async () => {
    await sembrar(USER_A)
    await expect(comprar(USER_A, 'casco-de-diamante')).rejects.toThrow('No encontrado')
    expect(await base().db.select().from(heroItems)).toEqual([])
  })

  test('sustituye a lo que hubiera en su hueco', async () => {
    await sembrar(USER_A)
    await comprar(USER_A, 'espada-basica')
    const tienda = await comprar(USER_A, 'martillo-basica')
    expect(tienda.equipo).toEqual(['martillo-basica'])
    expect(tienda.objetos.find((o) => o.id === 'espada-basica')?.comprado).toBe(true)
  })

  test('no toca lo de otros huecos', async () => {
    await sembrar(USER_A)
    await comprar(USER_A, 'casco-basica')
    const tienda = await comprar(USER_A, 'botas-basica')
    expect([...tienda.equipo].sort()).toEqual(['botas-basica', 'casco-basica'])
  })
})

describe('equipar y quitar', () => {
  test('quitar lo conserva y no devuelve estrellas', async () => {
    await sembrar(USER_A)
    await comprar(USER_A, 'casco-basica')
    const tienda = await quitar(USER_A, 'casco-basica')
    expect(tienda.equipo).toEqual([])
    expect(tienda.objetos.find((o) => o.id === 'casco-basica')?.comprado).toBe(true)
    expect(tienda.estrellas.gastadas).toBe(3)
  })

  test('equipar sustituye a lo del hueco y sale gratis', async () => {
    await sembrar(USER_A)
    await comprar(USER_A, 'espada-basica')
    await comprar(USER_A, 'martillo-basica')
    const tienda = await equipar(USER_A, 'espada-basica')
    expect(equipado(tienda, 'espada-basica')).toBe(true)
    expect(equipado(tienda, 'martillo-basica')).toBe(false)
    expect(tienda.estrellas.gastadas).toBe(6)
  })

  test.each(['equipar', 'quitar'] as const)('no se puede %s lo que no se ha comprado', async (accion) => {
    const hacer = accion === 'equipar' ? equipar : quitar
    await expect(hacer(USER_A, 'casco-basica')).rejects.toThrow('No encontrado')
    await expect(hacer(USER_A, 'no-existe')).rejects.toThrow('No encontrado')
  })
})

describe('cada usuario tiene lo suyo', () => {
  test('las compras de uno no se ven ni se gastan en otro', async () => {
    await sembrar(USER_A)
    await sembrar(USER_B)
    await comprar(USER_A, 'casco-media')
    expect(await getEquipo(USER_B)).toEqual([])
    expect((await getEstrellas(USER_B)).gastadas).toBe(0)
  })

  test('no se puede tocar lo que compró otro', async () => {
    await sembrar(USER_A)
    await comprar(USER_A, 'casco-basica')
    await expect(quitar(USER_B, 'casco-basica')).rejects.toThrow('No encontrado')
    await expect(equipar(USER_B, 'casco-basica')).rejects.toThrow('No encontrado')
    expect(await getEquipo(USER_A)).toEqual(['casco-basica'])
  })

  test('sin estrellas propias no se compra con las de otro', async () => {
    await sembrar(USER_A)
    await expect(comprar(USER_B, 'casco-basica')).rejects.toThrow('No tienes estrellas suficientes')
  })
})

describe('un objeto retirado del catálogo', () => {
  test('sigue contando como gastado, pero no se lleva puesto', async () => {
    await sembrar(USER_A)
    await base().db.insert(heroItems).values({ userId: USER_A, itemId: 'retirado', pricePaid: 2 })
    expect(await getEquipo(USER_A)).toEqual([])
    expect((await getEstrellas(USER_A)).gastadas).toBe(2)
  })
})
