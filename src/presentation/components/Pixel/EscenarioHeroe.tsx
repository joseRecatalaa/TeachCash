/*
 * El héroe grande en su escenario del Cuadro de mando: de pie sobre una isla
 * flotante, delante de un sol a píxel, con monedas que flotan y destellos que
 * titilan. Es decorado: lo que dice algo es el héroe y su equipo.
 *
 * Usa las coordenadas del héroe (48x66, origen arriba a la izquierda) con
 * margen alrededor para las alas, el arma, la isla y el decorado. Se pinta a
 * `escala` píxeles de pantalla por píxel de juego, siempre un entero: a otra
 * escala los píxeles salen de anchos distintos y deja de verse nítido.
 */

import { objetoPorId, type Hueco } from '@/lib/tienda'
import { HeroeGrande } from './HeroeGrande'
import { PixelSprite } from './PixelSprite'
import styles from './pixel.module.css'
import { DESTELLO, ISLA, MONEDA, PALETA_CAMINO, PALETA_MUNDO } from './sprites'
import { PALETA_HEROE_GRANDE } from './spritesGrande'

/** La caja del `viewBox`. Quien ponga algo encima (las zonas que se tocan) usa la misma. */
export const ESCENARIO = { x: -24, y: -8, ancho: 96, alto: 90 } as const

export const VIEWBOX_ESCENARIO = `${ESCENARIO.x} ${ESCENARIO.y} ${ESCENARIO.ancho} ${ESCENARIO.alto}`

/**
 * Un círculo a píxel: una racha horizontal por fila. Un `<circle>` con
 * `crispEdges` sale con el borde dentado a la escala de la pantalla, no a la del
 * juego, y no casa con el resto del dibujo.
 */
function disco(cx: number, cy: number, r: number): string {
  let d = ''
  for (let y = cy - r; y < cy + r; y++) {
    const dy = y + 0.5 - cy
    const medio = Math.floor(Math.sqrt(r * r - dy * dy))
    if (medio > 0) d += `M${cx - medio} ${y}h${medio * 2}v1h-${medio * 2}z`
  }
  return d
}

const HALO_FUERA = disco(24, 34, 41)
const HALO_DENTRO = disco(24, 34, 32)

/** Fuera del héroe, de sus alas y de su arma, y sin pisar la isla. */
const MONEDAS = [
  [-21, 2],
  [64, 6],
  [-22, 54],
  [61, 58],
] as const

const DESTELLOS = [
  [-10, -6],
  [50, -7],
  [-23, 30],
  [2, 74],
  [44, 74],
] as const

export function EscenarioHeroe({
  equipo = [],
  senalado = null,
  escala = 4,
}: {
  equipo?: readonly string[]
  senalado?: Hueco | null
  /** Píxeles de pantalla por píxel de juego. Un entero. */
  escala?: number
}) {
  const nombres = equipo.flatMap((id) => objetoPorId(id)?.nombre ?? [])
  return (
    <svg
      className={styles.escenario}
      viewBox={VIEWBOX_ESCENARIO}
      width={ESCENARIO.ancho * escala}
      height={ESCENARIO.alto * escala}
      shapeRendering="crispEdges"
      role="img"
      aria-label={nombres.length > 0 ? `El héroe, con: ${nombres.join(', ')}` : 'El héroe, sin equipo'}
    >
      <path d={HALO_FUERA} className={styles.haloFuera} />
      <path d={HALO_DENTRO} className={styles.haloDentro} />
      <g className={styles.paletaMundo}>
        <PixelSprite sprite={ISLA} paleta={PALETA_MUNDO} />
      </g>
      <g className={styles.paletaCamino}>
        {MONEDAS.map(([x, y]) => (
          <g key={`${x},${y}`} className={styles.flota}>
            <g transform={`translate(${x} ${y})`}>
              <PixelSprite sprite={MONEDA} paleta={PALETA_CAMINO} />
            </g>
          </g>
        ))}
      </g>
      <HeroeGrande equipo={equipo} senalado={senalado} />
      <g className={styles.paleta}>
        {DESTELLOS.map(([x, y]) => (
          <g key={`${x},${y}`} className={styles.titila}>
            <g transform={`translate(${x} ${y})`}>
              <PixelSprite sprite={DESTELLO} paleta={PALETA_HEROE_GRANDE} />
            </g>
          </g>
        ))}
      </g>
    </svg>
  )
}
