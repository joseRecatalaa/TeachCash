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
 */

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
} from './sprites'

export type PoseHeroe = 'quieto' | 'camina' | 'celebra'
export type MirandoHeroe = 'izq' | 'der'

/** Las capas a las que una escena puede engancharle su propia animación. */
export type CapaHeroe = 'sombra' | 'salta' | 'brazoIzq' | 'ojos' | 'ojosArriba' | 'lleva'

/** Lo que mide el héroe, en píxeles de juego. */
export const ANCHO_HEROE = 32
export const ALTO_HEROE = 44

const unir = (...clases: (string | undefined)[]) => clases.filter(Boolean).join(' ')

export function PixelHero({
  pose = 'quieto',
  mirando = 'der',
  clases = {},
  className,
}: {
  pose?: PoseHeroe
  mirando?: MirandoHeroe
  clases?: Partial<Record<CapaHeroe, string>>
  className?: string
}) {
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
        <g className={styles.respira}>
          <PixelSprite sprite={CUERPO} paleta={PALETA_HEROE} />
          <PixelSprite
            sprite={BRAZO_IZQ_ABAJO}
            paleta={PALETA_HEROE}
            className={unir(styles.brazoIzq, clases.brazoIzq)}
          />
          <PixelSprite sprite={BRAZO_DER_ABAJO} paleta={PALETA_HEROE} className={styles.brazoDer} />
          <PixelSprite sprite={OJOS} paleta={PALETA_HEROE} className={unir(styles.ojos, clases.ojos)} />
          <PixelSprite
            sprite={OJOS_ARRIBA}
            paleta={PALETA_HEROE}
            className={unir(styles.ojosArriba, clases.ojosArriba)}
          />
          <PixelSprite sprite={BOCA} paleta={PALETA_HEROE} />
          {/* El billete antes que el brazo: la mano queda por delante. */}
          <g className={unir(styles.lleva, clases.lleva)}>
            <PixelSprite sprite={BILLETE} paleta={PALETA_HEROE} />
            <PixelSprite sprite={BRAZO_ARRIBA} paleta={PALETA_HEROE} />
          </g>
        </g>
      </g>
    </g>
  )
}
