'use server'

/**
 * Server Actions del Camino del héroe.
 *
 * Van aparte de `entity.actions.ts` porque no son un CRUD: el contenido es de
 * solo lectura (vive en JSON en el repo) y lo único que se escribe es el
 * progreso, al enviar una partida. Como cualquier export de un fichero
 * 'use server', son POST públicos: el `userId` sale de la sesión (regla dura
 * 3), los ids se validan en la frontera y las respuestas llegan sin tipar
 * hasta el repositorio, que es quien las valida y las corrige.
 */

import {
  completarNivel,
  getMapa,
  getMundo,
  getNivel,
} from '@/src/infrastructure/repositories/heroe.repository'
import type {
  MapaDto,
  MundoDto,
  NivelOcultoDto,
  ResultadoNivelDto,
} from '@/src/types/heroe.types'
import { validarLevelId, validarMundoId } from './frontera'
import { ejecutar, type ActionResult } from './resultado'

const run = <T,>(operacion: (userId: string) => Promise<T>) =>
  ejecutar('heroe.actions', operacion)

export async function fetchMapa(): Promise<ActionResult<MapaDto>> {
  return run((userId) => getMapa(userId))
}

export async function fetchMundo(mundoId: string): Promise<ActionResult<MundoDto>> {
  return run((userId) => getMundo(userId, validarMundoId(mundoId)))
}

export async function fetchNivel(levelId: string): Promise<ActionResult<NivelOcultoDto>> {
  return run((userId) => getNivel(userId, validarLevelId(levelId)))
}

/** Una respuesta por pregunta, en orden. Ver `completarNivel`. */
export async function enviarNivel(
  levelId: string,
  respuestas: unknown,
): Promise<ActionResult<ResultadoNivelDto>> {
  return run((userId) => completarNivel(userId, validarLevelId(levelId), respuestas))
}
