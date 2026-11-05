/*
 * El héroe grande, como un `<g>` de SVG: 48x66 píxeles de juego con el origen
 * arriba a la izquierda. Las botas apoyan en la fila 65 y la sombra cae en las
 * filas 66 y 67.
 *
 * El orden de las capas es el orden de pintado, y es lo que hará que el equipo
 * quede por encima o por debajo de lo que toque: la cabeza va después del torso
 * para que la barbilla tape el cuello.
 *
 * Solo respira lo que va de cintura para arriba, igual que `PixelHero`, y por la
 * misma razón: las botas se quedan clavadas en el suelo.
 */

import { PixelSprite } from './PixelSprite'
import styles from './pixel.module.css'
import {
  GRANDE_BRAZO_DER,
  GRANDE_BRAZO_IZQ,
  GRANDE_CABEZA,
  GRANDE_PIERNAS,
  GRANDE_TORSO,
  PALETA_HEROE_GRANDE as PALETA,
} from './spritesGrande'

/** Lo que mide el héroe grande, en píxeles de juego. */
export const ANCHO_HEROE_GRANDE = 48
export const ALTO_HEROE_GRANDE = 66

export function HeroeGrande({ className }: { className?: string }) {
  return (
    <g className={className ? `${styles.paleta} ${className}` : styles.paleta}>
      <path d="M12 66h24v1h-24zM9 67h30v1h-30z" className={styles.sombra} />
      <PixelSprite sprite={GRANDE_PIERNAS} paleta={PALETA} />
      <g className={styles.respira}>
        <PixelSprite sprite={GRANDE_TORSO} paleta={PALETA} />
        <PixelSprite sprite={GRANDE_BRAZO_IZQ} paleta={PALETA} />
        <PixelSprite sprite={GRANDE_BRAZO_DER} paleta={PALETA} />
        <PixelSprite sprite={GRANDE_CABEZA} paleta={PALETA} />
      </g>
    </g>
  )
}
