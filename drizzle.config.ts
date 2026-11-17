import type { Config } from 'drizzle-kit'

// drizzle-kit no lee .env.local por su cuenta. Si no existe, `generate` sigue
// funcionando: no necesita base para comparar el esquema con las migraciones.
try {
  process.loadEnvFile('.env.local')
} catch {
  /* sin .env.local: solo fallarán los comandos que se conectan */
}

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  // Session pooler: ver db/migrate.mts.
  dbCredentials: { url: process.env.DATABASE_URL_MIGRATIONS ?? '' },
  // Solo el esquema de la app. `auth`, `storage` y compañía son de Supabase.
  schemaFilter: ['public'],
  // Los roles (`authenticated`, `anon`) ya existen en Supabase: no se crean aquí.
  entities: { roles: { provider: 'supabase' } },
  // Las migraciones se revisan a mano y se commitean. Nunca `push` sobre datos reales.
  strict: true,
  verbose: true,
} satisfies Config
