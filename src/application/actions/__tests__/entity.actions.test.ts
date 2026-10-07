/**
 * El dispatcher genérico de Server Actions.
 *
 * Estos tests existen por una razón concreta: `entity.actions.ts` expone
 * endpoints POST públicos que aceptan un `resource` y unos `values` sin tipar.
 * Es un diseño que solo se sostiene por cuatro invariantes, y son exactamente
 * las que se comprueban aquí. Si alguna cae, cae la regla dura 3.
 */

import { describe, expect, test, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/lib/auth', async () => (await import('@/test/mocks/auth')).authMock())

import { harness, usarBaseDeTest } from '@/test/harness'
import { categories, transactions } from '@/db/schema'
import {
  activarCategoria,
  createEntity,
  deleteEntity,
  fetchCatalogos,
  fetchFormMetadata,
  getEntity,
  getSaldo,
  listEntity,
  ocultarCategoria,
  updateEntity,
} from '../entity.actions'
import { REPOSITORIES } from '@/src/infrastructure/repositories'
import {
  seedCategoria,
  seedMovimiento,
  USER_A,
  USER_B,
} from '@/src/infrastructure/repositories/__tests__/helpers'

const base = usarBaseDeTest()

/**
 * Categorías hace de recurso de PRUEBA del dispatcher. No se prueba aquí nada
 * de categorías —eso está en su propio test de repositorio—: lo que se ejercita
 * es el camino genérico, y hace falta un recurso real del mapa cerrado para
 * recorrerlo entero hasta Postgres.
 */
const categoria = {
  nombre: 'Nómina',
  tipo: 'income',
  icono: '',
  color: '',
  presupuesto: null,
}

describe('el recurso se resuelve contra un mapa cerrado', () => {
  test.each(['Usuarios', 'sqlite_master', '../db/schema', ''])(
    'un recurso desconocido (%j) no ejecuta nada',
    async (resource) => {
      const resultado = await listEntity(resource, {})
      expect(resultado.ok).toBe(false)
      // Falla como error inesperado y NO filtra qué recursos existen.
      if (!resultado.ok) expect(resultado.error).toBe('Se ha producido un error inesperado')
    },
  )

  test('un recurso desconocido tampoco escribe', async () => {
    const resultado = await createEntity('Usuarios', { nombre: 'x' })
    expect(resultado.ok).toBe(false)
  })
})

describe('la sesión se comprueba siempre', () => {
  test.each([
    ['listEntity', () => listEntity('Categorias', {})],
    ['getEntity', () => getEntity('Categorias', 'x')],
    ['createEntity', () => createEntity('Categorias', categoria)],
    ['updateEntity', () => updateEntity('Categorias', 'x', categoria)],
    ['deleteEntity', () => deleteEntity('Categorias', 'x')],
  ])('%s sin sesión no hace nada', async (_nombre, ejecutar) => {
    harness.userId = null

    const resultado = await ejecutar()
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error).toBe('No autorizado')

    const filas = await base().db.select().from(categories)
    expect(filas).toHaveLength(0)
  })
})

describe('el userId sale de la sesión, nunca de los argumentos', () => {
  test('un userId en los valores se ignora', async () => {
    const resultado = await createEntity('Categorias', { ...categoria, userId: USER_B })
    expect(resultado.ok).toBe(true)

    const filas = await base().db.select().from(categories)
    expect(filas[0].userId).toBe(USER_A)
  })

  test('no se puede leer el registro de otro usuario', async () => {
    await seedCategoria(base().db, 'ajena', USER_B)

    const resultado = await getEntity('Categorias', 'ajena')
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error).toBe('No encontrado')
  })

  test('no se puede escribir sobre el registro de otro usuario', async () => {
    // Arrange: una categoría de B y la sesión de A.
    await seedCategoria(base().db, 'ajena', USER_B, { monthlyBudget: 100 })

    // Act: un payload VÁLIDO. Si no lo fuera, Zod lo rechazaría antes de llegar
    // a la comprobación de propiedad y el test pasaría sin probar nada (pasó:
    // durante meses mandó un payload de la antigua entidad de cuentas).
    const resultado = await updateEntity('Categorias', 'ajena', {
      nombre: 'Secuestrada',
      icono: '',
      color: '',
      presupuesto: 999,
    })

    // Assert: el mismo mensaje que si no existiera, y la fila intacta.
    expect(resultado).toEqual({ ok: false, error: 'No encontrado' })
    const [fila] = await base().db.select().from(categories)
    expect(fila.name).toBe('Categoría ajena')
    expect(fila.monthlyBudget).toBe(100)
  })

  test('el listado solo devuelve lo del usuario de la sesión', async () => {
    await seedCategoria(base().db, 'mia', USER_A)
    await seedCategoria(base().db, 'ajena', USER_B)

    const resultado = await listEntity('Categorias', { paginate: false })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.data.data).toHaveLength(1)
      expect(resultado.data.total).toBe(1)
    }
  })
})

describe('los valores no se esparcen sobre la tabla', () => {
  test('un campo que no está en el esquema se descarta', async () => {
    const resultado = await createEntity('Categorias', {
      ...categoria,
      // Ninguno de estos debe llegar a la fila: el repositorio escribe campo a
      // campo desde lo que devuelve Zod, no desde lo que llegó.
      createdAt: new Date('1999-01-01'),
      id: 'id-elegido-por-el-cliente',
    })
    expect(resultado.ok).toBe(true)

    const [fila] = await base().db.select().from(categories)
    expect(fila.createdAt.getFullYear()).not.toBe(1999)
    expect(fila.id).not.toBe('id-elegido-por-el-cliente')
  })

  test('los valores inválidos vuelven con su error por campo', async () => {
    const resultado = await createEntity('Categorias', { ...categoria, tipo: 'inventado' })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      // El error viaja como VALOR, no como excepción: una excepción llegaría al
      // navegador redactada en producción y el formulario no podría enseñarla.
      expect(resultado.fieldErrors).toMatchObject({ tipo: expect.any(String) })
    }
  })
})

describe('errores', () => {
  test('un error de negocio llega con su mensaje, escrito para una persona', async () => {
    await createEntity('Categorias', categoria)

    const repetida = await createEntity('Categorias', categoria)

    expect(repetida).toMatchObject({
      ok: false,
      error: 'Ya existe una categoría con ese nombre',
      fieldErrors: { nombre: expect.any(String) },
    })
  })

  test('un fallo inesperado se queda en el servidor: al cliente, un texto genérico', async () => {
    // Arrange: el repositorio revienta con un detalle interno (lo que haría un
    // error de Postgres con el SQL y sus parámetros dentro).
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(REPOSITORIES.Categorias, 'list').mockRejectedValue(
      new Error('Failed query: select ... params: secreto'),
    )

    // Act
    const resultado = await listEntity('Categorias', {})

    // Assert: nada del detalle cruza la frontera, pero sí queda registrado.
    expect(resultado).toEqual({ ok: false, error: 'Se ha producido un error inesperado' })
    expect(JSON.stringify(resultado)).not.toContain('secreto')
    expect(log).toHaveBeenCalled()
  })

  test('borrar dos veces: la segunda es "No encontrado"', async () => {
    const creada = await createEntity('Categorias', categoria)
    const id = creada.ok ? creada.data.id : ''

    expect((await deleteEntity('Categorias', id)).ok).toBe(true)
    expect(await deleteEntity('Categorias', id)).toEqual({ ok: false, error: 'No encontrado' })
  })
})

describe('el mapa de recursos es cerrado, también frente al prototipo', () => {
  // `REPOSITORIES['constructor']` existe en cualquier objeto: es la función
  // Object. Si el dispatcher mirase `resource in REPOSITORIES` o el valor a
  // secas, estos nombres llegarían a ejecutarse.
  test.each(['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'])(
    '«%s» no es un recurso',
    async (resource) => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(await listEntity(resource, {})).toEqual({
        ok: false,
        error: 'Se ha producido un error inesperado',
      })
      expect(await createEntity(resource, categoria)).toMatchObject({ ok: false })
    },
  )
})

describe('Movimientos por el dispatcher', () => {
  test('alta con la categoría propia, listado del usuario y signo puesto por el servidor', async () => {
    await seedCategoria(base().db, 'super', USER_A, { kind: 'expense' })

    const creado = await createEntity('Movimientos', {
      categoriaId: 'super',
      importe: 4590,
      sentido: 'expense',
      fecha: '2026-03-15',
      descripcion: 'Compra',
      notas: '',
      userId: USER_B, // ignorado: el dueño sale de la sesión
    })
    expect(creado.ok).toBe(true)

    const [fila] = await base().db.select().from(transactions)
    expect(fila).toMatchObject({ userId: USER_A, amount: -4590 })
  })

  test('un userId en el payload de una EDICIÓN tampoco cambia el dueño', async () => {
    const creada = await createEntity('Categorias', { ...categoria, tipo: 'expense', presupuesto: 100 })
    const id = creada.ok ? creada.data.id : ''

    await updateEntity('Categorias', id, {
      nombre: 'Otra',
      icono: '',
      color: '',
      presupuesto: 200,
      userId: USER_B,
    })

    const [fila] = await base().db.select().from(categories)
    expect(fila).toMatchObject({ name: 'Otra', userId: USER_A })
  })
})

describe('revalidación', () => {
  test('solo se revalida cuando la mutación ha tenido éxito', async () => {
    const { revalidatePath } = await import('next/cache')
    vi.mocked(revalidatePath).mockClear()

    await createEntity('Categorias', { ...categoria, nombre: '' })
    expect(revalidatePath).not.toHaveBeenCalled()

    await createEntity('Categorias', categoria)
    expect(revalidatePath).toHaveBeenCalledWith('/Categorias')
  })
})

describe('operaciones fuera del CRUD', () => {
  test.each([
    ['activarCategoria', () => activarCategoria('x', 500)],
    ['ocultarCategoria', () => ocultarCategoria('x')],
    ['getSaldo', () => getSaldo()],
    ['fetchFormMetadata', () => fetchFormMetadata('Movimientos')],
    ['fetchCatalogos', () => fetchCatalogos()],
  ])('%s exige sesión', async (_nombre, llamar) => {
    harness.userId = null
    expect(await llamar()).toEqual({ ok: false, error: 'No autorizado' })
  })

  test('no se puede activar ni ocultar la categoría de otro', async () => {
    await seedCategoria(base().db, 'ajena', USER_B, { hidden: true, monthlyBudget: 100 })

    expect(await activarCategoria('ajena', 500)).toMatchObject({ ok: false, error: 'No encontrado' })
    expect(await ocultarCategoria('ajena')).toMatchObject({ ok: false, error: 'No encontrado' })

    const [fila] = await base().db.select().from(categories)
    expect(fila).toMatchObject({ hidden: true, monthlyBudget: 100 })
  })

  test('getSaldo y fetchCatalogos son del usuario de la sesión', async () => {
    await seedCategoria(base().db, 'mia', USER_A, { kind: 'income' })
    await seedCategoria(base().db, 'ajena', USER_B, { kind: 'income' })
    await seedMovimiento(base().db, 'mio', USER_A, { categoryId: 'mia', amount: 1000 })
    await seedMovimiento(base().db, 'ajeno', USER_B, { categoryId: 'ajena', amount: 5000 })

    expect(await getSaldo()).toEqual({ ok: true, data: 1000 })
    const catalogos = await fetchCatalogos()
    expect(catalogos.ok && catalogos.data.categorias.map((c) => c.id)).toEqual(['mia'])
  })

  test('la metadata de un formulario trae sus enumeraciones', async () => {
    expect(await fetchFormMetadata('Movimientos')).toEqual({
      ok: true,
      data: {
        readOnlyFields: [],
        enumFields: {
          sentido: [
            { key: 'expense', label: 'Gasto' },
            { key: 'income', label: 'Ingreso' },
          ],
        },
      },
    })
  })
})
