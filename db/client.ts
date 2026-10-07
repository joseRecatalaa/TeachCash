/**
 * Fábrica de conexiones. Único fichero que sabe qué driver hay debajo.
 *
 * Es Postgres en Supabase, a través de su pooler (Supavisor) en modo
 * TRANSACCIÓN: cada consulta toma una conexión prestada y la devuelve al
 * terminar. Eso es lo que permite que muchas peticiones compartan las pocas
 * conexiones del plan gratuito, y tiene una consecuencia que no se ve:
 * `prepare: false`. Una sentencia preparada vive en UNA conexión del servidor,
 * y la siguiente consulta puede caer en otra que no la conoce. Con `prepare`
 * activado funciona en local y falla en Supabase de forma intermitente.
 *
 * Separado de index.ts a propósito: importar la conexión compartida solo para
 * construir una de test o de migración abriría la de la app como efecto colateral.
 */

import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { entornoServidor } from '../lib/env.ts'
import * as schema from './schema.ts'

/**
 * Lo que usa todo el código. Es el tipo común a postgres-js (la app) y a PGlite
 * (los tests, `db/testing.ts`): los repositorios no saben cuál tienen debajo.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>

export const createDbClient = (url: string = entornoServidor().DATABASE_URL) =>
  postgres(url, {
    prepare: false,
    // Pocas: el pooler es quien multiplexa. Muchas aquí solo agotan su cupo.
    max: 5,
    // Suelta las conexiones ociosas: un servidor dormido no debe acaparar el pooler.
    idle_timeout: 20,
  })

export const createDb = (client: postgres.Sql): Database => drizzle(client, { schema })
