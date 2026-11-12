/**
 * Base de datos de test: Postgres REAL (PGlite, el mismo motor compilado a
 * WASM y ejecutado en proceso), con las migraciones reales aplicadas.
 *
 * Nada de mockear el ORM. Los bugs de agregación viven exactamente en el SQL que
 * un mock no llega a ejecutar. → skill `testing-finance`
 *
 * Es Postgres y no SQLite a propósito: los fallos que importan aquí son de
 * dialecto (`like` que distingue mayúsculas, `sum` que vuelve como texto) y
 * solo los caza el mismo motor que hay en Supabase.
 *
 * Supabase trae de serie el esquema `auth` (usuarios, `auth.uid()`) y los roles
 * `anon`/`authenticated`. Nuestras migraciones dependen de ellos —la clave ajena
 * de `user_id` y las políticas RLS—, así que aquí se crea un sustituto mínimo
 * ANTES de migrar. Si una migración nueva usa algo más de `auth`, se añade aquí.
 */

import { fileURLToPath } from 'node:url'
import { PGlite, types } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { Database } from './client.ts'
import * as schema from './schema.ts'

const AUTH_STUB = `
  create schema if not exists auth;
  create table auth.users (
    id uuid primary key,
    email varchar(255),
    is_anonymous boolean not null default false,
    created_at timestamptz not null default now()
  );
  -- Las sesiones abiertas: \`ejecutar\` comprueba que la del token sigue aquí.
  -- Como en Supabase, borrar el usuario se lleva sus sesiones.
  create table auth.sessions (
    id uuid primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    not_after timestamptz
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  -- Lo que Supabase hace de serie: TODA tabla nueva de \`public\` nace con todos
  -- los permisos para los roles de la API. Sin esto, el test de los permisos
  -- de escritura pasaría en verde aunque faltara la migración que los quita.
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`

/**
 * Los dos usuarios de siempre de los tests. Nacen ya dados de alta en
 * `auth.users` en la plantilla, porque `user_id` tiene clave ajena ahí y casi
 * todo test escribe datos de uno de ellos.
 */
export const USER_A = '00000000-0000-4000-8000-00000000000a'
export const USER_B = '00000000-0000-4000-8000-00000000000b'

export type TestDb = { db: Database; pg: PGlite; close: () => Promise<void> }

/**
 * `bigint` y `numeric` vuelven como TEXTO, igual que con postgres-js en
 * producción. PGlite, por defecto, los convierte a número; con eso, quitar un
 * `.mapWith(Number)` de un agregado dejaba la suite verde y producción sumando
 * `'100' + '50' = '10050'`. Así el test ve lo mismo que Supabase.
 */
const COMO_POSTGRES_JS = {
  [types.INT8]: (valor: string) => valor,
  [types.NUMERIC]: (valor: string) => valor,
}

/** Absoluta: los tests no dependen de desde qué carpeta se lance vitest. */
const MIGRACIONES = fileURLToPath(new URL('./migrations', import.meta.url))

/**
 * Una base nueva y vacía por test. Arrancar PGlite cuesta, así que la primera
 * se migra una vez y se guarda su directorio de datos: las siguientes nacen de
 * esa copia en lugar de repetir las migraciones.
 */
let plantilla: Promise<File | Blob> | null = null

const crearPlantilla = async (): Promise<File | Blob> => {
  const pg = new PGlite()
  await pg.exec(AUTH_STUB)
  await migrate(drizzle(pg), { migrationsFolder: MIGRACIONES })
  await crearUsuario(pg, USER_A)
  await crearUsuario(pg, USER_B)
  const datos = await pg.dumpDataDir('none')
  await pg.close()
  return datos
}

export async function createTestDb(): Promise<TestDb> {
  plantilla ??= crearPlantilla()
  const pg = new PGlite({ loadDataDir: await plantilla, parsers: COMO_POSTGRES_JS })
  const db = drizzle(pg, { schema }) as unknown as Database
  return { db, pg, close: () => pg.close() }
}

/**
 * Da de alta un usuario en el `auth.users` de mentira (los datos lo exigen por
 * FK) y le abre una sesión con su MISMO id, que es la que da por buena el mock
 * de `@/lib/auth` (`test/mocks/auth.ts`).
 */
export async function crearUsuario(
  pg: PGlite,
  id: string,
  opciones: { anonimo?: boolean; email?: string } = {},
): Promise<string> {
  await pg.query('insert into auth.users (id, email, is_anonymous) values ($1, $2, $3)', [
    id,
    opciones.email ?? null,
    opciones.anonimo ?? false,
  ])
  await pg.query('insert into auth.sessions (id, user_id) values ($1, $1)', [id])
  return id
}
