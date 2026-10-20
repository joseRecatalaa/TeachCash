/**
 * Las cuotas por usuario, con topes de juguete.
 *
 * Las de verdad son 1.000 y 50.000 movimientos: llenarlas en cada ejecución
 * tarda decenas de segundos. Lo que se prueba es la REGLA (invitado < cuenta,
 * y ninguno pasa de la suya), así que aquí los topes se bajan con un mock del
 * fichero de constantes. Los valores reales los vigila
 * `movimientos.repository.test.ts` con la cuota de invitado completa.
 */

import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/src/types/limites.types', async (original) => ({
  ...(await original<typeof import('@/src/types/limites.types')>()),
  MAX_MOVIMIENTOS_INVITADO: 2,
  MAX_MOVIMIENTOS_CUENTA: 4,
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

const movimiento = (categoriaId: string) => ({
  categoriaId,
  importe: 100,
  sentido: 'expense',
  fecha: '2026-03-15',
  descripcion: 'Café',
  notas: '',
})

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
