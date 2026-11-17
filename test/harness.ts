/**
 * Estado compartido entre un fichero de test y sus mocks.
 *
 * Los tests de repositorio y de acciones sustituyen dos cosas, y solo dos: de
 * DÓNDE sale la conexión (`@/db`) y QUIÉN es el usuario de la sesión
 * (`@/lib/auth`). Las fábricas de `test/mocks/` leen de aquí, y el test escribe
 * aquí en su `beforeEach`.
 *
 * Cada fichero de test tiene su propio grafo de módulos, así que este objeto no
 * se comparte ENTRE ficheros: no hay estado que se filtre de un test a otro.
 *
 * Uso:
 *
 *   vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
 *   vi.mock('@/lib/auth', async () => (await import('@/test/mocks/auth')).authMock())
 *
 *   const ctx = usarBaseDeTest()   // base nueva por test, sesión de USER_A
 */

import { afterEach, beforeEach } from 'vitest'
import type { Database } from '@/db/client'
import { createTestDb, USER_A, type TestDb } from '@/db/testing'

export const harness = {
  db: null as unknown as Database,
  /** El `sub` del JWT verificado. `null` = sin sesión. */
  userId: USER_A as string | null,
}

/**
 * Base nueva y vacía por test, enganchada al mock de `@/db`, y la sesión
 * reiniciada a USER_A. Devuelve un getter porque la base cambia en cada test.
 */
export function usarBaseDeTest(): () => TestDb {
  let ctx: TestDb

  beforeEach(async () => {
    ctx = await createTestDb()
    harness.db = ctx.db
    harness.userId = USER_A
  })

  afterEach(() => ctx.close())

  return () => ctx
}
