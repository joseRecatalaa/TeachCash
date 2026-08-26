/**
 * El dispatcher genérico de Server Actions.
 *
 * Estos tests existen por una razón concreta: `entity.actions.ts` expone
 * endpoints POST públicos que aceptan un `resource` y unos `values` sin tipar.
 * Es un diseño que solo se sostiene por cuatro invariantes, y son exactamente
 * las que se comprueban aquí. Si alguna cae, cae la regla dura 3.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const h = vi.hoisted(() => ({
  db: null as unknown as import('@/db/client').Database,
  userId: 'user-a' as string | null,
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))

vi.mock('@/lib/auth', () => ({
  LOCAL_USER_ID: 'user-a',
  getSession: async () => (h.userId ? { user: { id: h.userId } } : null),
  requireUserId: async () => {
    if (!h.userId) throw new Error('No autorizado')
    return h.userId
  },
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
import { accounts } from '@/db/schema'
import {
  createEntity,
  deleteEntity,
  getEntity,
  listEntity,
  updateEntity,
} from '../entity.actions'
import { seedCuenta, USER_A, USER_B } from '@/src/infrastructure/repositories/__tests__/helpers'

let ctx: TestDb

beforeEach(async () => {
  ctx = await createTestDb()
  h.db = ctx.db
  h.userId = USER_A
})

afterEach(() => ctx.close())

const cuenta = { nombre: 'Nómina', tipo: 'checking', divisa: 'EUR', saldoInicial: 0 }

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
    ['listEntity', () => listEntity('Cuentas', {})],
    ['getEntity', () => getEntity('Cuentas', 'x')],
    ['createEntity', () => createEntity('Cuentas', cuenta)],
    ['updateEntity', () => updateEntity('Cuentas', 'x', cuenta)],
    ['deleteEntity', () => deleteEntity('Cuentas', 'x')],
  ])('%s sin sesión no hace nada', async (_nombre, ejecutar) => {
    h.userId = null

    const resultado = await ejecutar()
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error).toBe('No autorizado')

    const filas = await ctx.db.select().from(accounts)
    expect(filas).toHaveLength(0)
  })
})

describe('el userId sale de la sesión, nunca de los argumentos', () => {
  test('un userId en los valores se ignora', async () => {
    const resultado = await createEntity('Cuentas', { ...cuenta, userId: USER_B })
    expect(resultado.ok).toBe(true)

    const filas = await ctx.db.select().from(accounts)
    expect(filas[0].userId).toBe(USER_A)
  })

  test('no se puede leer el registro de otro usuario', async () => {
    await seedCuenta(ctx.db, 'ajena', USER_B)

    const resultado = await getEntity('Cuentas', 'ajena')
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.error).toBe('No encontrado')
  })

  test('no se puede escribir sobre el registro de otro usuario', async () => {
    await seedCuenta(ctx.db, 'ajena', USER_B)

    const resultado = await updateEntity('Cuentas', 'ajena', {
      nombre: 'Secuestrada',
      tipo: 'checking',
      saldoInicial: 0,
    })
    expect(resultado.ok).toBe(false)

    const [fila] = await ctx.db.select().from(accounts)
    expect(fila.name).toBe('Cuenta ajena')
  })

  test('el listado solo devuelve lo del usuario de la sesión', async () => {
    await seedCuenta(ctx.db, 'mia', USER_A)
    await seedCuenta(ctx.db, 'ajena', USER_B)

    const resultado = await listEntity('Cuentas', { paginate: false })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.data.data).toHaveLength(1)
      expect(resultado.data.total).toBe(1)
    }
  })
})

describe('los valores no se esparcen sobre la tabla', () => {
  test('un campo que no está en el esquema se descarta', async () => {
    const resultado = await createEntity('Cuentas', {
      ...cuenta,
      // Ninguno de estos debe llegar a la fila: el repositorio escribe campo a
      // campo desde lo que devuelve Zod, no desde lo que llegó.
      archivedAt: new Date(),
      id: 'id-elegido-por-el-cliente',
    })
    expect(resultado.ok).toBe(true)

    const [fila] = await ctx.db.select().from(accounts)
    expect(fila.archivedAt).toBeNull()
    expect(fila.id).not.toBe('id-elegido-por-el-cliente')
  })

  test('los valores inválidos vuelven con su error por campo', async () => {
    const resultado = await createEntity('Cuentas', { ...cuenta, tipo: 'inventado' })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      // El error viaja como VALOR, no como excepción: una excepción llegaría al
      // navegador redactada en producción y el formulario no podría enseñarla.
      expect(resultado.fieldErrors).toMatchObject({ tipo: expect.any(String) })
    }
  })
})

describe('errores', () => {
  test('un error de negocio conserva su mensaje', async () => {
    const creada = await createEntity('Cuentas', cuenta)
    expect(creada.ok).toBe(true)

    // Borrar una cuenta sin movimientos sí funciona; el mensaje de negocio se
    // comprueba en el test del repositorio. Aquí lo que importa es que el texto
    // llega intacto hasta el borde.
    const id = creada.ok ? creada.data.id : ''
    const borrada = await deleteEntity('Cuentas', id)
    expect(borrada.ok).toBe(true)

    const otraVez = await deleteEntity('Cuentas', id)
    expect(otraVez.ok).toBe(false)
    if (!otraVez.ok) expect(otraVez.error).toBe('No encontrado')
  })
})
