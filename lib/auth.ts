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
    /**
     * Si la sesión se abrió escribiendo la contraseña. Quien entró así la
     * conoce, y por eso se le vuelve a pedir antes de cambiarla; quien llegó
     * desde el enlace de recuperación o de alta, no la conoce (o no la tiene).
     */
    entroConPassword: boolean
  }
}

/**
 * El método con que se abrió la sesión, según el claim `amr` del JWT.
 *
 * Supabase lo manda como lista de `{ method, timestamp }` (o como lista de
 * cadenas, en el formato RFC 8176). Manda el MÁS RECIENTE: es el que abrió
 * esta sesión. Cualquier forma inesperada devuelve `null`, y `null` no cuenta
 * como contraseña: ante la duda, no se le exige a nadie una contraseña que a
 * lo mejor no tiene (el que llega de "he olvidado mi contraseña").
 */
function metodoDeEntrada(amr: unknown): string | null {
  if (!Array.isArray(amr) || amr.length === 0) return null
  if (amr.every((e) => typeof e === 'string')) return amr.at(-1) as string

  let reciente: { method: string; timestamp: number } | null = null
  for (const e of amr) {
    if (!e || typeof e !== 'object') continue
    const { method, timestamp } = e as { method?: unknown; timestamp?: unknown }
    if (typeof method !== 'string') continue
    const t = typeof timestamp === 'number' ? timestamp : 0
    if (!reciente || t >= reciente.timestamp) reciente = { method, timestamp: t }
  }
  return reciente?.method ?? null
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
      entroConPassword: metodoDeEntrada(claims.amr) === 'password',
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
