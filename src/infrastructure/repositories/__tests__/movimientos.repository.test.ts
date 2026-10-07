/**
 * Repositorio de Movimientos.
 *
 * Es el fichero de test más importante del proyecto: aquí viven el signo del
 * importe, el aislamiento por usuario y el borrado físico. Un fallo en
 * cualquiera de los tres es dinero mal contado, no una molestia de interfaz.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())

import { usarBaseDeTest } from '@/test/harness'
import { transactions } from '@/db/schema'
import { movimientosRepository as repo } from '../movimientos.repository'
import { getSaldoActual } from '../informes.repository'
import { crearUsuario } from '@/db/testing'
import {
  FILAS_SIN_PAGINAR_MAXIMO,
  IMPORTE_MAXIMO,
  MAX_MOVIMIENTOS_INVITADO,
} from '@/src/types/limites.types'
import { RepositoryError } from '../types'
import { esperarErrorDeCampo, seedCategoria, seedMovimiento, USER_A, USER_B } from './helpers'

const base = usarBaseDeTest()

const CAT_GASTO = 'cat-gasto'
const CAT_INGRESO = 'cat-ingreso'

beforeEach(async () => {
  await seedCategoria(base().db, CAT_GASTO, USER_A, { kind: 'expense' })
  await seedCategoria(base().db, CAT_INGRESO, USER_A, { kind: 'income' })
})

const nuevo = (overrides: Record<string, unknown> = {}) => ({
  categoriaId: CAT_GASTO,
  importe: 4590,
  sentido: 'expense',
  fecha: '2026-03-15',
  descripcion: 'Compra semanal',
  notas: '',
  ...overrides,
})

const filaDe = async (id: string) =>
  (await base().db.select().from(transactions).where(eq(transactions.id, id)))[0]

describe('create', () => {
  test('un gasto se guarda con importe negativo', async () => {
    const { id } = await repo.create(USER_A, nuevo({ sentido: 'expense', importe: 4590 }))
    // El formulario recibe 4590 sin signo; la base guarda -4590. Esa traducción
    // es del repositorio, y es lo que evita pedirle a nadie que teclee "-45,90".
    expect((await filaDe(id)).amount).toBe(-4590)
  })

  test('un ingreso se guarda con importe positivo', async () => {
    const { id } = await repo.create(
      USER_A,
      nuevo({ sentido: 'income', categoriaId: CAT_INGRESO, importe: 200000 }),
    )
    expect((await filaDe(id)).amount).toBe(200000)
  })

  test('el get devuelve magnitud y sentido, no el signo', async () => {
    const { id } = await repo.create(USER_A, nuevo({ sentido: 'expense', importe: 4590 }))
    const dto = await repo.get(USER_A, id)

    expect(dto).toMatchObject({ importe: 4590, sentido: 'expense' })
  })

  test('rechaza un importe de cero', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ importe: 0 })), 'importe')
  })

  test('rechaza un importe negativo (el signo lo pone el sentido)', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ importe: -100 })), 'importe')
  })

  test('rechaza un importe con decimales', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ importe: 45.9 })), 'importe')
  })

  test('rechaza una fecha que no existe', async () => {
    // 2026 no es bisiesto: el 29 de febrero no existe.
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ fecha: '2026-02-29' })), 'fecha')
  })

  test('rechaza una fecha con hora', async () => {
    await esperarErrorDeCampo(
      repo.create(USER_A, nuevo({ fecha: '2026-03-15T10:00:00Z' })),
      'fecha',
    )
  })

  test('rechaza una categoría de ingresos en un gasto', async () => {
    await seedCategoria(base().db, 'nomina', USER_A, { kind: 'income' })
    const error = await esperarErrorDeCampo(
      repo.create(USER_A, nuevo({ sentido: 'expense', categoriaId: 'nomina' })),
      'categoriaId',
    )
    expect(error.message).toMatch(/categoría/i)
  })

  test('rechaza un movimiento sin categoría', async () => {
    // No existe el movimiento sin clasificar: la categoría es obligatoria.
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ categoriaId: '' })), 'categoriaId')
  })

  test('la clave de idempotencia evita el duplicado por doble clic', async () => {
    const primero = await repo.create(USER_A, nuevo({ idempotencyKey: 'k1' }))
    const segundo = await repo.create(USER_A, nuevo({ idempotencyKey: 'k1' }))

    // El segundo envío devuelve el movimiento que ya existe, no crea otro:
    // para quien llama es un éxito, y lo es — su movimiento está guardado.
    expect(segundo.id).toBe(primero.id)

    const { total } = await repo.list(USER_A, { paginate: false })
    expect(total).toBe(1)
  })
})

describe('autorización', () => {
  test('no se puede usar la categoría de otro usuario', async () => {
    await seedCategoria(base().db, 'ajena', USER_B, { kind: 'expense' })
    await expect(repo.create(USER_A, nuevo({ categoriaId: 'ajena' }))).rejects.toThrow(
      'No encontrado',
    )
  })

  test('no se puede editar el movimiento de otro usuario', async () => {
    await seedMovimiento(base().db, 'ajeno', USER_B, { amount: -100 })

    await expect(repo.update(USER_A, 'ajeno', nuevo())).rejects.toThrow('No encontrado')
    expect((await filaDe('ajeno')).amount).toBe(-100)
  })

  test('no se puede borrar el movimiento de otro usuario', async () => {
    await seedMovimiento(base().db, 'ajeno', USER_B)

    await expect(repo.remove(USER_A, 'ajeno')).rejects.toThrow('No encontrado')
    expect(await filaDe('ajeno')).toMatchObject({ id: 'ajeno', userId: USER_B })
  })

  test('los listados no cruzan usuarios', async () => {
    await seedMovimiento(base().db, 'mio', USER_A)
    await seedMovimiento(base().db, 'ajeno', USER_B)

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data.map((m) => m.id)).toEqual(['mio'])
  })
})

describe('borrado físico', () => {
  test('desaparece del listado y de la tabla, sin papelera', async () => {
    const { id } = await repo.create(USER_A, nuevo())
    await repo.remove(USER_A, id)

    const restantes = await repo.list(USER_A, { paginate: false })
    expect(restantes.total).toBe(0)

    // Sin fila que recuperar: el borrado es permanente y el modal de
    // confirmación de la interfaz es la única red.
    expect(await filaDe(id)).toBeUndefined()
  })

  test('un movimiento borrado no cuenta en el saldo', async () => {
    const { id } = await repo.create(USER_A, nuevo({ importe: 10000 }))
    await repo.remove(USER_A, id)

    // El saldo es una SUMA de los movimientos que quedan (regla dura 7): uno
    // borrado ya no puede seguir contando.
    expect(await getSaldoActual(USER_A)).toBe(0)
  })
})

describe('listado', () => {
  test('ordena por fecha descendente', async () => {
    await seedMovimiento(base().db, 'a', USER_A, { date: '2026-03-01' })
    await seedMovimiento(base().db, 'b', USER_A, { date: '2026-03-20' })
    await seedMovimiento(base().db, 'c', USER_A, { date: '2026-03-10' })

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data.map((m) => m.id)).toEqual(['b', 'c', 'a'])
  })

  test('en el mismo día desempata por id, y la paginación no repite ni salta filas', async () => {
    // Sin desempate, el orden entre filas del mismo día lo decide Postgres y
    // puede cambiar entre la página 1 y la 2: una fila sale dos veces y otra
    // ninguna.
    for (const id of ['m3', 'm1', 'm4', 'm2']) {
      await seedMovimiento(base().db, id, USER_A, { date: '2026-03-15' })
    }

    const p1 = await repo.list(USER_A, { page: 1, pageSize: 2 })
    const p2 = await repo.list(USER_A, { page: 2, pageSize: 2 })

    expect([...p1.data, ...p2.data].map((m) => m.id)).toEqual(['m4', 'm3', 'm2', 'm1'])
  })

  test('el total no lo recorta la paginación', async () => {
    for (let i = 0; i < 25; i++) {
      await seedMovimiento(base().db, `m${i}`, USER_A, { date: '2026-03-01' })
    }

    const { data, total } = await repo.list(USER_A, { page: 1, pageSize: 10 })
    expect(data).toHaveLength(10)
    // El pie de la tabla necesita el total real, no el de la página.
    expect(total).toBe(25)
  })

  test('filtra por rango de fechas, extremos incluidos', async () => {
    await seedMovimiento(base().db, 'antes', USER_A, { date: '2026-02-28' })
    await seedMovimiento(base().db, 'primero', USER_A, { date: '2026-03-01' })
    await seedMovimiento(base().db, 'ultimo', USER_A, { date: '2026-03-31' })
    await seedMovimiento(base().db, 'despues', USER_A, { date: '2026-04-01' })

    const { data } = await repo.list(USER_A, {
      paginate: false,
      filters: { desde: '2026-03-01', hasta: '2026-03-31' },
    })

    expect(data.map((m) => m.id).sort()).toEqual(['primero', 'ultimo'])
  })

  test('la búsqueda mira la descripción', async () => {
    await seedMovimiento(base().db, 'a', USER_A, { description: 'Mercadona' })
    await seedMovimiento(base().db, 'b', USER_A, { description: 'Gasolina' })

    const { data } = await repo.list(USER_A, { paginate: false, search: 'merca' })
    expect(data.map((m) => m.id)).toEqual(['a'])
  })
})

describe('edición', () => {
  test('cambia todos los campos y recalcula el signo', async () => {
    // Arrange: un gasto de 45,90 €.
    const { id } = await repo.create(USER_A, nuevo())

    // Act: pasa a ser un ingreso de 1.200 € en otra fecha.
    await repo.update(
      USER_A,
      id,
      nuevo({
        sentido: 'income',
        categoriaId: CAT_INGRESO,
        importe: 120000,
        fecha: '2026-04-01',
        descripcion: '  Nómina  ',
        notas: 'Abril',
      }),
    )

    // Assert: en la base, con signo positivo y el texto recortado.
    expect(await filaDe(id)).toMatchObject({
      amount: 120000,
      categoryId: CAT_INGRESO,
      date: '2026-04-01',
      description: 'Nómina',
      notes: 'Abril',
    })
    expect(await getSaldoActual(USER_A)).toBe(120000)
  })

  test('al cambiar el sentido, la categoría tiene que acompañar', async () => {
    const { id } = await repo.create(USER_A, nuevo())

    await esperarErrorDeCampo(
      repo.update(USER_A, id, nuevo({ sentido: 'income', categoriaId: CAT_GASTO })),
      'categoriaId',
    )
    expect((await filaDe(id)).amount).toBe(-4590)
  })

  test('no se puede mover un movimiento propio a una categoría ajena', async () => {
    const { id } = await repo.create(USER_A, nuevo())
    await seedCategoria(base().db, 'ajena', USER_B, { kind: 'expense' })

    await esperarErrorDeCampo(repo.update(USER_A, id, nuevo({ categoriaId: 'ajena' })), 'categoriaId')
    expect((await filaDe(id)).categoryId).toBe(CAT_GASTO)
  })

  test('las mismas reglas que el alta: nada de importes con decimales', async () => {
    const { id } = await repo.create(USER_A, nuevo())
    await esperarErrorDeCampo(repo.update(USER_A, id, nuevo({ importe: 10.5 })), 'importe')
  })
})

describe('"no existe" y "no es tuyo" son indistinguibles', () => {
  // Si los mensajes difirieran, cualquiera podría sondear ids ajenos: "no es
  // tuyo" confirma que el id existe. Las tres operaciones por id, los dos casos.
  test('get, update y remove responden igual a un id ajeno que a uno inventado', async () => {
    await seedMovimiento(base().db, 'ajeno', USER_B)

    for (const id of ['ajeno', 'no-existe']) {
      expect(await repo.get(USER_A, id)).toBeNull()
      await expect(repo.update(USER_A, id, nuevo())).rejects.toThrow(/^No encontrado$/)
      await expect(repo.remove(USER_A, id)).rejects.toThrow(/^No encontrado$/)
    }
  })
})

describe('límites de los campos', () => {
  test('descripción obligatoria, recortada y de 200 caracteres como mucho', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ descripcion: '   ' })), 'descripcion')
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ descripcion: 'x'.repeat(201) })), 'descripcion')
    await expect(repo.create(USER_A, nuevo({ descripcion: 'x'.repeat(200) }))).resolves.toEqual({
      id: expect.any(String),
    })
  })

  test('notas de 1000 caracteres como mucho; vacías se guardan como null', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ notas: 'x'.repeat(1001) })), 'notas')
    const { id } = await repo.create(USER_A, nuevo({ notas: '   ' }))
    expect((await filaDe(id)).notes).toBeNull()
  })

  test('un sentido que no es ingreso ni gasto se rechaza', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ sentido: 'transfer' })), 'sentido')
  })
})

describe('idempotencia entre usuarios', () => {
  test('la misma clave en dos usuarios crea dos movimientos', async () => {
    // La clave la genera el cliente: dos personas pueden coincidir. La de A no
    // puede devolverle a B el movimiento de A.
    await seedCategoria(base().db, 'gasto-b', USER_B, { kind: 'expense' })
    const deA = await repo.create(USER_A, nuevo({ idempotencyKey: 'k1' }))
    const deB = await repo.create(USER_B, nuevo({ idempotencyKey: 'k1', categoriaId: 'gasto-b' }))

    expect(deB.id).not.toBe(deA.id)
    expect((await filaDe(deB.id)).userId).toBe(USER_B)
  })
})

describe('listado: filtros y orden', () => {
  test('filtra por categoría', async () => {
    await seedMovimiento(base().db, 'super', USER_A, { categoryId: CAT_GASTO })
    await seedMovimiento(base().db, 'nomina', USER_A, { categoryId: CAT_INGRESO, amount: 5000 })

    const { data } = await repo.list(USER_A, { paginate: false, filters: { categoriaId: CAT_INGRESO } })
    expect(data.map((m) => m.id)).toEqual(['nomina'])
  })

  test('ordena por importe con signo, ascendente', async () => {
    await seedMovimiento(base().db, 'gasto-grande', USER_A, { amount: -9000 })
    await seedMovimiento(base().db, 'ingreso', USER_A, { amount: 5000 })
    await seedMovimiento(base().db, 'gasto-chico', USER_A, { amount: -100 })

    const { data } = await repo.list(USER_A, { paginate: false, sortBy: 'importe', sortDir: 'asc' })
    expect(data.map((m) => m.id)).toEqual(['gasto-grande', 'gasto-chico', 'ingreso'])
  })

  test('el listado trae el nombre y el color de la categoría', async () => {
    await seedCategoria(base().db, 'ocio', USER_A, { name: 'Ocio', color: 'cat-4' })
    await seedMovimiento(base().db, 'cine', USER_A, { categoryId: 'ocio' })

    const { data } = await repo.list(USER_A, { paginate: false })
    expect(data[0]).toMatchObject({ categoriaNombre: 'Ocio', categoriaColor: 'cat-4' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Seguridad: lo que llega es hostil hasta que se demuestra lo contrario
// ─────────────────────────────────────────────────────────────────────────────

describe('topes de entrada', () => {
  test('rechaza un importe que no cabe en la columna, como error del campo', async () => {
    // Sin el tope, llega a Postgres como «integer out of range» y vuelve como
    // un error genérico que no dice qué corregir.
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ importe: IMPORTE_MAXIMO + 1 })), 'importe')
  })

  test('acepta el importe máximo exacto', async () => {
    const { id } = await repo.create(USER_A, nuevo({ importe: IMPORTE_MAXIMO }))
    expect((await filaDe(id)).amount).toBe(-IMPORTE_MAXIMO)
  })

  test('rechaza un id de categoría desmesurado sin consultar nada', async () => {
    await esperarErrorDeCampo(
      repo.create(USER_A, nuevo({ categoriaId: 'x'.repeat(65) })),
      'categoriaId',
    )
  })
})

describe('fechas futuras', () => {
  // 12:00 UTC del 7 de octubre: en Madrid es día 7 y en Kiritimati (UTC+14),
  // la zona más adelantada del planeta, ya es día 8.
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-07T12:00:00Z'), toFake: ['Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  test('rechaza una fecha posterior al "hoy" de cualquier parte del mundo', async () => {
    await esperarErrorDeCampo(repo.create(USER_A, nuevo({ fecha: '2026-10-09' })), 'fecha')
  })

  test('acepta el "hoy" de la zona más adelantada, para no rechazar el de nadie', async () => {
    const { id } = await repo.create(USER_A, nuevo({ fecha: '2026-10-08' }))
    expect((await filaDe(id)).date).toBe('2026-10-08')
  })

  test('tampoco se puede mover un movimiento al futuro al editarlo', async () => {
    const { id } = await repo.create(USER_A, nuevo({ fecha: '2026-10-01' }))
    await esperarErrorDeCampo(repo.update(USER_A, id, nuevo({ fecha: '2027-01-01' })), 'fecha')
    expect((await filaDe(id)).date).toBe('2026-10-01')
  })
})

describe('listado: lo que manda el cliente no llega al SQL tal cual', () => {
  test('un sortBy heredado del prototipo ("constructor") ordena por defecto', async () => {
    // `SORTABLE['constructor']` es la función Object: sin `Object.hasOwn` se
    // colaba como columna de orden y la consulta reventaba.
    await seedMovimiento(base().db, 'viejo', USER_A, { date: '2026-01-01' })
    await seedMovimiento(base().db, 'nuevo', USER_A, { date: '2026-02-01' })

    const { data } = await repo.list(USER_A, { sortBy: 'constructor' })
    expect(data.map((m) => m.id)).toEqual(['nuevo', 'viejo'])
  })

  test('buscar "%" encuentra el carácter, no "cualquier cosa"', async () => {
    await seedMovimiento(base().db, 'con', USER_A, { description: 'Descuento 10% súper' })
    await seedMovimiento(base().db, 'sin', USER_A, { description: 'Gasolina' })

    const { data } = await repo.list(USER_A, { paginate: false, search: '%' })
    expect(data.map((m) => m.id)).toEqual(['con'])
  })

  test('"_" y "\\" también son literales', async () => {
    await seedMovimiento(base().db, 'guion', USER_A, { description: 'pago_luz' })
    // La barra invertida es el carácter de escape de LIKE en Postgres.
    const BARRA = String.fromCharCode(92)
    await seedMovimiento(base().db, 'barra', USER_A, { description: `ruta${BARRA}caja` })
    await seedMovimiento(base().db, 'otro', USER_A, { description: 'pagoXluz' })

    const guion = await repo.list(USER_A, { paginate: false, search: 'pago_luz' })
    expect(guion.data.map((m) => m.id)).toEqual(['guion'])
    const barra = await repo.list(USER_A, { paginate: false, search: BARRA })
    expect(barra.data.map((m) => m.id)).toEqual(['barra'])
  })

  test('sin paginar, devuelve como mucho FILAS_SIN_PAGINAR_MAXIMO filas', async () => {
    await seedMovimiento(base().db, 'semilla', USER_A)
    const [{ categoryId }] = await base().db.select().from(transactions)
    await base().db.insert(transactions).values(
      Array.from({ length: FILAS_SIN_PAGINAR_MAXIMO + 5 }, (_, i) => ({
        userId: USER_A,
        categoryId,
        amount: -1,
        date: '2026-03-15',
        description: `m${i}`,
      })),
    )

    const { data, total } = await repo.list(USER_A, { paginate: false })
    expect(data).toHaveLength(FILAS_SIN_PAGINAR_MAXIMO)
    // El total sigue siendo el real: la tabla puede avisar de que hay más.
    expect(total).toBe(FILAS_SIN_PAGINAR_MAXIMO + 6)
  })
})

describe('idempotencia ante una carrera', () => {
  test('dos envíos simultáneos con la misma clave dan el MISMO movimiento', async () => {
    // Los dos pasan la comprobación previa antes de que ninguno inserte; el
    // segundo choca con el UNIQUE. Eso no es un error: su movimiento está
    // guardado, así que se devuelve el id del primero.
    const payload = nuevo({ idempotencyKey: 'form-carrera' })
    const [a, b] = await Promise.all([repo.create(USER_A, payload), repo.create(USER_A, payload)])

    expect(a.id).toBe(b.id)
    const filas = await base().db.select().from(transactions)
    expect(filas).toHaveLength(1)
  })
})

describe('cuota de movimientos', () => {
  const INVITADO = '00000000-0000-4000-8000-0000000000c1'

  const llenar = async (userId: string, cuantos: number) => {
    const categoryId = await seedCategoria(base().db, `cat-${userId}`, userId, { kind: 'expense' })
    await base().db.insert(transactions).values(
      Array.from({ length: cuantos }, (_, i) => ({
        userId,
        categoryId,
        amount: -1,
        date: '2026-03-15',
        description: `m${i}`,
      })),
    )
    return categoryId
  }

  test('un invitado no pasa de su cuota, con un mensaje que explica qué hacer', async () => {
    await crearUsuario(base().pg, INVITADO, { anonimo: true })
    const categoriaId = await llenar(INVITADO, MAX_MOVIMIENTOS_INVITADO)

    const error = await repo.create(INVITADO, nuevo({ categoriaId })).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RepositoryError)
    expect((error as RepositoryError).message).toMatch(/crea una cuenta/i)
    const [{ n }] = await base()
      .pg.query<{ n: string }>('select count(*) as n from transactions where user_id = $1', [INVITADO])
      .then((r) => r.rows)
    expect(Number(n)).toBe(MAX_MOVIMIENTOS_INVITADO)
  })

  test('una cuenta con email tiene una cuota mayor que la del invitado', async () => {
    const categoriaId = await llenar(USER_A, MAX_MOVIMIENTOS_INVITADO)
    const { id } = await repo.create(USER_A, nuevo({ categoriaId }))
    expect(await filaDe(id)).toBeDefined()
  })
})
