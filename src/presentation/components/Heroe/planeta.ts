/*
 * Los planetas del mapa, dibujados a píxel con funciones puras: cada capa es
 * un trazo SVG relativo al centro del planeta, y se calcula una vez por mundo
 * al cargar el módulo (el servidor y el cliente pintan lo mismo).
 *
 * Lo que los hace planetas y no círculos:
 *  - la SOMBRA es lo que queda fuera de un círculo desplazado hacia la luz
 *    (arriba a la izquierda), y entre la luz y la sombra hay una franja
 *    TRAMADA, en damero, que es como hacían los degradados las consolas de
 *    16 bits;
 *  - una atmósfera de un píxel alrededor y un brillo con su chispa;
 *  - una SUPERFICIE distinta por mundo: continentes (salud), cráteres
 *    (ahorro), franjas de gigante gaseoso (inversión) y un anillo inclinado
 *    (deuda).
 */

import type { Decorado } from '@/src/types/heroe.types'
import { enCirculo, trazoDonde } from '../Pixel/geometria'

/** El radio de un planeta, en píxeles de juego. */
export const RADIO_PLANETA = 40

const R = RADIO_PLANETA
/** Lo que se recorre alrededor del centro: el anillo sale bastante del planeta. */
const CAJA = R + 18

export interface CapasPlaneta {
  /** El anillo por DETRÁS del planeta (solo los que tienen). */
  anilloDetras: string
  atmosfera: string
  contorno: string
  superficie: string
  detalle: string
  /** El borde de luz de los cráteres. */
  detalleLuz: string
  sombra: string
  tramado: string
  brillo: string
  chispa: string
  /** El anillo por DELANTE. */
  anilloDelante: string
}

type Pred = (x: number, y: number) => boolean

const trazo = (pred: Pred) => trazoDonde(-CAJA, -CAJA, CAJA * 2, CAJA * 2, pred)
const alguno = (...preds: Pred[]): Pred => (x, y) => preds.some((p) => p(x, y))

const dentro = enCirculo(0, 0, R)
/** El círculo de la luz: lo que queda fuera es sombra. */
const iluminado = enCirculo(-8, -8, R)
/** Un poco más grande: entre los dos va el tramado. */
const casiIluminado = enCirculo(-8, -8, R + 4)

/** La superficie de cada mundo: lo que va de otro tono sobre el planeta. */
const DETALLES: Record<Decorado, Pred> = {
  // Salud financiera: continentes, un planeta sano.
  escudo: alguno(
    enCirculo(-12, 6, 10),
    enCirculo(-4, 12, 7),
    enCirculo(13, -11, 8),
    enCirculo(18, -2, 5),
    enCirculo(4, 22, 5),
    enCirculo(-18, -14, 4),
  ),
  // Ahorro: cráteres, como una luna en la que se ha ido guardando todo.
  hucha: alguno(enCirculo(-11, 9, 7), enCirculo(13, -7, 6), enCirculo(8, 18, 4), enCirculo(-17, -9, 4), enCirculo(19, 10, 3)),
  // Inversión: franjas de gigante gaseoso, que suben y bajan como un gráfico.
  montana: (x, y) => {
    const ola = Math.round(Math.sin(x / 6) * 2)
    return [-20, -9, 3, 15].some((b) => y + ola >= b && y + ola < b + 4)
  },
  // Deuda y crédito: manchas sueltas; lo suyo es el anillo.
  tarjeta: alguno(enCirculo(-10, -4, 6), enCirculo(9, 9, 7), enCirculo(16, -12, 4), enCirculo(-14, 15, 4)),
}

/** Los cráteres tienen el borde de abajo a la derecha iluminado. */
const LUZ_DE_CRATER: Record<Decorado, Pred> = {
  escudo: () => false,
  hucha: (x, y) => DETALLES.hucha(x - 1, y - 1) && !DETALLES.hucha(x, y),
  montana: () => false,
  tarjeta: () => false,
}

/** Un anillo inclinado: una elipse hueca, girada con un cizallamiento. */
function enAnillo(x: number, y: number): boolean {
  const yi = y + x * 0.3
  const fuera = (x / (R + 16)) ** 2 + (yi / 8) ** 2 <= 1
  const hueco = (x / (R + 7)) ** 2 + (yi / 4) ** 2 <= 1
  return fuera && !hueco
}

function capas(decorado: Decorado): CapasPlaneta {
  const conAnillo = decorado === 'tarjeta'
  const detalle = DETALLES[decorado]
  const sombra: Pred = (x, y) => dentro(x, y) && !casiIluminado(x, y)
  const tramado: Pred = (x, y) => dentro(x, y) && casiIluminado(x, y) && !iluminado(x, y) && (x + y) % 2 === 0

  return {
    // Por detrás: la mitad de arriba del anillo, que el planeta tapa.
    anilloDetras: conAnillo ? trazo((x, y) => enAnillo(x, y) && y + x * 0.3 < 0) : '',
    atmosfera: trazo((x, y) => enCirculo(0, 0, R + 3)(x, y) && !enCirculo(0, 0, R + 1.6)(x, y)),
    contorno: trazo(enCirculo(0, 0, R + 1.6)),
    superficie: trazo(dentro),
    detalle: trazo((x, y) => dentro(x, y) && detalle(x, y)),
    detalleLuz: trazo((x, y) => dentro(x, y) && LUZ_DE_CRATER[decorado](x, y)),
    sombra: trazo(sombra),
    tramado: trazo(tramado),
    brillo: trazo(alguno(enCirculo(-15, -15, 5), enCirculo(-21, -6, 2))),
    chispa: trazo(alguno(enCirculo(-17, -17, 1.5), enCirculo(-9, -22, 1))),
    // Por delante: la mitad de abajo, que pasa por encima del planeta.
    anilloDelante: conAnillo ? trazo((x, y) => enAnillo(x, y) && y + x * 0.3 >= 0) : '',
  }
}

/** Las capas de cada mundo, calculadas una vez. */
export const PLANETAS: Record<Decorado, CapasPlaneta> = {
  escudo: capas('escudo'),
  hucha: capas('hucha'),
  montana: capas('montana'),
  tarjeta: capas('tarjeta'),
}
