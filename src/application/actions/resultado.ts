/**
 * Lo que devuelve toda Server Action, y la envoltura que lo produce.
 *
 * Fichero aparte y sin 'use server': lo comparten `entity.actions.ts` e
 * `informes.actions.ts`, y un fichero 'use server' solo puede exportar
 * funciones async (sus exports son endpoints públicos).
 *
 * ─── Por qué se DEVUELVEN los errores y no se lanzan ────────────────────────
 *
 * Una excepción en una Server Action llega al cliente redactada en producción:
 * "An error occurred in the Server Components render". Eso no le sirve a quien
 * está rellenando un formulario. Los errores esperados viajan como valor, con
 * sus `fieldErrors`, y el data provider los vuelve a convertir en excepción ya
 * en el navegador, que es donde Refine y React Query las quieren.
 */

import { getSession } from '@/lib/auth'
import { registrarError } from '@/lib/log'
import { RepositoryError } from '@/src/infrastructure/repositories/types'

export type ActionOk<T> = { ok: true; data: T }
export type ActionFail = {
  ok: false
  error: string
  /** Errores por campo, en el formato que consume `GenericForm`. */
  fieldErrors?: Record<string, string>
}
export type ActionResult<T> = ActionOk<T> | ActionFail

export const NO_AUTORIZADO = 'No autorizado'
export const ERROR_INESPERADO = 'Se ha producido un error inesperado'

/**
 * Resuelve la sesión, ejecuta y traduce el fallo.
 *
 * - Sin sesión no se ejecuta nada (regla dura 3). El `userId` que recibe la
 *   operación sale de la sesión verificada, nunca de los argumentos.
 * - Un `RepositoryError` es un error de negocio y su mensaje SE LE ENSEÑA a la
 *   persona.
 * - Cualquier otra cosa es un fallo inesperado: se registra en el servidor (sin
 *   los datos de la persona, ver `lib/log.ts`) y al cliente le llega un texto
 *   genérico, sin filtrar el interior de la base de datos.
 *
 * `contexto` dice en el log desde qué fichero de acciones vino el fallo.
 */
export async function ejecutar<T>(
  contexto: string,
  operacion: (userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  const session = await getSession()
  if (!session) return { ok: false, error: NO_AUTORIZADO }

  try {
    return { ok: true, data: await operacion(session.user.id) }
  } catch (err) {
    if (err instanceof RepositoryError) {
      return { ok: false, error: err.message, fieldErrors: err.fieldErrors }
    }
    registrarError(contexto, err)
    return { ok: false, error: ERROR_INESPERADO }
  }
}
