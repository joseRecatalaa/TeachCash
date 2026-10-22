'use server'

/**
 * Server Actions del perfil: el patrimonio inicial.
 *
 * Van aparte de `entity.actions.ts` porque no son un CRUD (una fila por
 * usuario, sin listado ni borrado). Como cualquier export de un fichero
 * 'use server', son POST públicos: el `userId` sale de la sesión, nunca de los
 * argumentos (regla dura 3), y `values` llega sin tipar hasta el repositorio,
 * que es quien lo valida.
 */

import {
  getPatrimonioInicial,
  guardarPatrimonioInicial as guardarPatrimonioInicialRepo,
} from '@/src/infrastructure/repositories/perfiles.repository'
import { ejecutar, type ActionResult } from './resultado'

const run = <T,>(operacion: (userId: string) => Promise<T>) =>
  ejecutar('perfil.actions', operacion)

/** `null` = aún no lo ha elegido, y la portada se lo pregunta. */
export async function fetchPatrimonioInicial(): Promise<ActionResult<number | null>> {
  return run((userId) => getPatrimonioInicial(userId))
}

export async function guardarPatrimonioInicial(values: unknown): Promise<ActionResult<number>> {
  return run((userId) => guardarPatrimonioInicialRepo(userId, values))
}
