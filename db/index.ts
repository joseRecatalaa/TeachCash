/**
 * La conexión compartida de la aplicación.
 *
 * Todo el código de la app importa `db` de aquí. Los tests NO: construyen la
 * suya en memoria con `db/testing.ts`.
 */

import { createDb, createDbClient, type Database } from './client.ts'

// En desarrollo, cada recarga en caliente vuelve a evaluar este módulo y dejaría
// una conexión más abierta sobre el fichero. Se cachea en globalThis.
const globalForDb = globalThis as unknown as { __financeDb?: Database }

export const db: Database = globalForDb.__financeDb ?? createDb(createDbClient())

if (process.env.NODE_ENV !== 'production') globalForDb.__financeDb = db

export { DATABASE_PATH, createDb, createDbClient, type Database } from './client.ts'
export * from './schema.ts'
