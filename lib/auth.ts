/**
 * Sesión.
 *
 * Hay dos tipos de usuario y los dos son usuarios de verdad en Supabase Auth:
 *   - **Invitado**: usuario anónimo. Nace solo al entrar en la aplicación, vive
 *     en la cookie de ese navegador y se borra a los 4 días.
 *   - **Usuario**: con email y contraseña.
 * Para la capa de datos no hay diferencia: los dos tienen un `userId` y toda
 * consulta filtra por él.
 *
 * Este fichero es lo único que el resto del código sabe de autenticación. Las
 * Server Actions llaman a `getSession()` y no saben que debajo hay Supabase.
 */

import { crearClienteSupabase } from './supabase/server'

export type Session = {
  user: {
    id: string
    email: string | null
    esInvitado: boolean
  }
}

/**
 * La sesión de quien hace la petición, o `null`.
 *
 * `getClaims()` VERIFICA la firma del JWT (ES256, con la clave pública del
 * proyecto, que se cachea) y su caducidad. Nunca `auth.getSession()` en el
 * servidor: esa lee la cookie tal cual y se la cree, y una cookie la puede
 * escribir cualquiera.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await crearClienteSupabase()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null

  return {
    user: {
      id: claims.sub,
      email: typeof claims.email === 'string' && claims.email ? claims.email : null,
      esInvitado: claims.is_anonymous === true,
    },
  }
}

/**
 * Para Server Components y consultas, donde no hay sesión = no hay página.
 * En las Server Actions NO se usa: allí el fallo se devuelve como estado, no se
 * lanza, para que el formulario pueda enseñar el error.
 */
export async function requireUserId(): Promise<string> {
  const session = await getSession()
  if (!session) throw new Error('No autorizado')
  return session.user.id
}
