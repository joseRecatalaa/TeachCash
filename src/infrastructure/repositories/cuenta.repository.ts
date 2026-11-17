/**
 * Datos de la cuenta que no vienen en el JWT.
 *
 * SOLO SERVIDOR. Lee `auth.users`, la tabla de Supabase Auth, y solo la fila
 * del usuario de la sesión.
 */

import { and, eq, gt, isNull, or, sql } from 'drizzle-orm'
import { boolean, pgSchema, timestamp, uuid } from 'drizzle-orm/pg-core'
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

/**
 * Las sesiones abiertas de Supabase Auth. Cerrar sesión, cambiar la contraseña
 * o borrar la cuenta quitan aquí la fila; `not_after` es el fin de una sesión
 * con caducidad fija.
 */
const sesiones = pgSchema('auth').table('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  notAfter: timestamp('not_after', { withTimezone: true }),
})

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

/**
 * ¿Sigue abierta la sesión `sesionId` de este usuario?
 *
 * Hace falta porque el token de acceso es autosuficiente: su firma vale hasta
 * que caduca, aunque la sesión ya se haya cerrado. Sin esta consulta, una
 * cookie robada seguía sirviendo hasta que caducaba su token, aunque su dueño
 * hubiera cerrado sesión o cambiado la contraseña.
 *
 * Por usuario Y por id dentro del `where` (regla dura 4): el id de sesión de
 * otro usuario no vale. Un id que no es UUID ni se consulta: Postgres
 * reventaría al convertirlo, y la respuesta es la misma, "no".
 */
export async function sesionViva(userId: string, sesionId: string): Promise<boolean> {
  if (!UUID.test(sesionId)) return false
  const [fila] = await db
    .select({ id: sesiones.id })
    .from(sesiones)
    .where(
      and(
        eq(sesiones.id, sesionId),
        eq(sesiones.userId, userId),
        or(isNull(sesiones.notAfter), gt(sesiones.notAfter, sql`now()`)),
      ),
    )
    .limit(1)
  return fila !== undefined
}

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
 *
 * `ejecutor` es la transacción cuando quien pregunta ya está dentro de una:
 * con una sola conexión (PGlite en los tests), salir a `db` esperaría a la
 * transacción, que a su vez espera a esta consulta.
 */
export async function esInvitado(
  userId: string,
  ejecutor: Pick<typeof db, 'select'> = db,
): Promise<boolean> {
  const [fila] = await ejecutor
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
