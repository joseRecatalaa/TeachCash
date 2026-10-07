/**
 * Repositorio de Categorías.
 *
 * El grueso son la unicidad de nombre por usuario, el presupuesto obligatorio
 * en gasto, y activar/ocultar — que son las tres reglas que la base NO puede
 * imponer por sí sola o que no existen en absoluto a nivel de columna.
 */

import { describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())

import { usarBaseDeTest } from '@/test/harness'
import { categories, transactions } from '@/db/schema'
import {
  activarCategoria,
  asegurarCatalogoInicial,
  categoriasRepository as repo,
  listarCatalogoCategorias,
  ocultarCategoria,
} from '../categorias.repository'
import { esperarErrorDeCampo, seedCategoria, seedMovimiento, USER_A, USER_B } from './helpers'

const base = usarBaseDeTest()

const nueva = (overrides: Record<string, unknown> = {}) => ({
  nombre: 'Comida',
  tipo: 'expense',
  icono: '',
  color: '',
  presupuesto: 500,
  ...overrides,
})

describe('create', () => {
  test('crea una categoría', async () => {
    const { id } = await repo.create(USER_A, nueva())
    const [fila] = await base().db.select().from(categories).where(eq(categories.id, id))

    expect(fila.userId).toBe(USER_A)
    expect(fila.name).toBe('Comida')
    // Céntimos, tal cual: sin redondeos ni escalado en el repositorio.
    expect(fila.monthlyBudget).toBe(500)
    // Nace visible: solo las de fábrica nacen ocultas, y eso lo decide el seed.
    expect(fila.hidden).toBe(false)
  })

  test('rechaza un nombre duplicado', async () => {
    await repo.create(USER_A, nueva())
    await expect(repo.create(USER_A, nueva())).rejects.toThrow(/Ya existe/)
  })

  test('permite el mismo nombre para usuarios distintos', async () => {
    await repo.create(USER_A, nueva())
    await expect(repo.create(USER_B, nueva())).resolves.toEqual({ id: expect.any(String) })
  })

  test('rechaza un tipo inventado', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nueva({ tipo: 'traspaso' })), 'tipo')
  })

  test('exige un presupuesto positivo en una categoría de gasto', async () => {
    await expect(
      repo.create(USER_A, nueva({ presupuesto: null })),
    ).rejects.toThrow(/presupuesto mensual es obligatorio/)
    await expect(
      repo.create(USER_A, nueva({ presupuesto: 0 })),
    ).rejects.toThrow(/presupuesto mensual es obligatorio/)
  })

  test('ignora el presupuesto en una categoría de ingreso', async () => {
    const { id } = await repo.create(
      USER_A,
      nueva({ nombre: 'Nómina', tipo: 'income', presupuesto: 999 }),
    )
    const [fila] = await base().db.select().from(categories).where(eq(categories.id, id))
    expect(fila.monthlyBudget).toBeNull()
  })
})

describe('autorización', () => {
  test('no se puede renombrar la categoría de otro usuario', async () => {
    await seedCategoria(base().db, 'ajena', USER_B)

    await expect(
      repo.update(USER_A, 'ajena', {
        nombre: 'Secuestrada',
        icono: '',
        color: '',
        presupuesto: 500,
      }),
    ).rejects.toThrow('No encontrado')

    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'ajena'))
    expect(fila.name).toBe('Categoría ajena')
  })

  test('no se puede borrar la categoría de otro usuario', async () => {
    await seedCategoria(base().db, 'ajena', USER_B)
    await seedMovimiento(base().db, 'tx-ajeno', USER_B, { categoryId: 'ajena' })

    await expect(repo.remove(USER_A, 'ajena')).rejects.toThrow('No encontrado')

    // Comprobar el DATO, no solo la respuesta: borrar arrastra los movimientos
    // en cascada, y un error devuelto DESPUÉS de borrar seguiría siendo un error.
    expect(await base().db.select().from(categories)).toHaveLength(1)
    expect(await base().db.select().from(transactions)).toHaveLength(1)
  })

  test('el listado solo trae las del usuario', async () => {
    await seedCategoria(base().db, 'mia', USER_A)
    await seedCategoria(base().db, 'ajena', USER_B)

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data.map((c) => c.id)).toEqual(['mia'])
  })
})

describe('update', () => {
  test('el tipo no se puede cambiar', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { kind: 'expense' })

    await repo.update(USER_A, 'c1', {
      nombre: 'Renombrada',
      icono: '',
      color: '',
      presupuesto: 500,
      tipo: 'income',
    })

    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'c1'))
    // Cambiarlo reinterpretaría todos los movimientos ya clasificados con ella.
    expect(fila.kind).toBe('expense')
    expect(fila.name).toBe('Renombrada')
  })

  test('exige un presupuesto positivo al editar una categoría de gasto', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { kind: 'expense', monthlyBudget: 500 })
    await expect(
      repo.update(USER_A, 'c1', {
        nombre: 'C1',
        icono: '',
        color: '',
        presupuesto: null,
      }),
    ).rejects.toThrow(/presupuesto mensual es obligatorio/)
  })

  test('actualiza el presupuesto de una categoría de gasto', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { kind: 'expense', monthlyBudget: 500 })
    await repo.update(USER_A, 'c1', {
      nombre: 'C1',
      icono: '',
      color: '',
      presupuesto: 1500,
    })
    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'c1'))
    expect(fila.monthlyBudget).toBe(1500)
  })

  test('ignora el presupuesto al editar una categoría de ingreso', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { kind: 'income' })
    await repo.update(USER_A, 'c1', {
      nombre: 'C1',
      icono: '',
      color: '',
      presupuesto: 999,
    })
    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'c1'))
    expect(fila.monthlyBudget).toBeNull()
  })
})

describe('activarCategoria', () => {
  test('activa una categoría oculta y fija el presupuesto recibido', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { kind: 'expense', hidden: true })
    await activarCategoria(USER_A, 'c1', 2500)

    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'c1'))
    expect(fila.hidden).toBe(false)
    expect(fila.monthlyBudget).toBe(2500)
  })

  test('conserva el presupuesto ya fijado si no se manda uno nuevo', async () => {
    await seedCategoria(base().db, 'c1', USER_A, {
      kind: 'expense',
      hidden: true,
      monthlyBudget: 800,
    })
    await activarCategoria(USER_A, 'c1')

    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'c1'))
    expect(fila.hidden).toBe(false)
    expect(fila.monthlyBudget).toBe(800)
  })

  test('rechaza activar una categoría de gasto sin presupuesto', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { kind: 'expense', hidden: true })
    await expect(activarCategoria(USER_A, 'c1')).rejects.toThrow(/presupuesto mensual/)

    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'c1'))
    // No se activa a medias: si falla la validación, se queda oculta.
    expect(fila.hidden).toBe(true)
  })

  test('activar una categoría de ingreso no pide presupuesto', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { kind: 'income', hidden: true })
    await activarCategoria(USER_A, 'c1')

    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'c1'))
    expect(fila.hidden).toBe(false)
  })

  test('no se puede activar la categoría oculta de otro usuario', async () => {
    await seedCategoria(base().db, 'ajena', USER_B, { kind: 'expense', hidden: true })
    await expect(activarCategoria(USER_A, 'ajena', 500)).rejects.toThrow('No encontrado')

    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'ajena'))
    expect(fila.hidden).toBe(true)
  })
})

describe('ocultarCategoria', () => {
  test('oculta una categoría sin borrarla', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { hidden: false })
    await ocultarCategoria(USER_A, 'c1')

    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'c1'))
    expect(fila.hidden).toBe(true)
  })

  test('no se puede ocultar la categoría de otro usuario', async () => {
    await seedCategoria(base().db, 'ajena', USER_B, { hidden: false })
    await expect(ocultarCategoria(USER_A, 'ajena')).rejects.toThrow('No encontrado')

    const [fila] = await base().db.select().from(categories).where(eq(categories.id, 'ajena'))
    expect(fila.hidden).toBe(false)
  })
})

describe('remove', () => {
  test('borrar una categoría en uso se lleva por delante sus movimientos', async () => {
    await seedCategoria(base().db, 'usada', USER_A)
    await seedMovimiento(base().db, 'm1', USER_A, { categoryId: 'usada' })
    await seedMovimiento(base().db, 'm2', USER_A, { categoryId: 'usada' })

    await repo.remove(USER_A, 'usada')

    const categoriaFilas = await base().db.select().from(categories).where(eq(categories.id, 'usada'))
    expect(categoriaFilas).toHaveLength(0)

    // Ni papelera ni "sin clasificar": una categoría es obligatoria en todo
    // movimiento, así que sin ella el movimiento tampoco puede quedarse.
    const movimientos = await base().db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, USER_A))
    expect(movimientos).toHaveLength(0)
  })

  test('no toca los movimientos de otras categorías', async () => {
    await seedCategoria(base().db, 'usada', USER_A)
    await seedCategoria(base().db, 'otra', USER_A)
    await seedMovimiento(base().db, 'm1', USER_A, { categoryId: 'usada' })
    await seedMovimiento(base().db, 'm2', USER_A, { categoryId: 'otra' })

    await repo.remove(USER_A, 'usada')

    const movimientos = await base().db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, USER_A))
    expect(movimientos.map((m) => m.id)).toEqual(['m2'])
  })

  test('borra una categoría suelta', async () => {
    await seedCategoria(base().db, 'suelta', USER_A)
    await repo.remove(USER_A, 'suelta')

    const filas = await base().db.select().from(categories).where(eq(categories.id, 'suelta'))
    expect(filas).toHaveLength(0)
  })
})

describe('list', () => {
  test('se puede filtrar por tipo', async () => {
    await seedCategoria(base().db, 'gasto', USER_A, { kind: 'expense' })
    await seedCategoria(base().db, 'ingreso', USER_A, { kind: 'income' })

    const { data } = await repo.list(USER_A, { paginate: false, filters: { tipo: 'income' } })
    expect(data.map((c) => c.id)).toEqual(['ingreso'])
  })

  test('cuenta los usos', async () => {
    await seedCategoria(base().db, 'c1', USER_A)
    await seedMovimiento(base().db, 'm1', USER_A, { categoryId: 'c1' })
    await seedMovimiento(base().db, 'm2', USER_A, { categoryId: 'c1' })

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data[0].usos).toBe(2)
  })

  test('se puede filtrar por oculta', async () => {
    await seedCategoria(base().db, 'activa', USER_A, { hidden: false })
    await seedCategoria(base().db, 'oculta', USER_A, { hidden: true })

    const visibles = await repo.list(USER_A, { paginate: false, filters: { oculta: 'false' } })
    expect(visibles.data.map((c) => c.id)).toEqual(['activa'])

    const ocultas = await repo.list(USER_A, { paginate: false, filters: { oculta: 'true' } })
    expect(ocultas.data.map((c) => c.id)).toEqual(['oculta'])
  })
})

describe('listarCatalogoCategorias', () => {
  test('excluye las categorías ocultas', async () => {
    await seedCategoria(base().db, 'activa', USER_A, { hidden: false })
    await seedCategoria(base().db, 'oculta', USER_A, { hidden: true })

    const catalogo = await listarCatalogoCategorias(USER_A)
    expect(catalogo.map((c) => c.id)).toEqual(['activa'])
  })
})

describe('catálogo inicial', () => {
  const deUsuario = (userId: string) =>
    base().db.select().from(categories).where(eq(categories.userId, userId))

  test('da las 17 categorías de fábrica, ocultas y con color', async () => {
    await asegurarCatalogoInicial(USER_A)
    const filas = await deUsuario(USER_A)
    expect(filas).toHaveLength(17)
    expect(filas.every((c) => c.hidden)).toBe(true)
    expect(filas.every((c) => c.color?.startsWith('cat-'))).toBe(true)
  })

  test('es idempotente, también con dos llamadas a la vez', async () => {
    // Dos pestañas abriéndose a la vez: las dos ven "sin categorías" e insertan.
    await Promise.all([asegurarCatalogoInicial(USER_A), asegurarCatalogoInicial(USER_A)])
    await asegurarCatalogoInicial(USER_A)
    expect(await deUsuario(USER_A)).toHaveLength(17)
  })

  test('no toca a quien ya tiene categorías', async () => {
    await seedCategoria(base().db, 'propia', USER_A, { name: 'Propia' })
    await asegurarCatalogoInicial(USER_A)
    expect(await deUsuario(USER_A)).toHaveLength(1)
  })

  test('es por usuario', async () => {
    await asegurarCatalogoInicial(USER_A)
    expect(await deUsuario(USER_B)).toHaveLength(0)
  })
})

describe('nombre único por usuario', () => {
  test('renombrar a su propio nombre no choca consigo misma', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { name: 'Comida', monthlyBudget: 500 })
    await expect(
      repo.update(USER_A, 'c1', { nombre: 'Comida', icono: '', color: 'cat-2', presupuesto: 600 }),
    ).resolves.toEqual({ id: 'c1' })
  })

  test('renombrar al nombre de OTRA categoría suya se rechaza', async () => {
    await seedCategoria(base().db, 'c1', USER_A, { name: 'Comida', monthlyBudget: 500 })
    await seedCategoria(base().db, 'c2', USER_A, { name: 'Ocio', monthlyBudget: 500 })

    await esperarErrorDeCampo(
      repo.update(USER_A, 'c2', { nombre: 'Comida', icono: '', color: '', presupuesto: 500 }),
      'nombre',
    )
  })

  test('los espacios de alrededor no sirven para duplicar un nombre', async () => {
    await repo.create(USER_A, nueva({ nombre: 'Comida' }))
    await esperarErrorDeCampo(repo.create(USER_A, nueva({ nombre: '  Comida  ' })), 'nombre')
  })
})

describe('límites de los campos', () => {
  test('nombre obligatorio y de 40 caracteres como mucho', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nueva({ nombre: '   ' })), 'nombre')
    await esperarErrorDeCampo(repo.create(USER_A, nueva({ nombre: 'x'.repeat(41) })), 'nombre')
  })

  test('solo colores de la paleta: nunca un color a pelo', async () => {
    // La base guarda la CLAVE (`cat-3`); un hexadecimal no tendría variante
    // oscura y rompería la regla del sistema de diseño.
    await esperarErrorDeCampo(repo.create(USER_A, nueva({ color: '#ff0000' })), 'color')
    await esperarErrorDeCampo(repo.create(USER_A, nueva({ color: 'cat-9' })), 'color')
  })

  test('el presupuesto es un entero de céntimos no negativo', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nueva({ presupuesto: 12.5 })), 'presupuesto')
    await esperarErrorDeCampo(repo.create(USER_A, nueva({ presupuesto: -100 })), 'presupuesto')
  })
})

describe('"no existe" y "no es tuya" son indistinguibles', () => {
  test('get, update y remove responden igual a un id ajeno que a uno inventado', async () => {
    await seedCategoria(base().db, 'ajena', USER_B, { monthlyBudget: 500 })
    const cambios = { nombre: 'X', icono: '', color: '', presupuesto: 500 }

    for (const id of ['ajena', 'no-existe']) {
      expect(await repo.get(USER_A, id)).toBeNull()
      await expect(repo.update(USER_A, id, cambios)).rejects.toThrow(/^No encontrado$/)
      await expect(repo.remove(USER_A, id)).rejects.toThrow(/^No encontrado$/)
    }
  })
})
