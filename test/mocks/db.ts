/**
 * Sustituto de `@/db`: el mismo esquema, pero `db` es la base desechable del
 * test (PGlite). Es un getter y no un valor porque la base cambia en cada
 * `beforeEach` y el módulo se evalúa una sola vez.
 */

import * as schema from '@/db/schema'
import { harness } from '../harness'

export function dbMock() {
  return {
    ...schema,
    get db() {
      return harness.db
    },
  }
}
