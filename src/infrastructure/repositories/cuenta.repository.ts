/**
 * Datos de la cuenta que no vienen en el JWT.
 *
 * SOLO SERVIDOR. Lee `auth.users`, la tabla de Supabase Auth, y solo la fila
 * del usuario de la sesión.
 */

import { eq } from 'drizzle-orm'
import { boolean, pgSchema, uuid } from 'drizzle-orm/pg-core'
import { authUsers } from 'drizzle-orm/supabase'
import { db } from '@/db'

/**
 * Las columnas de `auth.users` que `drizzle-orm/supabase` no declara.
 *
 * Va aquí y no en `db/schema.ts` a propósito: lo que está en el esquema lo
 * gestiona drizzle-kit, y el esquema `auth` es de Supabase.
 */
const usuarios = pgSchema('auth').table('users', {
  id: uuid('id').primaryKey(),
  isAnonymous: boolean('is_anonymous'),
})

/** Cuándo se dio de alta el usuario. Para un invitado, es lo que fija cuándo caduca. */
export async function fechaAltaUsuario(userId: string): Promise<Date | null> {
  const [fila] = await db
    .select({ creado: authUsers.createdAt })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1)
  return fila?.creado ?? null
}

/**
 * ¿Es un invitado? Se lee de la base y no de la sesión porque quien pregunta
 * es un repositorio, que solo recibe el `userId`. Un usuario que no está en
 * `auth.users` cuenta como invitado: ante la duda, la cuota más baja.
 */
export async function esInvitado(userId: string): Promise<boolean> {
  const [fila] = await db
    .select({ anonimo: usuarios.isAnonymous })
    .from(usuarios)
    .where(eq(usuarios.id, userId))
    .limit(1)
  return fila?.anonimo !== false
}

/**
 * Borra el usuario de `auth.users` y, con él, TODOS sus datos: categorías y
 * movimientos caen por el `on delete cascade` de `user_id`, y Supabase se lleva
 * por la misma vía sus sesiones e identidades. Es permanente, no hay papelera.
 *
 * Va por SQL y no por `auth.admin.deleteUser` porque esa exige la secret key, y
 * la aplicación no la tiene ni debe tenerla. El job de limpieza de invitados
 * borra exactamente igual.
 *
 * Quien llame tiene que haber comprobado ANTES que el `userId` es el de la
 * sesión y que la persona ha confirmado: aquí no se pregunta nada.
 */
export async function borrarUsuario(userId: string): Promise<boolean> {
  const borrados = await db
    .delete(authUsers)
    .where(eq(authUsers.id, userId))
    .returning({ id: authUsers.id })
  return borrados.length > 0
}
