'use server'

/** Server Action del Cuadro de mando. Solo lectura; el `userId` sale de la sesión. */

import { getCuadro } from '@/src/infrastructure/repositories/cuadro.repository'
import type { CuadroDto } from '@/src/types/cuadro.types'
import { ejecutar, type ActionResult } from './resultado'

export async function fetchCuadro(): Promise<ActionResult<CuadroDto>> {
  return ejecutar('cuadro.actions', (userId) => getCuadro(userId))
}
