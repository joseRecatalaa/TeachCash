/**
 * Datos de la cuenta que no vienen en el JWT.
 *
 * SOLO SERVIDOR. Lee `auth.users`, la tabla de Supabase Auth, y solo la fila
 * del usuario de la sesión.
 */

import { eq } from 'drizzle-orm'
import { authUsers } from 'drizzle-orm/supabase'
import { db } from '@/db'

/** Cuándo se dio de alta el usuario. Para un invitado, es lo que fija cuándo caduca. */
export async function fechaAltaUsuario(userId: string): Promise<Date | null> {
  const [fila] = await db
    .select({ creado: authUsers.createdAt })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1)
  return fila?.creado ?? null
}
