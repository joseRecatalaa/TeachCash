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

import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb, createDbClient, type Database } from './client.ts'

const TEST_DB_DIR = './data/test'

/** Diez minutos: más de lo que dura cualquier test, menos que la siguiente sesión. */
const STALE_AFTER_MS = 10 * 60 * 1000

/**
 * Borra los restos que Windows no dejó borrar en su día.
 *
 * Solo toca ficheros con más de diez minutos. Vitest ejecuta cada fichero de
 * test en un worker distinto y a la vez: borrar "todo lo que no sea mío" hacía
 * que un worker le quitara la base de datos a otro a mitad de ejecución.
 */
const sweepStaleFiles = (): void => {
  const cutoff = Date.now() - STALE_AFTER_MS
  try {
    for (const name of readdirSync(TEST_DB_DIR)) {
      const full = join(TEST_DB_DIR, name)
      try {
        if (statSync(full).mtimeMs < cutoff) rmSync(full, { force: true })
      } catch {
        // Sigue abierto o ya no está. En cualquier caso, no es asunto de este test.
      }
    }
  } catch {
    // El directorio aún no existe.
  }
}

export type TestDb = { db: Database; close: () => void }

export async function createTestDb(): Promise<TestDb> {
  mkdirSync(TEST_DB_DIR, { recursive: true })
  sweepStaleFiles()

  const path = join(TEST_DB_DIR, `${crypto.randomUUID()}.db`)
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
