/**
 * Repositorio de Categorías.
 *
 * El grueso son las reglas de jerarquía y de nombre único, porque la base NO
 * puede imponerlas por sí sola: en SQLite dos NULL son distintos, así que el
 * UNIQUE del esquema no impide dos categorías raíz con el mismo nombre.
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
import { categories } from '@/db/schema'
import { categoriasRepository as repo } from '../categorias.repository'
import { seedCategoria, seedCuenta, seedMovimiento, USER_A, USER_B } from './helpers'

let ctx: TestDb

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
})

afterEach(() => ctx.close())

const nueva = (overrides: Record<string, unknown> = {}) => ({
  nombre: 'Comida',
  tipo: 'expense',
  padreId: '',
  icono: '',
  ...overrides,
})

describe('create', () => {
  test('crea una categoría raíz', async () => {
    const { id } = await repo.create(USER_A, nueva())
    const [fila] = await ctx.db.select().from(categories).where(eq(categories.id, id))

    expect(fila.userId).toBe(USER_A)
    expect(fila.name).toBe('Comida')
    // Cadena vacía en el DTO ↔ NULL en la base. La traducción vive en el repo.
    expect(fila.parentId).toBeNull()
  })

  test('rechaza un nombre duplicado en la raíz', async () => {
    await repo.create(USER_A, nueva())
    // El UNIQUE del esquema NO caza este caso (dos NULL son distintos en SQLite):
    // si esta comprobación desaparece del repositorio, el duplicado entra.
    await expect(repo.create(USER_A, nueva())).rejects.toThrow(/Ya existe/)
  })

  test('permite el mismo nombre bajo padres distintos', async () => {
    const casa = await repo.create(USER_A, nueva({ nombre: 'Casa' }))
    const coche = await repo.create(USER_A, nueva({ nombre: 'Coche' }))

    await repo.create(USER_A, nueva({ nombre: 'Otros', padreId: casa.id }))
    await expect(
      repo.create(USER_A, nueva({ nombre: 'Otros', padreId: coche.id })),
    ).resolves.toBeDefined()
  })

  test('rechaza una categoría padre de otro usuario', async () => {
    await seedCategoria(ctx.db, 'ajena', USER_B)
    await expect(
      repo.create(USER_A, nueva({ padreId: 'ajena' })),
    ).rejects.toThrow(/no existe/)
  })

  test('rechaza colgar un gasto de una categoría de ingresos', async () => {
    await seedCategoria(ctx.db, 'nomina', USER_A, { kind: 'income' })
    await expect(
      repo.create(USER_A, nueva({ tipo: 'expense', padreId: 'nomina' })),
    ).rejects.toThrow(/mismo tipo/)
  })

  test('rechaza el segundo nivel de anidamiento', async () => {
    await seedCategoria(ctx.db, 'padre', USER_A)
    await seedCategoria(ctx.db, 'hija', USER_A, { parentId: 'padre' })

    await expect(
      repo.create(USER_A, nueva({ nombre: 'Nieta', padreId: 'hija' })),
    ).rejects.toThrow(/un solo nivel/)
  })

  test('rechaza un tipo inventado', async () => {
    await expect(repo.create(USER_A, nueva({ tipo: 'traspaso' }))).rejects.toThrow()
  })
})

describe('autorización', () => {
  test('no se puede renombrar la categoría de otro usuario', async () => {
    await seedCategoria(ctx.db, 'ajena', USER_B)

    await expect(
      repo.update(USER_A, 'ajena', { nombre: 'Secuestrada', padreId: '', icono: '' }),
    ).rejects.toThrow('No encontrado')

    const [fila] = await ctx.db.select().from(categories).where(eq(categories.id, 'ajena'))
    expect(fila.name).toBe('Categoría ajena')
  })

  test('no se puede borrar la categoría de otro usuario', async () => {
    await seedCategoria(ctx.db, 'ajena', USER_B)
    await expect(repo.remove(USER_A, 'ajena')).rejects.toThrow('No encontrado')
  })

  test('el listado solo trae las del usuario', async () => {
    await seedCategoria(ctx.db, 'mia', USER_A)
    await seedCategoria(ctx.db, 'ajena', USER_B)

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data.map((c) => c.id)).toEqual(['mia'])
  })
})

describe('update', () => {
  test('el tipo no se puede cambiar', async () => {
    await seedCategoria(ctx.db, 'c1', USER_A, { kind: 'expense' })

    await repo.update(USER_A, 'c1', {
      nombre: 'Renombrada',
      padreId: '',
      icono: '',
      tipo: 'income',
    })

    const [fila] = await ctx.db.select().from(categories).where(eq(categories.id, 'c1'))
    // Cambiarlo reinterpretaría todos los movimientos ya clasificados con ella.
    expect(fila.kind).toBe('expense')
    expect(fila.name).toBe('Renombrada')
  })

  test('una categoría no puede ser su propia padre', async () => {
    await seedCategoria(ctx.db, 'c1', USER_A)
    await expect(
      repo.update(USER_A, 'c1', { nombre: 'C1', padreId: 'c1', icono: '' }),
    ).rejects.toThrow(/su propia padre/)
  })
})

describe('remove', () => {
  test('no borra una categoría en uso', async () => {
    await seedCuenta(ctx.db, 'cuenta-1', USER_A)
    await seedCategoria(ctx.db, 'usada', USER_A)
    await seedMovimiento(ctx.db, 'm1', USER_A, { categoryId: 'usada' })

    await expect(repo.remove(USER_A, 'usada')).rejects.toThrow(/Reclasifícalos/)

    const filas = await ctx.db.select().from(categories).where(eq(categories.id, 'usada'))
    expect(filas).toHaveLength(1)
  })

  test('no borra una categoría con subcategorías', async () => {
    await seedCategoria(ctx.db, 'padre', USER_A)
    await seedCategoria(ctx.db, 'hija', USER_A, { parentId: 'padre' })

    await expect(repo.remove(USER_A, 'padre')).rejects.toThrow(/subcategorías/)
  })

  test('borra una categoría suelta', async () => {
    await seedCategoria(ctx.db, 'suelta', USER_A)
    await repo.remove(USER_A, 'suelta')

    const filas = await ctx.db.select().from(categories).where(eq(categories.id, 'suelta'))
    expect(filas).toHaveLength(0)
  })
})

describe('list', () => {
  test('se puede filtrar por tipo', async () => {
    await seedCategoria(ctx.db, 'gasto', USER_A, { kind: 'expense' })
    await seedCategoria(ctx.db, 'ingreso', USER_A, { kind: 'income' })

    const { data } = await repo.list(USER_A, { paginate: false, filters: { tipo: 'income' } })
    expect(data.map((c) => c.id)).toEqual(['ingreso'])
  })

  test('trae el nombre del padre resuelto', async () => {
    await seedCategoria(ctx.db, 'padre', USER_A, { name: 'Casa' })
    await seedCategoria(ctx.db, 'hija', USER_A, { name: 'Luz', parentId: 'padre' })

    const { data } = await repo.list(USER_A, { paginate: false })
    const hija = data.find((c) => c.id === 'hija')!
    expect(hija.padreNombre).toBe('Casa')

    const padre = data.find((c) => c.id === 'padre')!
    expect(padre.padreNombre).toBeNull()
  })

  test('cuenta los usos sin contar los borrados', async () => {
    await seedCuenta(ctx.db, 'cuenta-1', USER_A)
    await seedCategoria(ctx.db, 'c1', USER_A)
    await seedMovimiento(ctx.db, 'vivo', USER_A, { categoryId: 'c1' })
    await seedMovimiento(ctx.db, 'borrado', USER_A, {
      categoryId: 'c1',
      deletedAt: new Date(),
    })

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data[0].usos).toBe(1)
  })
})
