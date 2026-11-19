/*
 * Un sprite suelto de `Pixel/sprites.ts` en su propio `<svg>`, a una escala
 * ENTERA (a otra, los píxeles salen de anchos distintos y se emborrona). Con
 * `decorado`, toma el color de ese mundo: el monstruo del jefe, por ejemplo.
 */

import type { Decorado } from '@/src/types/heroe.types'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import { PALETA_CAMINO, type Sprite } from '../Pixel/sprites'

export function DibujoPixel({
  sprite,
  escala,
  decorado,
  className,
}: {
  sprite: Sprite
  escala: number
  decorado?: Decorado
  className?: string
}) {
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length
  return (
    <svg
      className={className}
      width={ancho * escala}
      height={alto * escala}
      viewBox={`${sprite.x} ${sprite.y} ${ancho} ${alto}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g className={pixel.paletaCamino} data-decorado={decorado}>
        <PixelSprite sprite={sprite} paleta={PALETA_CAMINO} />
      </g>
    </svg>
  )
}
