/**
 * Base de datos de test: SQLite real, con las migraciones reales aplicadas.
 *
 * Nada de mockear el ORM. Los bugs de agregación viven exactamente en el SQL que
 * un mock no llega a ejecutar. → skill `testing-finance`
 *
 * NO se usa ':memory:'. Con libsql, abrir una transacción sobre una base en
 * memoria estrena conexión, y cada conexión a ':memory:' es una base distinta:
 * las tablas desaparecen a mitad del test. Comprobado. Se usa un fichero
 * desechable por test, dentro de data/test/ (ignorado por git).
 */

import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb, createDbClient, type Database } from './client.ts'

const TEST_DB_DIR = './data/test'

/** Borra los ficheros de ejecuciones anteriores que Windows no dejó borrar en su día. */
const sweepStaleFiles = (keepPrefix: string): void => {
  try {
    for (const name of readdirSync(TEST_DB_DIR)) {
      if (name.startsWith(keepPrefix)) continue
      try {
        rmSync(join(TEST_DB_DIR, name), { force: true })
      } catch {
        // Otro test en paralelo lo tiene abierto. Se irá en la siguiente pasada.
      }
    }
  } catch {
    // El directorio aún no existe.
  }
}

export type TestDb = { db: Database; close: () => void }

export async function createTestDb(): Promise<TestDb> {
  mkdirSync(TEST_DB_DIR, { recursive: true })
  const id = crypto.randomUUID()
  sweepStaleFiles(id)

  const path = join(TEST_DB_DIR, `${id}.db`)
  const client = createDbClient(`file:${path}`)
  const db = createDb(client)
  await migrate(db, { migrationsFolder: './db/migrations' })

  return {
    db,
    close: () => {
      client.close()
      // En Windows el handle tarda en soltarse tras close(). Si falla, el fichero
      // lo barre la siguiente ejecución; no merece hacer fallar un test por esto.
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          rmSync(`${path}${suffix}`, { force: true })
        } catch {
          /* se limpia en la próxima pasada */
        }
      }
    },
  }
}
