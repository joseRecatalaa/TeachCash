/**
 * Registro de recursos: el mapa `nombre → repositorio`.
 *
 * Es lo que convierte el `resource` que manda el cliente ("Movimientos") en el
 * código que atiende la consulta.
 *
 * **Que sea un mapa CERRADO no es un detalle de implementación: es lo que
 * sostiene la seguridad del dispatcher genérico de `entity.actions.ts`.** Ese
 * fichero expone Server Actions que aceptan un nombre de recurso cualquiera; sin
 * esta lista sería una puerta abierta. Un `resource` que no esté aquí no ejecuta
 * nada.
 *
 * SOLO SERVIDOR. Nadie importa esto desde un componente cliente.
 */

import { categoriasRepository } from './categorias.repository'
import { movimientosRepository } from './movimientos.repository'
import type { EntityRepository } from './types'

/**
 * El nombre es el mismo string que se usa en `resource` de Refine, en
 * `REFINE_RESOURCES` (`providers.tsx`) y en `useEntityFormSubmit`. Los cuatro
 * tienen que coincidir carácter a carácter.
 */
export const REPOSITORIES = {
  Categorias: categoriasRepository,
  Movimientos: movimientosRepository,
} satisfies Record<string, EntityRepository>

export type ResourceName = keyof typeof REPOSITORIES

export const isResourceName = (value: string): value is ResourceName =>
  Object.hasOwn(REPOSITORIES, value)

/**
 * Resuelve el repositorio de un recurso. Lanza si no existe: un recurso
 * desconocido es un bug del código o un intento de sondear el dispatcher, y en
 * ninguno de los dos casos debe seguir adelante.
 */
export function repositoryOf(resource: string): EntityRepository {
  if (!isResourceName(resource)) {
    throw new Error(`Recurso desconocido: ${resource}`)
  }
  return REPOSITORIES[resource]
}

export * from './types'
