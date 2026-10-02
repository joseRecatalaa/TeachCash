/**
 * Aplica las migraciones pendientes.  `pnpm db:migrate`
 *
 * Se ejecuta con `node db/migrate.mts` (Node 24 hace type stripping). La
 * extensión .mts, y no .ts, evita el aviso de Node sobre el tipo de módulo sin
 * tener que declarar "type": "module" en package.json y arrastrar a Next con ello.
 * Los imports relativos llevan extensión explícita porque los resuelve Node, no
 * el bundler.
 *
 * Usa DATABASE_URL_MIGRATIONS (Session pooler, puerto 5432) y no la de la app:
 * el migrador abre una transacción larga y crea su propio esquema `drizzle`, y
 * eso necesita una conexión que sea suya de principio a fin. El Transaction
 * pooler se la cambiaría a mitad.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDbClient, urlObligatoria } from './client.ts'

const url = urlObligatoria('DATABASE_URL_MIGRATIONS')
const client = createDbClient(url)

await migrate(drizzle(client), { migrationsFolder: './db/migrations' })

await client.end()

console.log(`Migraciones aplicadas sobre ${new URL(url).host}`)
