/*
 * Los mundos de la portada: los planetas en fila y el héroe saltando de uno a
 * otro, con alas. Al aterrizar, el planeta se aplasta un instante y suelta
 * destellos. Del último vuelve al primero de un salto largo, mirando hacia
 * atrás.
 *
 * Todo es CSS sobre SVG, sin JavaScript: la portada se pinta en el servidor y
 * no monta React en el cliente para esto. El guion vive en
 * `escenas.module.css` y está atado a la GEOMETRÍA de aquí: cuatro planetas
 * separados `PASO` píxeles de juego, 6 s por vuelta (1,5 s por planeta). Si
 * cambia el número de mundos o el paso, hay que regenerar los fotogramas del
 * `@keyframes salto-viaje`. Con más de cuatro mundos solo se pintan cuatro.
 *
 * Con el movimiento reducido, el héroe se queda de pie en el primer planeta.
 *
 * Los nombres de debajo son HTML (texto, no enlaces: aquí solo se presentan),
 * en una rejilla de cuatro columnas cuyo centro coincide con el de cada
 * planeta: el SVG ocupa el mismo ancho y cada planeta está en el centro de su
 * cuarto.
 */

import type { MundoPublicoDto } from '@/src/types/heroe.types'
import { PLANETAS, RADIO_PLANETA } from '../Heroe/planeta'
import { PixelHero } from '../Pixel/PixelHero'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import { DESTELLO, PALETA_CAMINO, PALETA_HEROE } from '../Pixel/sprites'
import planeta from './PlanetaPixel.module.css'
import { DIBUJO } from './PlanetaPixel'
import styles from './escenas.module.css'

const PASO = 140
const PRIMERO = PASO / 2
const ANCHO = PASO * 4
/** Arriba hay sitio para el salto largo; abajo, para el anillo. */
const ARRIBA = 138
const ABAJO = 62

/** Las alas son lo que hace creíble que salte entre planetas. */
const EQUIPO_VIAJE = ['casco-media', 'alas-alta', 'botas-basica', 'espada-media']

/** Alrededor de donde aterriza, en coordenadas del planeta. */
const CHISPAS = [
  [-30, -70],
  [22, -76],
  [-38, -46],
  [32, -50],
] as const

function Planeta({ mundo, orden }: { mundo: MundoPublicoDto; orden: number }) {
  const capas = PLANETAS[mundo.decorado]
  const sprite = DIBUJO[mundo.decorado]
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length
  // El decorado se aparta a la izquierda: arriba del todo aterriza el héroe.
  // A 24 píxeles del centro, la superficie está unos 32 por encima.
  const decoradoX = -24 - Math.floor(ancho / 2)
  const decoradoY = -Math.floor(Math.sqrt(RADIO_PLANETA ** 2 - 24 ** 2)) + 2 - alto

  return (
    <g transform={`translate(${PRIMERO + PASO * orden} 0)`}>
      <g className={pixel.paletaCamino} data-decorado={mundo.decorado}>
        <g className={styles.aterriza} data-orden={orden}>
          <path d={capas.anilloDetras} className={planeta.anilloDetras} />
          <path d={capas.atmosfera} className={planeta.atmosfera} />
          <path d={capas.contorno} className={planeta.contorno} />
          <path d={capas.superficie} className={planeta.superficie} />
          <path d={capas.detalle} className={planeta.detalle} />
          <path d={capas.detalleLuz} className={planeta.brillo} />
          <path d={capas.tramado} className={planeta.sombra} />
          <path d={capas.sombra} className={planeta.sombra} />
          <path d={capas.brillo} className={planeta.brillo} />
          <path d={capas.chispa} className={planeta.chispa} />
          <path d={capas.anilloDelante} className={planeta.anilloDelante} />
          <g transform={`translate(${decoradoX} ${decoradoY})`}>
            <PixelSprite sprite={sprite} paleta={PALETA_CAMINO} />
          </g>
        </g>
      </g>
      <g className={pixel.paleta}>
        {CHISPAS.map(([x, y]) => (
          <g key={`${x},${y}`} className={styles.chispazo} data-orden={orden}>
            <g transform={`translate(${x} ${y})`}>
              <PixelSprite sprite={DESTELLO} paleta={PALETA_HEROE} />
            </g>
          </g>
        ))}
      </g>
    </g>
  )
}

export function SaltoMundos({ mundos }: { mundos: readonly MundoPublicoDto[] }) {
  const cuatro = mundos.slice(0, 4)

  return (
    <div className={styles.salto}>
      <svg
        className={styles.saltoDibujo}
        viewBox={`0 ${-ARRIBA} ${ANCHO} ${ARRIBA + ABAJO}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`El héroe salta de planeta en planeta: ${cuatro.map((m) => m.titulo).join(', ')}.`}
      >
        {cuatro.map((m, i) => (
          <Planeta key={m.id} mundo={m} orden={i} />
        ))}
        {/* Fuera y dentro: la de fuera viaja, la de dentro se da la vuelta
            para el salto de regreso. Las dos poses van a la vez y el guion
            enciende una u otra: de pie al aterrizar, celebrando en el aire. */}
        <g className={styles.viajero}>
          <g className={styles.giro}>
            <PixelHero pose="quieto" equipo={EQUIPO_VIAJE} className={styles.enTierra} />
            <PixelHero pose="celebra" equipo={EQUIPO_VIAJE} className={styles.enVuelo} />
          </g>
        </g>
      </svg>

      <ul className={styles.saltoNombres}>
        {cuatro.map((m) => (
          <li key={m.id}>
            <span className={styles.saltoTitulo}>{m.titulo}</span>
            <span className={styles.saltoMedida}>{m.niveles.length} niveles</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
