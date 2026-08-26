/**
 * Sesión.
 *
 * La v1 no tiene login: la aplicación es local y de un solo usuario. Pero el
 * resto del código se escribe COMO SI lo tuviera — toda consulta filtra por
 * `userId` y toda acción llama a `getSession()` antes de tocar nada.
 *
 * Ese es el punto de este fichero: cuando llegue auth de verdad, cambia esto y
 * nada más. Si en su lugar se hubiera quitado el `userId` "porque solo hay uno",
 * habría que rehacer la capa de datos entera.
 */

/** Dueño de todos los datos mientras no haya login. */
export const LOCAL_USER_ID = 'local-user'

export type Session = { user: { id: string } }

/**
 * Asíncrona a propósito, aunque hoy no espere a nada: cuando la sesión venga de
 * una cookie o de un proveedor externo, ninguna firma de las que la llaman cambia.
 */
export async function getSession(): Promise<Session | null> {
  return { user: { id: LOCAL_USER_ID } }
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
