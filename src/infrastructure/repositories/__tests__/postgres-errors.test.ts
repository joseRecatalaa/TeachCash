/**
 * Reconocer un choque con una UNIQUE sin saber qué driver hay debajo.
 *
 * Los tests de repositorio ya lo recorren con PGlite (carreras de
 * idempotencia y de nombre), pero la app corre sobre postgres-js, que llama
 * distinto a la restricción. Esto fija las dos formas, para que un cambio que
 * solo funcione con una no pase en verde.
 */

import { describe, expect, test } from 'vitest'
import { esChoqueUnico, UNIQUE_VIOLATION } from '../postgres-errors'

const envuelto = (causa: object) => Object.assign(new Error('Failed query'), { cause: causa })

describe('esChoqueUnico', () => {
  test('postgres-js (la app): `constraint_name`, dentro del error de Drizzle', () => {
    const err = envuelto({ code: UNIQUE_VIOLATION, constraint_name: 'tx_idempotency_key' })
    expect(esChoqueUnico(err, 'tx_idempotency_key')).toBe(true)
  })

  test('PGlite (los tests): `constraint`', () => {
    const err = envuelto({ code: UNIQUE_VIOLATION, constraint: 'categories_user_name' })
    expect(esChoqueUnico(err, 'categories_user_name')).toBe(true)
  })

  test('otra restricción UNIQUE no cuenta', () => {
    const err = envuelto({ code: UNIQUE_VIOLATION, constraint_name: 'tx_import_hash' })
    expect(esChoqueUnico(err, 'tx_idempotency_key')).toBe(false)
  })

  test('otro código de error no cuenta aunque nombre la restricción', () => {
    const err = envuelto({ code: '23503', constraint_name: 'tx_idempotency_key' })
    expect(esChoqueUnico(err, 'tx_idempotency_key')).toBe(false)
  })

  test.each([null, undefined, 'texto', 42])('algo que no es un error (%j) no cuenta', (err) => {
    expect(esChoqueUnico(err, 'tx_idempotency_key')).toBe(false)
  })

  test('un `cause` circular no cuelga la búsqueda', () => {
    const a: { cause?: unknown } = {}
    a.cause = a
    expect(esChoqueUnico(a, 'tx_idempotency_key')).toBe(false)
  })
})
