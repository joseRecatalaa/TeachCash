/*
 * Un mundo como planeta a píxel, sin nada del juego alrededor: ni estrellas
 * ni progreso. Es el de las páginas públicas (la portada y los cursos), que se
 * pintan en el servidor y no saben quién mira.
 *
 * Las capas son las mismas del mapa (`Heroe/planeta.ts`), y el color sale de
 * `data-decorado`, igual que allí. El mapa del juego no se reutiliza entero
 * porque es cliente, con el héroe corriendo y el progreso de cada uno.
 */

import type { Decorado } from '@/src/types/heroe.types'
import { PLANETAS, RADIO_PLANETA } from '../Heroe/planeta'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import { ESCUDO, HUCHA, MONTANA, PALETA_CAMINO, TARJETA, type Sprite } from '../Pixel/sprites'
import styles from './PlanetaPixel.module.css'

/** El dibujo de cada mundo, el mismo que en el mapa. */
export const DIBUJO: Record<Decorado, Sprite> = {
  escudo: ESCUDO,
  hucha: HUCHA,
  montana: MONTANA,
  tarjeta: TARJETA,
}

/** Lo que ocupa: el anillo sale 18 píxeles del planeta y el decorado asoma por arriba. */
const CAJA = RADIO_PLANETA + 18
const ARRIBA = 62
export const VIEWBOX_PLANETA = { ancho: CAJA * 2, alto: ARRIBA + CAJA }

export function PlanetaPixel({ decorado, escala = 2 }: { decorado: Decorado; escala?: number }) {
  const capas = PLANETAS[decorado]
  const sprite = DIBUJO[decorado]
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length

  return (
    <svg
      className={styles.planeta}
      viewBox={`${-CAJA} ${-ARRIBA} ${VIEWBOX_PLANETA.ancho} ${VIEWBOX_PLANETA.alto}`}
      width={VIEWBOX_PLANETA.ancho * escala}
      height={VIEWBOX_PLANETA.alto * escala}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g className={pixel.paletaCamino} data-decorado={decorado}>
        <g className={styles.flota}>
          <path d={capas.anilloDetras} className={styles.anilloDetras} />
          <path d={capas.atmosfera} className={styles.atmosfera} />
          <path d={capas.contorno} className={styles.contorno} />
          <path d={capas.superficie} className={styles.superficie} />
          <path d={capas.detalle} className={styles.detalle} />
          <path d={capas.detalleLuz} className={styles.brillo} />
          <path d={capas.tramado} className={styles.sombra} />
          <path d={capas.sombra} className={styles.sombra} />
          <path d={capas.brillo} className={styles.brillo} />
          <path d={capas.chispa} className={styles.chispa} />
          <path d={capas.anilloDelante} className={styles.anilloDelante} />
          <g transform={`translate(${-Math.floor(ancho / 2)} ${-RADIO_PLANETA + 3 - alto})`}>
            <PixelSprite sprite={sprite} paleta={PALETA_CAMINO} />
          </g>
        </g>
      </g>
    </svg>
  )
}
