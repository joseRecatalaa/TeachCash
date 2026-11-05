'use server'

/**
 * Server Actions de la tienda del héroe.
 *
 * Como cualquier export de un fichero 'use server', son POST públicos: el
 * `userId` sale de la sesión (regla dura 3) y del cliente solo se acepta el id
 * del objeto. El precio y las estrellas los decide el repositorio.
 */

import { comprar, equipar, getTienda, quitar } from '@/src/infrastructure/repositories/tienda.repository'
import type { TiendaDto } from '@/src/types/tienda.types'
import { validarObjetoId } from './frontera'
import { ejecutar, type ActionResult } from './resultado'

const run = <T,>(operacion: (userId: string) => Promise<T>) =>
  ejecutar('tienda.actions', operacion)

export async function fetchTienda(): Promise<ActionResult<TiendaDto>> {
  return run((userId) => getTienda(userId))
}

export async function comprarObjeto(itemId: string): Promise<ActionResult<TiendaDto>> {
  return run((userId) => comprar(userId, validarObjetoId(itemId)))
}

export async function equiparObjeto(itemId: string): Promise<ActionResult<TiendaDto>> {
  return run((userId) => equipar(userId, validarObjetoId(itemId)))
}

export async function quitarObjeto(itemId: string): Promise<ActionResult<TiendaDto>> {
  return run((userId) => quitar(userId, validarObjetoId(itemId)))
}
