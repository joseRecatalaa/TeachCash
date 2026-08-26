'use server'

/**
 * La frontera cliente ↔ servidor.
 *
 * Todo dato que la interfaz lee o escribe pasa por aquí:
 *
 *   useList / useOne / useCreate…   (Refine, en el navegador)
 *     → refine-data-provider.ts
 *     → ESTE FICHERO                 'use server'
 *     → <entidad>.repository.ts      Drizzle
 *     → SQLite
 *
 * Por encima de esta línea no hay acceso a la base de datos ni sesión: los
 * componentes son cliente. Por debajo no hay React. Este fichero es la costura.
 *
 * ─── Por qué un dispatcher genérico y no una acción por entidad ─────────────
 *
 * `'use server'` convierte TODOS los exports de este fichero en endpoints POST
 * públicos, alcanzables sin pasar por la UI (regla dura 3). Un dispatcher que
 * acepta `resource` y `values` sin tipar parece justo lo que no hay que hacer,
 * así que estas son las cuatro cosas que lo sostienen — si tocas este fichero,
 * ninguna es negociable:
 *
 *   1. `resource` se resuelve contra `REPOSITORIES`, un mapa CERRADO. Un nombre
 *      que no esté ahí no ejecuta nada.
 *   2. `values` llega como `unknown` y NUNCA se esparce sobre la tabla: cada
 *      repositorio lo pasa por su esquema Zod y escribe campo a campo.
 *   3. El `userId` sale de `getSession()`. Jamás de los argumentos.
 *   4. Todo `where` de lectura y escritura lleva el `userId` DENTRO. La
 *      propiedad no se comprueba después de leer.
 *
 * ─── Por qué se DEVUELVEN los errores y no se lanzan ────────────────────────
 *
 * Una excepción en una Server Action llega al cliente redactada en producción:
 * "An error occurred in the Server Components render". Eso no le sirve a quien
 * está rellenando un formulario. Los errores esperados viajan como valor, con
 * sus `fieldErrors`, y el data provider los vuelve a convertir en excepción ya
 * en el navegador, que es donde Refine y React Query las quieren.
 */

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import {
  repositoryOf,
  RepositoryError,
  type ListParams,
  type ListResult,
} from '@/src/infrastructure/repositories'
import {
  archivarCuenta as archivarCuentaRepo,
  getPatrimonio,
} from '@/src/infrastructure/repositories/cuentas.repository'
import {
  crearTransferencia as crearTransferenciaRepo,
  listarCatalogoCuentas,
  restaurarMovimiento as restaurarMovimientoRepo,
} from '@/src/infrastructure/repositories/movimientos.repository'
import { listarCatalogoCategorias } from '@/src/infrastructure/repositories/categorias.repository'
import { getFormMetadata as getFormMetadataRepo } from '@/src/infrastructure/repositories/metadata.repository'
import type { FormMetadata } from '@/src/types/formMetadata.types'

// ─────────────────────────────────────────────────────────────────────────────
// Resultado
// ─────────────────────────────────────────────────────────────────────────────

export type ActionOk<T> = { ok: true; data: T }
export type ActionFail = {
  ok: false
  error: string
  /** Errores por campo, en el formato que consume `GenericForm`. */
  fieldErrors?: Record<string, string>
}
export type ActionResult<T> = ActionOk<T> | ActionFail

/**
 * Envuelve una operación: resuelve la sesión, ejecuta y traduce el fallo.
 *
 * Un `RepositoryError` es un error de negocio y su mensaje SE LE ENSEÑA a la
 * persona. Cualquier otra cosa es un fallo inesperado: se registra en el
 * servidor y al cliente le llega un texto genérico, sin filtrar el interior de
 * la base de datos.
 */
async function run<T>(operacion: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'No autorizado' }

  try {
    return { ok: true, data: await operacion(session.user.id) }
  } catch (err) {
    if (err instanceof RepositoryError) {
      return { ok: false, error: err.message, fieldErrors: err.fieldErrors }
    }
    console.error('[entity.actions]', err)
    return { ok: false, error: 'Se ha producido un error inesperado' }
  }
}

/**
 * Las rutas se revalidan tras cada mutación aunque la caché la lleve React
 * Query: si algún día una página vuelve a ser Server Component, seguirá al día
 * sin que haya que acordarse de esto.
 */
const revalidar = (resource: string) => {
  revalidatePath('/', 'layout')
  revalidatePath(`/${resource}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD genérico — lo que consume `refine-data-provider.ts`
// ─────────────────────────────────────────────────────────────────────────────

export async function listEntity(
  resource: string,
  params: ListParams,
): Promise<ActionResult<ListResult<unknown>>> {
  return run((userId) => repositoryOf(resource).list(userId, params))
}

export async function getEntity(
  resource: string,
  id: string,
): Promise<ActionResult<unknown>> {
  return run(async (userId) => {
    const registro = await repositoryOf(resource).get(userId, id)
    // Mismo mensaje para "no existe" y "no es tuyo": distinguirlos le diría a
    // quien prueba ids al azar cuáles existen.
    if (!registro) throw new RepositoryError('No encontrado')
    return registro
  })
}

export async function createEntity(
  resource: string,
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const resultado = await run((userId) => repositoryOf(resource).create(userId, values))
  if (resultado.ok) revalidar(resource)
  return resultado
}

export async function updateEntity(
  resource: string,
  id: string,
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const resultado = await run((userId) => repositoryOf(resource).update(userId, id, values))
  if (resultado.ok) revalidar(resource)
  return resultado
}

export async function deleteEntity(
  resource: string,
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const resultado = await run((userId) => repositoryOf(resource).remove(userId, id))
  if (resultado.ok) revalidar(resource)
  return resultado
}

// ─────────────────────────────────────────────────────────────────────────────
// Operaciones fuera del CRUD
//
// Todo lo que no es una de las cinco operaciones CRUD: archivar una cuenta,
// crear una transferencia, restaurar un borrado. Cada una tiene su hook escrito
// a mano en `application/hooks/`, no sale de `createEntityHooks`.
// ─────────────────────────────────────────────────────────────────────────────

export async function archivarCuenta(
  id: string,
  archivar: boolean,
): Promise<ActionResult<{ id: string }>> {
  const resultado = await run((userId) => archivarCuentaRepo(userId, id, archivar))
  if (resultado.ok) revalidar('Cuentas')
  return resultado
}

export async function crearTransferencia(
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const resultado = await run((userId) => crearTransferenciaRepo(userId, values))
  if (resultado.ok) {
    revalidar('Movimientos')
    revalidar('Cuentas')
  }
  return resultado
}

/** Deshace un borrado lógico. Si la fila es una pata, restaura la transferencia. */
export async function restaurarMovimiento(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const resultado = await run((userId) => restaurarMovimientoRepo(userId, id))
  if (resultado.ok) {
    revalidar('Movimientos')
    revalidar('Cuentas')
  }
  return resultado
}

export async function getPatrimonioTotal() {
  return run((userId) => getPatrimonio(userId))
}

// ─────────────────────────────────────────────────────────────────────────────
// Metadata y catálogos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enumeraciones del formulario. No toca la base ni depende del usuario, pero
 * pasa por `run` igual: es un endpoint público y la sesión se comprueba SIEMPRE,
 * sin excepciones "porque este no devuelve datos".
 */
export async function fetchFormMetadata(
  resource: string,
): Promise<ActionResult<FormMetadata>> {
  return run(async () => getFormMetadataRepo(resource))
}

export type CatalogoCuenta = { id: string; nombre: string; divisa: string }
export type CatalogoCategoria = {
  id: string
  nombre: string
  tipo: string
  padreId: string | null
}

/**
 * Los catálogos del usuario, en una sola llamada.
 *
 * Van juntos a propósito: los formularios de movimiento necesitan los dos y
 * pedirlos por separado es una cascada de dos peticiones para pintar un
 * formulario. Se cachean con `staleTime` alto en `useCatalogos`.
 */
export async function fetchCatalogos(): Promise<
  ActionResult<{ cuentas: CatalogoCuenta[]; categorias: CatalogoCategoria[] }>
> {
  return run(async (userId) => ({
    cuentas: await listarCatalogoCuentas(userId),
    categorias: await listarCatalogoCategorias(userId),
  }))
}
