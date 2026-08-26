import type { Config } from 'drizzle-kit'

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  // 'turso' es el dialecto que usa @libsql/client, el mismo driver de la app.
  // Con una url file: apunta al fichero local; no hay ningún servicio remoto.
  dialect: 'turso',
  dbCredentials: { url: `file:${process.env.DATABASE_PATH ?? './data/finanzas.db'}` },
  // Las migraciones se revisan a mano y se commitean. Nunca `push` sobre datos reales.
  strict: true,
  verbose: true,
} satisfies Config
