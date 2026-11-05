/*
 * La cabecera de un nivel mientras se juega: dónde vas, con la barra de
 * progreso y el héroe de pie encima. La comparten la lectura y las preguntas,
 * para que el héroe no salte de sitio al pasar de una a otra.
 *
 * El dibujo va oculto para el lector de pantalla: no cuenta nada. El `viewBox`
 * deja fuera las filas de la sombra (44 y 45) porque el suelo de esta escena
 * es la propia barra, y las botas se apoyan en ella.
 */

import { Progress } from '@mantine/core'
import { ALTO_HEROE, ANCHO_HEROE, PixelHero } from '../../Pixel/PixelHero'
import styles from './reproductor.module.css'

export function ProgresoNivel({ texto, valor }: { texto: string; valor: number }) {
  return (
    <div className={styles.progreso}>
      <div className={styles.progresoFila}>
        <span className={styles.progresoTexto}>{texto}</span>
        <svg
          className={styles.heroeGuia}
          viewBox={`0 0 ${ANCHO_HEROE} ${ALTO_HEROE}`}
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <PixelHero pose="agacha" />
        </svg>
      </div>
      <Progress value={valor} aria-hidden className={styles.barra} />
    </div>
  )
}
