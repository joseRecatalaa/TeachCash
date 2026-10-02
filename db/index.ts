/**
 * La conexión compartida de la aplicación.
 *
 * Todo el código de la app importa `db` de aquí. Los tests NO: construyen la
 * suya con `db/testing.ts`.
 *
 * `server-only` convierte en error de build lo que antes era una convención:
 * importar esto (o un repositorio) desde un componente cliente metería la
 * cadena de conexión en el bundle del navegador.
 */

import 'server-only'
import { createDb, createDbClient, type Database } from './client.ts'

// En desarrollo, cada recarga en caliente vuelve a evaluar este módulo y abriría
// un pool más contra Supabase. Se cachea en globalThis.
const globalForDb = globalThis as unknown as { __financeDb?: Database }

export const db: Database = globalForDb.__financeDb ?? createDb(createDbClient())

if (process.env.NODE_ENV !== 'production') globalForDb.__financeDb = db

export { createDb, createDbClient, type Database } from './client.ts'
export * from './schema.ts'
