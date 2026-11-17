/**
 * Las cuotas por usuario, con topes de juguete.
 *
 * Las de verdad son 200 y 4.000 movimientos, y 100 KB y 5 MB de texto:
 * llenarlas en cada ejecución tarda. Lo que se prueba es la REGLA (invitado <
 * cuenta, ninguno pasa de la suya, ni siquiera con altas a la vez), así que
 * aquí los topes se bajan con un mock del fichero de constantes. Los valores
 * reales los vigila `movimientos.repository.test.ts` con la cuota de invitado
 * completa.
 */

import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/src/types/limites.types', async (original) => ({
  ...(await original<typeof import('@/src/types/limites.types')>()),
  MAX_MOVIMIENTOS_INVITADO: 2,
  MAX_MOVIMIENTOS_CUENTA: 4,
  MAX_TEXTO_INVITADO: 30,
  MAX_TEXTO_CUENTA: 300,
  MAX_CATEGORIAS: 3,
}))

import { crearUsuario } from '@/db/testing'
import { usarBaseDeTest } from '@/test/harness'
import { categoriasRepository } from '../categorias.repository'
import { movimientosRepository } from '../movimientos.repository'
import { RepositoryError } from '../types'
import { seedCategoria, USER_A } from './helpers'

const base = usarBaseDeTest()

const INVITADO = '00000000-0000-4000-8000-0000000000c1'

const movimiento = (categoriaId: string, descripcion = 'Café', notas = '') => ({
  categoriaId,
  importe: 100,
  sentido: 'expense',
  fecha: '2026-03-15',
  descripcion,
  notas,
})

const cuantos = async (userId: string) =>
  (await base().pg.query('select 1 from transactions where user_id = $1', [userId])).rows.length

/** Cuántos movimientos consigue crear `userId` antes del primer rechazo, y el rechazo. */
async function llenarHastaElTope(userId: string) {
  const categoriaId = await seedCategoria(base().db, `cat-${userId}`, userId, { kind: 'expense' })
  for (let creados = 0; ; creados++) {
    const error = await movimientosRepository
      .create(userId, movimiento(categoriaId))
      .then(() => null, (e: unknown) => e)
    if (error) return { creados, error }
  }
}

describe('cuota de movimientos', () => {
  test('un invitado se para en la suya, con un mensaje que le dice qué hacer', async () => {
    await crearUsuario(base().pg, INVITADO, { anonimo: true })
    const { creados, error } = await llenarHastaElTope(INVITADO)

    expect(creados).toBe(2)
    expect(error).toBeInstanceOf(RepositoryError)
    expect((error as RepositoryError).message).toMatch(/crea una cuenta/i)
  })

  test('una cuenta llega más lejos, y también se para en la suya', async () => {
    const { creados, error } = await llenarHastaElTope(USER_A)

    expect(creados).toBe(4)
    expect(error).toBeInstanceOf(RepositoryError)
    expect((error as RepositoryError).message).toContain('4 movimientos')
  })
})

describe('altas a la vez', () => {
  test('cinco altas simultáneas no pasan de la cuota: se ponen en fila', async () => {
    await crearUsuario(base().pg, INVITADO, { anonimo: true })
    const categoriaId = await seedCategoria(base().db, 'cat', INVITADO, { kind: 'expense' })

    await Promise.allSettled(
      Array.from({ length: 5 }, () => movimientosRepository.create(INVITADO, movimiento(categoriaId))),
    )

    expect(await cuantos(INVITADO)).toBe(2)
  })

  test('lo mismo con las categorías', async () => {
    const crear = (nombre: string) =>
      categoriasRepository.create(USER_A, { nombre, tipo: 'income', icono: '', color: '', presupuesto: null })
    await Promise.allSettled(['a', 'b', 'c', 'd', 'e'].map(crear))
    const { rows } = await base().pg.query('select 1 from categories where user_id = $1', [USER_A])
    expect(rows).toHaveLength(3)
  })
})

describe('cuota de texto', () => {
  // Cuenta BYTES (UTF-8) de descripción y notas: es lo que ocupa en la base, y
  // un emoji son 4. Contar caracteres dejaría pasar cuatro veces más.
  test('un invitado se para en la suya, con un mensaje que le dice qué hacer', async () => {
    await crearUsuario(base().pg, INVITADO, { anonimo: true })
    const categoriaId = await seedCategoria(base().db, 'cat', INVITADO, { kind: 'expense' })
    await movimientosRepository.create(INVITADO, movimiento(categoriaId, 'x'.repeat(20)))

    const error = await movimientosRepository
      .create(INVITADO, movimiento(categoriaId, 'y'.repeat(11)))
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RepositoryError)
    expect((error as RepositoryError).message).toMatch(/crea una cuenta/i)
    expect(await cuantos(INVITADO)).toBe(1)
  })

  test('cuenta bytes, no caracteres: 8 emojis son 32 bytes', async () => {
    await crearUsuario(base().pg, INVITADO, { anonimo: true })
    const categoriaId = await seedCategoria(base().db, 'cat', INVITADO, { kind: 'expense' })
    const error = await movimientosRepository
      .create(INVITADO, movimiento(categoriaId, '😀'.repeat(8)))
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(RepositoryError)
  })

  test('las notas cuentan igual que la descripción', async () => {
    const categoriaId = await seedCategoria(base().db, 'cat', USER_A, { kind: 'expense' })
    await movimientosRepository.create(USER_A, movimiento(categoriaId, 'a', 'n'.repeat(250)))
    const error = await movimientosRepository
      .create(USER_A, movimiento(categoriaId, 'b', 'n'.repeat(60)))
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(RepositoryError)
    expect((error as RepositoryError).message).toMatch(/texto/i)
  })

  test('editar no se cuenta a sí mismo dos veces, pero tampoco se salta la cuota', async () => {
    const categoriaId = await seedCategoria(base().db, 'cat', USER_A, { kind: 'expense' })
    const { id } = await movimientosRepository.create(USER_A, movimiento(categoriaId, 'a'.repeat(150)))
    await movimientosRepository.create(USER_A, movimiento(categoriaId, 'b'.repeat(100)))

    // 150 → 200: el total pasa de 250 a 300, justo en el tope.
    await movimientosRepository.update(USER_A, id, movimiento(categoriaId, 'c'.repeat(200)))
    // 200 → 201 ya no cabe.
    const error = await movimientosRepository
      .update(USER_A, id, movimiento(categoriaId, 'd'.repeat(200), 'e'))
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(RepositoryError)
  })

  test('editar a menos texto siempre se puede, aunque se esté por encima', async () => {
    const categoriaId = await seedCategoria(base().db, 'cat', USER_A, { kind: 'expense' })
    const { id } = await movimientosRepository.create(USER_A, movimiento(categoriaId, 'a'.repeat(200)))
    // Como si la cuota hubiera bajado después: 400 bytes guardados con un tope de 300.
    await base().pg.query("update transactions set notes = repeat('n', 200) where id = $1", [id])
    await expect(
      movimientosRepository.update(USER_A, id, movimiento(categoriaId, 'corto')),
    ).resolves.toEqual({ id })
  })
})

describe('cuota de categorías', () => {
  test('nadie pasa de la suya', async () => {
    const crear = (nombre: string) =>
      categoriasRepository.create(USER_A, {
        nombre,
        tipo: 'income',
        icono: '',
        color: '',
        presupuesto: null,
      })

    await crear('Una')
    await crear('Dos')
    await crear('Tres')
    const error = await crear('Cuatro').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(RepositoryError)
    expect((error as RepositoryError).message).toContain('3 categorías')
  })
})
