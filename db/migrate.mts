/**
 * Aplica las migraciones pendientes.  `pnpm db:migrate`
 *
 * Se ejecuta con `node db/migrate.mts` (Node 24 hace type stripping). La
 * extensión .mts, y no .ts, evita el aviso de Node sobre el tipo de módulo sin
 * tener que declarar "type": "module" en package.json y arrastrar a Next con ello.
 * Los imports relativos llevan extensión explícita porque los resuelve Node, no
 * el bundler.
 */

import { migrate } from 'drizzle-orm/libsql/migrator'
import { createDb, createDbClient, DATABASE_PATH } from './client.ts'

const client = createDbClient()
const db = createDb(client)

await migrate(db, { migrationsFolder: './db/migrations' })

// WAL permite leer mientras se escribe. Es una propiedad persistente del
// fichero, así que se fija aquí una sola vez: hacerlo al abrir cada conexión
// exige un bloqueo exclusivo y revienta con varios procesos a la vez.
await client.execute('PRAGMA journal_mode = WAL')

client.close()

console.log(`Migraciones aplicadas sobre ${DATABASE_PATH}`)
