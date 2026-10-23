'use client'

/*
 * El mapa de mundos: una ficha por mundo, cada una con su escena a píxel.
 *
 * Los mundos están libres, así que todas las fichas son enlaces. El héroe
 * espera en el mundo del último nivel jugado (o en el primero, si aún no ha
 * jugado): es la forma de decir "por aquí ibas" sin un texto más.
 *
 * Lo que dice cada ficha (niveles hechos, estrellas) es progreso DERIVADO que
 * calcula el servidor (regla dura 7); aquí solo se pinta.
 */

import Link from 'next/link'
import type { Route } from 'next'
import { IconStarFilled } from '@tabler/icons-react'
import type { Decorado, MapaDto, MundoResumenDto } from '@/src/types/heroe.types'
import { PixelHero } from '../Pixel/PixelHero'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import { ESCUDO, HUCHA, MONTANA, PALETA_CAMINO, TARJETA, type Sprite } from '../Pixel/sprites'
import styles from './MapaMundos.module.css'

const DIBUJO: Record<Decorado, Sprite> = {
  escudo: ESCUDO,
  hucha: HUCHA,
  montana: MONTANA,
  tarjeta: TARJETA,
}

/* La escena de una ficha, en píxeles de juego. El decorado va a escala 2
   (entera, para que no se emborrone) y el héroe a escala 1: el decorado es
   un monumento del mundo, no un objeto que se lleva en la mano. */
const ANCHO = 112
const ALTO = 62
const SUELO = 54
const ESCALA = 2

export const rutaMundo = (id: string) => `/CaminoHeroe/Mundo?id=${encodeURIComponent(id)}` as Route

function EscenaMundo({ decorado, conHeroe }: { decorado: Decorado; conHeroe: boolean }) {
  const sprite = DIBUJO[decorado]
  const ancho = sprite.filas[0].length * ESCALA
  const alto = sprite.filas.length * ESCALA
  // Con el héroe al lado, el decorado se aparta a la izquierda para dejarle sitio.
  const x = Math.round((conHeroe ? ANCHO * 0.38 : ANCHO / 2) - ancho / 2)

  return (
    <svg
      className={styles.escena}
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g className={pixel.paletaCamino}>
        <rect y={SUELO} width={ANCHO} height="1" className={styles.sueloLuz} />
        <rect y={SUELO + 1} width={ANCHO} height={ALTO - SUELO - 1} className={styles.suelo} />
        <path
          d={[6, 20, 41, 63, 88, 101].map((s) => `M${s} ${SUELO - 1}h1v1h-1zM${s + 2} ${SUELO - 2}h1v2h-1z`).join('')}
          className={styles.suelo}
        />
        <g transform={`translate(${x} ${SUELO - alto}) scale(${ESCALA})`}>
          <PixelSprite sprite={sprite} paleta={PALETA_CAMINO} />
        </g>
      </g>
      {conHeroe && (
        <g transform={`translate(${Math.round(ANCHO * 0.62)} ${SUELO - 44})`}>
          <PixelHero pose="quieto" mirando="izq" />
        </g>
      )}
    </svg>
  )
}

function FichaMundo({ mundo, conHeroe }: { mundo: MundoResumenDto; conHeroe: boolean }) {
  const completo = mundo.hechos === mundo.total
  return (
    <Link href={rutaMundo(mundo.id)} className={styles.ficha} data-mundo={mundo.decorado}>
      <EscenaMundo decorado={mundo.decorado} conHeroe={conHeroe} />
      <span className={styles.cuerpo}>
        <span className={styles.titulo}>{mundo.titulo}</span>
        <span className={styles.descripcion}>{mundo.descripcion}</span>
        <span className={styles.progreso}>
          <span>
            {completo ? 'Completado' : `${mundo.hechos} de ${mundo.total} niveles`}
          </span>
          <span className={styles.estrellas}>
            <IconStarFilled size={14} aria-hidden />
            {mundo.estrellas} de {mundo.estrellasMax} estrellas
          </span>
        </span>
        {conHeroe && <span className={styles.aquiEstas}>Aquí te quedaste</span>}
      </span>
    </Link>
  )
}

export function MapaMundos({ mapa }: { mapa: MapaDto }) {
  const conHeroe = mapa.ultimoMundo ?? mapa.mundos[0]?.id
  return (
    <ul className={styles.rejilla}>
      {mapa.mundos.map((mundo) => (
        <li key={mundo.id}>
          <FichaMundo mundo={mundo} conHeroe={mundo.id === conHeroe} />
        </li>
      ))}
    </ul>
  )
}
