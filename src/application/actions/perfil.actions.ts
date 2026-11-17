'use server'

/**
 * Server Actions del perfil: el patrimonio.
 *
 * Van aparte de `entity.actions.ts` porque no son un CRUD (una fila por
 * usuario, sin listado ni borrado). Como cualquier export de un fichero
 * 'use server', son POST públicos: el `userId` sale de la sesión, nunca de los
 * argumentos (regla dura 3), y `values` llega sin tipar hasta el repositorio,
 * que es quien lo valida.
 */

import {
  getPatrimonioInicial,
  guardarPatrimonio as guardarPatrimonioRepo,
} from '@/src/infrastructure/repositories/perfiles.repository'
import { ejecutar, type ActionResult } from './resultado'

const run = <T,>(operacion: (userId: string) => Promise<T>) =>
  ejecutar('perfil.actions', operacion)

/**
 * El PRIMER patrimonio que eligió. `null` = aún no lo ha elegido, y la portada
 * se lo pregunta.
 */
export async function fetchPatrimonioInicial(): Promise<ActionResult<number | null>> {
  return run((userId) => getPatrimonioInicial(userId))
}

/** Fija el patrimonio TOTAL de hoy; la base se recalcula en el repositorio. */
export async function guardarPatrimonio(values: unknown): Promise<ActionResult<number>> {
  return run((userId) => guardarPatrimonioRepo(userId, values))
}
