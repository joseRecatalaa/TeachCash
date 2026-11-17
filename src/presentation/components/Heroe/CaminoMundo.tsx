'use client'

/*
 * El camino de un mundo: un sendero que SUBE en zigzag con un nodo por nivel,
 * el monstruo del jefe arriba del todo y el héroe, que al entrar camina hasta
 * el primer nivel abierto.
 *
 * Todo es UN `<svg>` en píxeles de juego (la geometría está en `camino.ts`).
 * Los nodos son botones de verdad dentro del SVG —`role="button"`, foco con
 * el tabulador, Enter y espacio— porque son lo único que se pulsa aquí; al
 * pulsarlos se abre la ficha del nivel (`FichaNivel`), que es donde está el
 * enlace para jugarlo.
 *
 * El estado de cada nivel (bloqueado, disponible, hecho) y sus estrellas los
 * decide el servidor. Que un nodo bloqueado no lleve a ninguna parte es
 * cortesía: el servidor tampoco lo serviría (regla dura 6).
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { MundoDto, NivelEnCaminoDto, TipoNivel } from '@/src/types/heroe.types'
import { circulo } from '../Pixel/geometria'
import type { PoseHeroe } from '../Pixel/PixelHero'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import {
  CANDADO,
  ESTRELLA,
  LIBRO,
  MANDO,
  MONSTRUO,
  PALETA_CAMINO,
  PALETA_ESTRELLA_VACIA,
  type Sprite,
} from '../Pixel/sprites'
import {
  ANCHO_CAMINO,
  altoCamino,
  heroeInicio,
  inicioSendero,
  posicionHeroe,
  posicionesNodos,
  trazoSendero,
  type Punto,
} from './camino'
import { FichaNivel } from './FichaNivel'
import { HeroeCamino } from './HeroeCamino'
import { useCaminata } from './useCaminata'
import styles from './CaminoMundo.module.css'

const ICONO: Record<Exclude<TipoNivel, 'jefe'>, Sprite> = { lectura: LIBRO, interactivo: MANDO }

/** El radio de un nodo de lectura o de práctica. */
const RADIO = 11
/** El monstruo del jefe: de pie con las botas sobre su punto del camino, como el héroe. */
const MONSTRUO_ANCHO = MONSTRUO.filas[0].length
const MONSTRUO_ALTO = MONSTRUO.filas.length

export const NOMBRE_TIPO: Record<TipoNivel, string> = {
  lectura: 'Lectura',
  interactivo: 'Práctica',
  jefe: 'Jefe',
}

const NOMBRE_ESTADO = {
  bloqueado: 'bloqueado',
  disponible: 'disponible',
  hecho: 'superado',
} as const

function Sprite({ sprite, paleta = PALETA_CAMINO }: { sprite: Sprite; paleta?: typeof PALETA_CAMINO }) {
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length
  return (
    <g transform={`translate(${-Math.floor(ancho / 2)} ${-Math.floor(alto / 2)})`}>
      <PixelSprite sprite={sprite} paleta={paleta} />
    </g>
  )
}

function Estrellas({ cuantas, y }: { cuantas: number; y: number }) {
  return (
    <g transform={`translate(-12 ${y})`}>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i * 8} 0)`}>
          <PixelSprite sprite={ESTRELLA} paleta={i < cuantas ? PALETA_CAMINO : PALETA_ESTRELLA_VACIA} />
        </g>
      ))}
    </g>
  )
}

function Nodo({
  nivel,
  punto,
  alPulsar,
}: {
  nivel: NivelEnCaminoDto
  punto: Punto
  alPulsar: () => void
}) {
  const alTeclear = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      alPulsar()
    }
  }
  const estrellas = nivel.estado === 'hecho' ? `, ${nivel.estrellas} de 3 estrellas` : ''

  return (
    <g
      className={styles.nodo}
      data-estado={nivel.estado}
      data-tipo={nivel.tipo}
      transform={`translate(${punto.x} ${punto.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${NOMBRE_TIPO[nivel.tipo]}: ${nivel.titulo}, ${NOMBRE_ESTADO[nivel.estado]}${estrellas}`}
      onClick={alPulsar}
      onKeyDown={alTeclear}
    >
      {nivel.tipo === 'jefe' ? (
        <Jefe bloqueado={nivel.estado === 'bloqueado'} />
      ) : (
        <>
          <path d={circulo(0, 0, RADIO + 5)} className={styles.halo} />
          <path d={circulo(0, 0, RADIO + 2)} className={styles.borde} />
          <path d={circulo(0, 0, RADIO)} className={styles.fondo} />
          <g className={styles.icono}>
            <Sprite sprite={nivel.estado === 'bloqueado' ? CANDADO : ICONO[nivel.tipo]} />
          </g>
        </>
      )}
      {nivel.estado === 'hecho' && <Estrellas cuantas={nivel.estrellas} y={RADIO + 5} />}
    </g>
  )
}

/**
 * El jefe no es una casilla: es su monstruo, de pie al final del camino, del
 * color de su mundo. Bloqueado, espera apagado y con un candado encima; el
 * halo que late lo lleva cuando ya se puede pelear con él.
 */
function Jefe({ bloqueado }: { bloqueado: boolean }) {
  const x = -Math.floor(MONSTRUO_ANCHO / 2)
  const y = 8 - MONSTRUO_ALTO
  return (
    <>
      <path d={circulo(0, 4, RADIO + 5)} className={styles.halo} />
      <path d="M-10 9h20v1h-20zM-12 10h24v1h-24z" className={styles.sombraJefe} />
      <g className={styles.monstruo} transform={`translate(${x} ${y})`}>
        <PixelSprite sprite={MONSTRUO} paleta={PALETA_CAMINO} />
      </g>
      {bloqueado && (
        <g transform={`translate(0 ${y - 7})`}>
          <Sprite sprite={CANDADO} />
        </g>
      )}
    </>
  )
}

/** El héroe, con su trayecto. Se monta con una `key` por trayecto (ver `useCaminata`). */
function Heroe({ desde, hasta, celebra }: { desde: Punto; hasta: Punto; celebra: boolean }) {
  const { pos, andando, mirando } = useCaminata(desde, hasta)
  let pose: PoseHeroe = celebra ? 'celebra' : 'quieto'
  if (andando) pose = 'camina'
  return (
    <g transform={`translate(${pos.x} ${pos.y})`} className={styles.heroe}>
      <HeroeCamino pose={pose} mirando={mirando} />
    </g>
  )
}

export function CaminoMundo({ datos }: { datos: MundoDto }) {
  const [abierto, setAbierto] = useState<NivelEnCaminoDto | null>(null)
  const { niveles } = datos
  const puntos = posicionesNodos(niveles.length)
  const alto = altoCamino(niveles.length)
  const heroeRef = useRef<SVGGElement>(null)

  // El camino sube y puede ser más alto que la pantalla: al entrar se lleva
  // la vista hasta el héroe, que está abajo al empezar y más arriba después.
  useEffect(() => {
    heroeRef.current?.scrollIntoView?.({ block: 'center' })
  }, [])

  // El héroe va al primer nivel abierto, desde el anterior (o desde el
  // arranque del sendero). Con todo hecho, espera celebrando en el jefe.
  const destino = niveles.findIndex((n) => n.estado === 'disponible')
  const todoHecho = destino === -1
  const i = todoHecho ? niveles.length - 1 : destino
  const hasta = posicionHeroe(puntos[i])
  let desde = i === 0 ? heroeInicio(niveles.length) : posicionHeroe(puntos[i - 1])
  if (todoHecho) desde = hasta

  // El tramo recorrido va en el color de marca; lo que queda, en gris.
  const hechos = niveles.filter((n) => n.estado === 'hecho').length
  const recorrido = [inicioSendero(niveles.length), ...puntos.slice(0, hechos + 1)]
  const pendiente = puntos.slice(Math.max(0, hechos))

  return (
    <>
      <svg
        className={styles.lienzo}
        viewBox={`0 0 ${ANCHO_CAMINO} ${alto}`}
        shapeRendering="crispEdges"
        role="group"
        aria-label={`Camino de ${datos.mundo.titulo}: ${hechos} de ${niveles.length} niveles superados`}
      >
        <g className={pixel.paletaCamino} data-decorado={datos.mundo.decorado}>
          <path d={trazoSendero(pendiente)} className={styles.senderoPendiente} />
          <path d={trazoSendero(recorrido)} className={styles.senderoRecorrido} />
          {niveles.map((nivel, k) => (
            <Nodo key={nivel.id} nivel={nivel} punto={puntos[k]} alPulsar={() => setAbierto(nivel)} />
          ))}
        </g>
        <g ref={heroeRef}>
          <Heroe
            key={`${desde.x},${desde.y}->${hasta.x},${hasta.y}`}
            desde={desde}
            hasta={hasta}
            celebra={todoHecho}
          />
        </g>
      </svg>

      <FichaNivel nivel={abierto} decorado={datos.mundo.decorado} alCerrar={() => setAbierto(null)} />
    </>
  )
}
