/**
 * La sesión de quien llama, solo si sigue ABIERTA.
 *
 * `getSession()` (`lib/auth.ts`) verifica la firma y la caducidad del token,
 * pero el token no se entera de que alguien cerró la sesión: hasta que caduca,
 * su firma sigue siendo buena. Aquí se mira además que la sesión siga en
 * `auth.sessions`. Así, cerrar sesión, cambiar la contraseña o borrar la cuenta
 * cortan al momento una cookie robada.
 *
 * Vive en `application` y no en `lib/auth.ts` porque necesita la base, y `lib/`
 * no importa de `src/` (las capas las vigila ESLint). Toda Server Action con
 * sesión la usa en lugar de `getSession()`.
 */

import { getSession, type Session } from '@/lib/auth'
import { sesionViva } from '@/src/infrastructure/repositories/cuenta.repository'

export async function sesionActiva(): Promise<Session | null> {
  const session = await getSession()
  if (!session) return null
  return (await sesionViva(session.user.id, session.user.sesionId)) ? session : null
}
