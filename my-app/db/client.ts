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
  // foreign_keys: libsql ya lo trae activado (comprobado), pero es una opción por
  // conexión y de las que no se quiere descubrir apagada. WAL permite leer
  // mientras se escribe. Ninguna de las dos afecta al resultado de una consulta,
  // así que no hace falta esperar a que terminen antes de usar el cliente.
  void client.executeMultiple('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;')
  return client
}

export const createDb = (client: Client) => drizzle(client, { schema })

export type Database = ReturnType<typeof createDb>
