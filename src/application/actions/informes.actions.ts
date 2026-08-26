'use server'

/**
 * Server Actions de los informes. Solo lectura.
 *
 * Van aparte de `entity.actions.ts` porque no son un CRUD: cada una tiene su
 * propia forma de entrada y de salida, así que no encajan en el dispatcher
 * genérico ni en la factory de hooks.
 *
 * Lo que cruza al cliente son datos YA AGREGADOS: unas decenas de puntos, no
 * los movimientos crudos. Es la regla de la skill `finance-charts`.
 */

import { getSession } from '@/lib/auth'
import type { Currency } from '@/lib/money'
import type { CivilDate, Period } from '@/lib/dates'
import {
  getGastoPorCategoria,
  getIngresosVsGastos,
  getRangoPorDefecto,
  getSerieSaldo,
  getTotalesDelMes,
} from '@/src/infrastructure/repositories/informes.repository'
import type {
  GastoPorCategoriaDto,
  PuntoSaldoDto,
  TotalesPeriodoDto,
} from '@/src/types/informe.types'
import type { ActionResult } from './entity.actions'

async function run<T>(operacion: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'No autorizado' }
  try {
    return { ok: true, data: await operacion(session.user.id) }
  } catch (err) {
    console.error('[informes.actions]', err)
    return { ok: false, error: 'Se ha producido un error inesperado' }
  }
}

export async function fetchGastoPorCategoria(
  periodo: Period,
  divisa: Currency = 'EUR',
): Promise<ActionResult<GastoPorCategoriaDto[]>> {
  return run((userId) => getGastoPorCategoria(userId, periodo, divisa))
}

export async function fetchIngresosVsGastos(
  meses = 12,
  divisa: Currency = 'EUR',
): Promise<ActionResult<TotalesPeriodoDto[]>> {
  return run((userId) => getIngresosVsGastos(userId, { meses, divisa }))
}

export async function fetchTotalesDelMes(
  periodo: Period,
  divisa: Currency = 'EUR',
): Promise<ActionResult<TotalesPeriodoDto>> {
  return run((userId) => getTotalesDelMes(userId, periodo, divisa))
}

/**
 * La serie de saldo. Sin rango explícito usa el de por defecto (12 meses, sin
 * empezar antes del primer movimiento), que se calcula EN EL SERVIDOR: hacerlo
 * en el cliente obligaría a una petición previa solo para saber desde cuándo hay
 * datos.
 */
export async function fetchSerieSaldo(
  options: {
    desde?: CivilDate
    hasta?: CivilDate
    cuentaId?: string
    divisa?: Currency
  } = {},
): Promise<ActionResult<PuntoSaldoDto[]>> {
  return run(async (userId) => {
    const rango =
      options.desde && options.hasta
        ? { desde: options.desde, hasta: options.hasta }
        : await getRangoPorDefecto(userId)

    return getSerieSaldo(userId, {
      ...rango,
      cuentaId: options.cuentaId,
      divisa: options.divisa,
    })
  })
}
