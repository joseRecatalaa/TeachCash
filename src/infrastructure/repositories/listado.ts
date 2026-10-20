/**
 * Piezas comunes de los listados: orden, paginación y búsqueda.
 *
 * Lo comparten todos los repositorios porque es justo donde lo que manda el
 * cliente se acerca más al SQL, y cada copia era una ocasión de olvidarse de
 * algo. `entity.actions.ts` ya valida la FORMA de `ListParams` con Zod; esto
 * se encarga del SIGNIFICADO, y lo hace igual aunque alguien llame al
 * repositorio sin pasar por la acción.
 */

import {
  FILAS_SIN_PAGINAR_MAXIMO,
  TAMANO_PAGINA_MAXIMO,
  TAMANO_PAGINA_POR_DEFECTO,
} from '@/src/types/limites.types'
import type { ListParams } from './types'

/**
 * La columna por la que ordenar, o la de por defecto.
 *
 * Con `Object.hasOwn` y no con `sortables[sortBy] ?? …`: un objeto literal
 * hereda de `Object.prototype`, y `sortables['constructor']` es la función
 * `Object`, que no es `undefined` y se colaba en el `ORDER BY`.
 */
export function columnaDeOrden<C>(
  sortables: Record<string, C>,
  sortBy: string | undefined,
  porDefecto: C,
): C {
  return sortBy !== undefined && Object.hasOwn(sortables, sortBy) ? sortables[sortBy] : porDefecto
}

/**
 * Qué trozo del resultado devolver.
 *
 * Sin paginar no significa sin límite: el modo cliente de las tablas pide el
 * conjunto entero, y "entero" tiene un techo (`FILAS_SIN_PAGINAR_MAXIMO`).
 * Los números se acotan aquí además de en la acción: una página 0 o negativa
 * daría un `offset` negativo, que Postgres rechaza con un error genérico.
 */
export function trozo(params: ListParams): { limit: number; offset: number } {
  if (params.paginate === false) return { limit: FILAS_SIN_PAGINAR_MAXIMO, offset: 0 }

  const pageSize = Math.min(
    Math.max(Math.trunc(params.pageSize ?? TAMANO_PAGINA_POR_DEFECTO), 1),
    TAMANO_PAGINA_MAXIMO,
  )
  const page = Math.max(Math.trunc(params.page ?? 1), 1)
  return { limit: pageSize, offset: (page - 1) * pageSize }
}

/**
 * El patrón de `ilike` para "contiene `texto`", con los comodines escapados.
 *
 * En LIKE, `%` es "lo que sea", `_` es "un carácter cualquiera" y `\` es el
 * carácter de escape. Sin escaparlos, buscar "10%" encuentra todo lo que
 * empiece por "10", y buscar "%" lo encuentra todo.
 */
export function patronContiene(texto: string): string {
  const escapado = texto.replace(/[\\%_]/g, (c) => '\\' + c)
  return `%${escapado}%`
}
