/*
 * El héroe, como un `<g>` de SVG que se coloca donde lo pida la escena.
 *
 * Lo pintan la pantalla de carga y el Camino del héroe, y por eso vive aquí y
 * no dentro de ninguna de las dos. Ocupa 32x44 píxeles de juego con el origen
 * arriba a la izquierda; las botas apoyan en la fila 43 y la sombra cae en las
 * filas 44 y 45.
 *
 * TODAS las capas se pintan siempre, y la pose decide por CSS (`data-pose`)
 * cuáles se ven. Es a propósito: la pantalla de carga anima la opacidad de
 * esas mismas capas con su guion (`clases`), y para eso tienen que existir en
 * el DOM aunque la pose las esconda. Sin animación —movimiento reducido— lo
 * que se ve es lo que dice la pose.
 *
 * `mirando` lo voltea con `scale(-1 1)` sobre su propio ancho. Es un dibujo de
 * frente, así que voltearlo solo cambia hacia dónde mira y qué bota se levanta
 * primero, que es justo lo que hace falta para que camine hacia un lado.
 *
 * EL EQUIPO (`equipo`, ids del catálogo) son capas encima o debajo del héroe,
 * que no cambia. Cada pieza lleva la clase de la parte del cuerpo a la que va
 * pegada, y así hereda sus poses sin una regla propia: las botas, la de las
 * piernas de cada paso; el guante y el escudo, la del brazo izquierdo (que se
 * balancea al andar y desaparece al celebrar); el arma y su guante, la del
 * derecho. Lo que va de cintura para arriba está dentro de `respira`. Al
 * celebrar, el brazo izquierdo sube con el billete: su guante sube con él y el
 * escudo se pinta a la espalda. La pantalla de carga no lleva equipo: sale
 * antes de que haya sesión.
 *
 * El orden de las capas es el orden de pintado. Si se cambia, una pieza acaba
 * tapando a otra sin que falle nada.
 */

import { equipoPorHueco, type Hueco, type Objeto } from '@/lib/tienda'
import { PixelSprite } from './PixelSprite'
import styles from './pixel.module.css'
import {
  BILLETE,
  BOCA,
  BRAZO_ARRIBA,
  BRAZO_DER_ABAJO,
  BRAZO_IZQ_ABAJO,
  CUERPO,
  OJOS,
  OJOS_ARRIBA,
  PALETA_HEROE,
  PIERNAS,
  PIERNAS_PASO_1,
  PIERNAS_PASO_2,
  type Sprite,
} from './sprites'
import {
  EQUIPO_ALAS,
  EQUIPO_ARMADURA,
  EQUIPO_BOTAS,
  EQUIPO_BOTAS_PASO_1,
  EQUIPO_BOTAS_PASO_2,
  EQUIPO_CASCO,
  EQUIPO_ESCUDO,
  EQUIPO_ESPADA,
  EQUIPO_GUANTE_ARRIBA,
  EQUIPO_GUANTE_DER,
  EQUIPO_GUANTE_IZQ,
  EQUIPO_MARTILLO,
  PALETA_EQUIPO,
} from './spritesEquipo'

export type PoseHeroe = 'quieto' | 'agacha' | 'camina' | 'corre' | 'celebra'
export type MirandoHeroe = 'izq' | 'der'

/** Las capas a las que una escena puede engancharle su propia animación. */
export type CapaHeroe = 'sombra' | 'salta' | 'brazoIzq' | 'ojos' | 'ojosArriba' | 'lleva'

/** Lo que mide el héroe, en píxeles de juego. */
export const ANCHO_HEROE = 32
export const ALTO_HEROE = 44

const unir = (...clases: (string | undefined)[]) => clases.filter(Boolean).join(' ')

/**
 * Una capa del equipo: su sprite, con la paleta de su calidad. `data-hueco` lo
 * usa el CSS (las alas básicas son de plumas) y los tests, para el orden.
 */
function Pieza({ objeto, sprite, className }: { objeto: Objeto | undefined; sprite: Sprite; className?: string }) {
  if (!objeto) return null
  return (
    <g className={unir(styles.equipo, className)} data-calidad={objeto.calidad} data-hueco={objeto.hueco}>
      <PixelSprite sprite={sprite} paleta={PALETA_EQUIPO} />
    </g>
  )
}

export function PixelHero({
  pose = 'quieto',
  mirando = 'der',
  equipo = [],
  clases = {},
  className,
}: {
  pose?: PoseHeroe
  mirando?: MirandoHeroe
  /** Ids del catálogo de la tienda. Uno por hueco; lo que no esté en el catálogo no se pinta. */
  equipo?: readonly string[]
  clases?: Partial<Record<CapaHeroe, string>>
  className?: string
}) {
  const puesto = equipoPorHueco(equipo)
  const de = (hueco: Hueco) => puesto.get(hueco)
  const arma = de('arma')

  return (
    <g
      className={unir(styles.paleta, styles.heroe, className)}
      data-pose={pose}
      transform={mirando === 'izq' ? `translate(${ANCHO_HEROE} 0) scale(-1 1)` : undefined}
    >
      <path d="M8 44h16v1h-16zM6 45h20v1h-20z" className={unir(styles.sombra, clases.sombra)} />

      <g className={clases.salta}>
        <PixelSprite sprite={PIERNAS} paleta={PALETA_HEROE} className={styles.piernas} />
        <PixelSprite sprite={PIERNAS_PASO_1} paleta={PALETA_HEROE} className={styles.paso1} />
        <PixelSprite sprite={PIERNAS_PASO_2} paleta={PALETA_HEROE} className={styles.paso2} />
        {/* Las botas, un fotograma por cada uno de las piernas: van a la vez. */}
        <Pieza objeto={de('botas')} sprite={EQUIPO_BOTAS} className={styles.piernas} />
        <Pieza objeto={de('botas')} sprite={EQUIPO_BOTAS_PASO_1} className={styles.paso1} />
        <Pieza objeto={de('botas')} sprite={EQUIPO_BOTAS_PASO_2} className={styles.paso2} />
        <g className={styles.respira}>
          <Pieza objeto={de('alas')} sprite={EQUIPO_ALAS} />
          {/* Al celebrar, el escudo cuelga a la espalda: detrás del cuerpo. */}
          <Pieza objeto={de('escudo')} sprite={EQUIPO_ESCUDO} className={styles.escudoEspalda} />
          <PixelSprite sprite={CUERPO} paleta={PALETA_HEROE} />
          <Pieza objeto={de('armadura')} sprite={EQUIPO_ARMADURA} />
          <PixelSprite
            sprite={BRAZO_IZQ_ABAJO}
            paleta={PALETA_HEROE}
            className={unir(styles.brazoIzq, clases.brazoIzq)}
          />
          <Pieza objeto={de('guantes')} sprite={EQUIPO_GUANTE_IZQ} className={styles.brazoIzq} />
          <Pieza objeto={de('escudo')} sprite={EQUIPO_ESCUDO} className={styles.brazoIzq} />
          {/* El arma, antes que el brazo: la mano se cierra sobre el puño. */}
          <Pieza
            objeto={arma}
            sprite={arma?.tipo === 'martillo' ? EQUIPO_MARTILLO : EQUIPO_ESPADA}
            className={styles.brazoDer}
          />
          <PixelSprite sprite={BRAZO_DER_ABAJO} paleta={PALETA_HEROE} className={styles.brazoDer} />
          <Pieza objeto={de('guantes')} sprite={EQUIPO_GUANTE_DER} className={styles.brazoDer} />
          <PixelSprite sprite={OJOS} paleta={PALETA_HEROE} className={unir(styles.ojos, clases.ojos)} />
          <PixelSprite
            sprite={OJOS_ARRIBA}
            paleta={PALETA_HEROE}
            className={unir(styles.ojosArriba, clases.ojosArriba)}
          />
          <PixelSprite sprite={BOCA} paleta={PALETA_HEROE} />
          <Pieza objeto={de('casco')} sprite={EQUIPO_CASCO} />
          {/* El billete antes que el brazo: la mano queda por delante. */}
          <g className={unir(styles.lleva, clases.lleva)}>
            <PixelSprite sprite={BILLETE} paleta={PALETA_HEROE} />
            <PixelSprite sprite={BRAZO_ARRIBA} paleta={PALETA_HEROE} />
            <Pieza objeto={de('guantes')} sprite={EQUIPO_GUANTE_ARRIBA} />
          </g>
        </g>
      </g>
    </g>
  )
}
