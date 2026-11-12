/**
 * Transacciones con candado por usuario.
 *
 * SOLO SERVIDOR. Lo comparten los repositorios que comprueban algo contando y
 * luego escriben (las cuotas, las estrellas de la tienda): sin candado, dos
 * peticiones a la vez cuentan las dos antes de que ninguna escriba, y las dos
 * pasan.
 */

import { sql } from 'drizzle-orm'
import { db } from '@/db'

export type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Pone en fila las escrituras de un usuario. El candado es de la transacción y
 * se suelta solo al terminar, así que funciona a través del Transaction pooler.
 * Es el mismo para todo lo de un usuario: comprar y anotar un movimiento
 * también esperan uno al otro, y no pasa nada (son milisegundos).
 */
export const bloquearUsuario = (tx: Transaccion, userId: string) =>
  tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}::text))`)

/** Ejecuta `escribir` en una transacción con el candado del usuario ya puesto. */
export function conCandado<T>(userId: string, escribir: (tx: Transaccion) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await bloquearUsuario(tx, userId)
    return escribir(tx)
  })
}
