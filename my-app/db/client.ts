/**
 * Fábrica de conexiones. Único fichero que sabe qué driver hay debajo.
 *
 * Es SQLite en un fichero local: los datos no salen de esta máquina. Se usa
 * @libsql/client porque distribuye binarios ya compilados por plataforma (no
 * necesita toolchain de C++) y porque es el mismo cliente que habla con Turso,
 * si algún día esto tuviera que dejar de ser local.
 *
 * Separado de index.ts a propósito: importar la conexión compartida solo para
 * construir una de test abriría el fichero real como efecto colateral.
 */

import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient, type Client } from '@libsql/client/node'
import { drizzle } from 'drizzle-orm/libsql/node'
import * as schema from './schema.ts'

export const DATABASE_PATH = process.env.DATABASE_PATH ?? './data/finanzas.db'

export const createDbClient = (url: string = `file:${DATABASE_PATH}`): Client => {
  // libsql no crea el directorio que falta: fallaría al abrir el fichero.
  if (url.startsWith('file:')) {
    mkdirSync(dirname(url.slice('file:'.length)), { recursive: true })
  }
  const client = createClient({ url })
  // foreign_keys es una opción POR CONEXIÓN, y de las que no se quiere descubrir
  // apagada. libsql ya la trae activada, así que si el PRAGMA falla no cambia
  // nada; por eso no bloquea la creación del cliente.
  //
  // journal_mode NO se toca aquí: es una propiedad persistente del fichero y
  // fijarla exige un bloqueo exclusivo. Durante un build, con varios workers
  // abriendo la base a la vez, eso da SQLITE_BUSY. Se fija una sola vez, en
  // db/migrate.mts.
  client.execute('PRAGMA foreign_keys = ON').catch(() => {})
  return client
}

export const createDb = (client: Client) => drizzle(client, { schema })

export type Database = ReturnType<typeof createDb>
