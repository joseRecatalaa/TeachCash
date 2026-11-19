/*
 * El combate de la portada: el héroe corre hacia el jefe del primer mundo, le
 * da tres espadazos (cada uno con lo que se aprende: presupuesto, ahorro,
 * interés compuesto), la barra de vida baja a tercios, el jefe parpadea y
 * revienta en destellos, y salen las tres estrellas del nivel. Luego vuelve a
 * empezar.
 *
 * Como `SaltoMundos`, es CSS sobre SVG sin JavaScript, y el guion está en
 * `escenas.module.css` (`@keyframes combate-*`, 7 s por vuelta). Las posiciones
 * de allí dependen de las de aquí: `HEROE_X`, `ATAQUE_X` y la caja del jefe.
 *
 * Sin movimiento (el estado sin animar, que es el del movimiento reducido): el
 * héroe en guardia delante del jefe, con la vida llena. Una escena entera, no
 * un fotograma a medias.
 *
 * El marcador de arriba (nombre y vida) es HTML: se lee con la tipografía de
 * verdad y a cualquier ancho.
 */

import type { MundoPublicoDto } from '@/src/types/heroe.types'
import { PixelHero } from '../Pixel/PixelHero'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import { DESTELLO, ESTRELLA, MONSTRUO, PALETA_CAMINO, PALETA_HEROE, TAJO } from '../Pixel/sprites'
import { Cielo } from './Cielo'
import styles from './escenas.module.css'

const ANCHO = 240
const ALTO = 112
const SUELO = 92

/** El jefe, a doble tamaño: 28x23 → 56x46, con los pies en el suelo. */
const JEFE = { x: 160, y: SUELO - 46, escala: 2 }

/** Lo que aprende el héroe es lo que pega: un golpe por idea. */
const GOLPES = ['¡Presupuesto!', '¡Ahorro!', '¡Interés compuesto!']

const EQUIPO_COMBATE = ['casco-alta', 'armadura-media', 'espada-alta', 'escudo-media', 'botas-media']

const ESTALLIDO = [
  [168, 40],
  [200, 34],
  [184, 58],
  [214, 62],
  [158, 70],
] as const

export function Batalla({ mundo }: { mundo: MundoPublicoDto | undefined }) {
  const jefe = mundo?.niveles.find((n) => n.tipo === 'jefe')?.titulo ?? 'El jefe del mundo'

  return (
    <figure className={styles.combate}>
      <Cielo semilla={17} cuantas={45} />
      <div className={styles.marcador} aria-hidden="true">
        <span className={styles.marcadorNombre}>{jefe}</span>
        <span className={styles.vida}>
          <span className={styles.vidaBarra} />
        </span>
      </div>

      <svg
        className={styles.combateDibujo}
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`El héroe derrota a ${jefe} con tres golpes y gana tres estrellas.`}
      >
        {/* El suelo: hierba y tierra, a bandas. */}
        <rect x={0} y={SUELO} width={ANCHO} height={2} className={styles.hierbaLuz} />
        <rect x={0} y={SUELO + 2} width={ANCHO} height={4} className={styles.hierba} />
        <rect x={0} y={SUELO + 6} width={ANCHO} height={ALTO - SUELO - 6} className={styles.tierra} />
        <path
          d="M14 101h3v1h-3zM52 104h2v1h-2zM96 100h3v1h-3zM133 106h2v1h-2zM176 102h3v1h-3zM221 105h2v1h-2z"
          className={styles.piedra}
        />

        <g className={styles.escenaCombate}>
          {/* El jefe: tiembla y destella al recibir, y al final parpadea y se va. */}
          <g className={styles.jefe}>
            <g className={styles.recibe}>
              <g
                transform={`translate(${JEFE.x} ${JEFE.y}) scale(${JEFE.escala})`}
                className={pixel.paletaCamino}
                data-decorado={mundo?.decorado}
              >
                <PixelSprite sprite={MONSTRUO} paleta={PALETA_CAMINO} />
              </g>
            </g>
          </g>

          {/* El héroe: corre, ataca y celebra. Tres poses a la vez; el guion
              enciende la que toca. */}
          <g className={styles.luchador}>
            <g className={styles.embiste}>
              <PixelHero pose="quieto" equipo={EQUIPO_COMBATE} className={styles.enGuardia} />
              <PixelHero pose="corre" equipo={EQUIPO_COMBATE} className={styles.corriendo} />
              <PixelHero pose="celebra" equipo={EQUIPO_COMBATE} className={styles.ganando} />
            </g>
          </g>

          <g className={pixel.paleta}>
            <g className={styles.tajo}>
              <g transform={`translate(${JEFE.x - 4} ${JEFE.y + 4}) scale(2)`}>
                <PixelSprite sprite={TAJO} paleta={PALETA_HEROE} />
              </g>
            </g>
            {ESTALLIDO.map(([x, y]) => (
              <g key={`${x},${y}`} className={styles.estallido}>
                <g transform={`translate(${x} ${y}) scale(2)`}>
                  <PixelSprite sprite={DESTELLO} paleta={PALETA_HEROE} />
                </g>
              </g>
            ))}
          </g>

          {GOLPES.map((g, i) => (
            <text key={g} x={JEFE.x + 20} y={JEFE.y - 6} className={styles.golpe} data-golpe={i}>
              {g}
            </text>
          ))}

          <g className={pixel.paletaCamino}>
            {[0, 1, 2].map((i) => (
              <g key={i} className={styles.premio} data-premio={i}>
                <g transform={`translate(${113 + i * 22} 30) scale(2)`}>
                  <PixelSprite sprite={ESTRELLA} paleta={PALETA_CAMINO} />
                </g>
              </g>
            ))}
          </g>
          {/* Centrado sobre el héroe (x 126-158) y no a la derecha: ahí está el
              marcador, que se va con el jefe pero se cruzaría al volver. */}
          <text x={142} y={22} className={styles.victoria}>
            ¡Jefe derrotado!
          </text>
        </g>
      </svg>
    </figure>
  )
}
