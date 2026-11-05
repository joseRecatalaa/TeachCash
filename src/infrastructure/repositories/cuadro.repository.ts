/**
 * Lo que enseña el Cuadro de mando, todo de una vez.
 *
 * SOLO SERVIDOR y solo lectura. Reúne lo que ya saben los demás repositorios:
 * aquí no se calcula un saldo ni se corrige un nivel. Lo único propio es dar los
 * datos a `lib/estadisticas.ts`, que las estadísticas se calculen en el servidor
 * y que al cliente le lleguen ya hechas (regla dura 6).
 */

import { calcularEstadisticas, MESES_CONSTANCIA } from '@/lib/estadisticas'
import { MAXIMO_EQUIPABLE, precioDeEquipo } from '@/lib/tienda'
import type { CuadroDto } from '@/src/types/cuadro.types'
import { getMapa } from './heroe.repository'
import { getIngresosVsGastos, getSaldoActual } from './informes.repository'
import { getPatrimonioInicial } from './perfiles.repository'
import { getEquipo, getEstrellas } from './tienda.repository'

export async function getCuadro(userId: string): Promise<CuadroDto> {
  const [patrimonio, inicial, meses, mapa, estrellas, equipo] = await Promise.all([
    getSaldoActual(userId),
    getPatrimonioInicial(userId),
    getIngresosVsGastos(userId, { meses: MESES_CONSTANCIA }),
    getMapa(userId),
    getEstrellas(userId),
    getEquipo(userId),
  ])

  // Sin elegir patrimonio inicial cuenta como cero, igual que en `getSaldoActual`.
  const ganancia = patrimonio - (inicial ?? 0)

  return {
    patrimonio,
    ganancia,
    inicialElegido: inicial !== null,
    estrellas,
    equipo,
    estadisticas: calcularEstadisticas({
      mundos: Object.fromEntries(mapa.mundos.map((m) => [m.id, { hechos: m.hechos, total: m.total }])),
      ganancia,
      mesesEnPositivo: meses.filter((m) => m.neto > 0).length,
      precioEquipo: precioDeEquipo(equipo),
      maximoEquipable: MAXIMO_EQUIPABLE,
    }),
  }
}
