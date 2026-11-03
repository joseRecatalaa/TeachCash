'use client'

/*
 * La ficha de un nivel, al pulsar su nodo en el camino.
 *
 * Es la puerta del nivel y tiene que invitar a entrar: arriba, una escena a
 * píxel con el héroe frente a lo que le espera (el libro, el mando o el
 * monstruo del jefe, del color de su mundo); debajo, en chapas, qué es,
 * cuánto se tarda y cómo va; la descripción, corta; y un botón grande.
 *
 * Un nivel bloqueado también abre su ficha, con el candado y sin botón,
 * diciendo qué falta: un nodo que no responde al pulsarlo parece roto.
 */

import { Modal } from '@mantine/core'
import type { Route } from 'next'
import { IconCheck, IconClock, IconLock, IconPlayerPlayFilled } from '@tabler/icons-react'
import type { Decorado, NivelEnCaminoDto, TipoNivel } from '@/src/types/heroe.types'
import { PixelHero } from '../Pixel/PixelHero'
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
import { SketchButton, StatusBadge } from '../ui'
import styles from './FichaNivel.module.css'

const QUE_ES: Record<TipoNivel, string> = {
  lectura: 'Lectura',
  interactivo: 'Práctica',
  jefe: 'Jefe final',
}

const LLAMADA: Record<TipoNivel, string> = {
  lectura: 'Lee la lección y supera el minitest.',
  interactivo: 'Practica con ejercicios: cada uno se corrige al momento.',
  jefe: 'El test grande del mundo. Véncelo para completarlo.',
}

export const rutaNivel = (id: string) => `/CaminoHeroe/Nivel?id=${encodeURIComponent(id)}` as Route

/* La escena de la cabecera, en píxeles de juego. El héroe a la izquierda,
   lo que le espera a la derecha, sobre el mismo suelo. Por encima del héroe
   quedan 14 píxeles libres: el billete que levanta al celebrar asoma 10 por
   encima de su caja, y sin ese aire se cortaba contra la cabecera. */
const ANCHO = 176
const ALTO = 74
const SUELO = 68
const HEROE_X = 28

/** Lo que le espera al héroe, y a qué escala: el monstruo ya es grande. */
function Reto({ tipo }: { tipo: TipoNivel }): { sprite: Sprite; escala: number } {
  if (tipo === 'jefe') return { sprite: MONSTRUO, escala: 2 }
  return { sprite: tipo === 'lectura' ? LIBRO : MANDO, escala: 3 }
}

function Escena({ nivel, decorado }: { nivel: NivelEnCaminoDto; decorado: Decorado }) {
  const { sprite, escala } = Reto({ tipo: nivel.tipo })
  const ancho = sprite.filas[0].length * escala
  const alto = sprite.filas.length * escala
  const bloqueado = nivel.estado === 'bloqueado'
  const x = Math.round(ANCHO * 0.62 - ancho / 2)
  const y = nivel.tipo === 'jefe' ? SUELO - alto : Math.round(SUELO - 14 - alto)

  return (
    <svg className={styles.escena} viewBox={`0 0 ${ANCHO} ${ALTO}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect y={SUELO} width={ANCHO} height="2" className={styles.suelo} />
      <g transform={`translate(${HEROE_X} ${SUELO - 44})`}>
        <PixelHero pose={nivel.estado === 'hecho' ? 'celebra' : 'quieto'} />
      </g>
      <g className={pixel.paletaCamino} data-decorado={decorado}>
        <g className={bloqueado ? styles.apagado : styles.reto} transform={`translate(${x} ${y}) scale(${escala})`}>
          <PixelSprite sprite={sprite} paleta={PALETA_CAMINO} />
        </g>
        {bloqueado && (
          <g transform={`translate(${Math.round(ANCHO * 0.62) - 7} ${y - 18}) scale(2)`}>
            <PixelSprite sprite={CANDADO} paleta={PALETA_CAMINO} />
          </g>
        )}
      </g>
    </svg>
  )
}

function Estrellas({ cuantas }: { cuantas: number }) {
  return (
    <svg className={styles.estrellas} viewBox="0 0 30 8" shapeRendering="crispEdges" aria-hidden="true">
      <g className={pixel.paletaCamino}>
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${i * 11} 0)`}>
            <PixelSprite sprite={ESTRELLA} paleta={i < cuantas ? PALETA_CAMINO : PALETA_ESTRELLA_VACIA} />
          </g>
        ))}
      </g>
    </svg>
  )
}

export function FichaNivel({
  nivel,
  decorado,
  alCerrar,
}: {
  nivel: NivelEnCaminoDto | null
  decorado: Decorado
  alCerrar: () => void
}) {
  return (
    <Modal
      opened={nivel !== null}
      onClose={alCerrar}
      title={nivel?.titulo}
      centered
      size="lg"
      classNames={{ title: styles.titulo, body: styles.cuerpo }}
    >
      {nivel && (
        <div className={styles.ficha} data-tipo={nivel.tipo}>
          <Escena nivel={nivel} decorado={decorado} />

          <div className={styles.chapas}>
            <StatusBadge tone={nivel.tipo === 'jefe' ? 'danger' : 'accent'}>{QUE_ES[nivel.tipo]}</StatusBadge>
            <StatusBadge tone="neutral" icon={<IconClock size={13} aria-hidden />}>
              {nivel.minutos} min
            </StatusBadge>
            {nivel.estado === 'hecho' && (
              <StatusBadge tone="positive" icon={<IconCheck size={13} aria-hidden />}>
                Superado
              </StatusBadge>
            )}
            {nivel.estado === 'bloqueado' && (
              <StatusBadge tone="muted" icon={<IconLock size={13} aria-hidden />}>
                Bloqueado
              </StatusBadge>
            )}
          </div>

          <p className={styles.llamada}>{LLAMADA[nivel.tipo]}</p>
          <p className={styles.descripcion}>{nivel.descripcion}</p>

          {nivel.estado === 'hecho' && (
            <p className={styles.marca}>
              <Estrellas cuantas={nivel.estrellas} />
              Tu mejor marca: {nivel.estrellas} de 3 estrellas
            </p>
          )}

          {nivel.estado === 'bloqueado' ? (
            <p className={styles.bloqueado}>
              <IconLock size={16} aria-hidden />
              Supera el nivel anterior para abrir este.
            </p>
          ) : (
            <SketchButton
              href={rutaNivel(nivel.id)}
              size="lg"
              fullWidth
              leftSection={<IconPlayerPlayFilled size={18} aria-hidden />}
            >
              {nivel.estado === 'hecho' ? 'Repetir' : '¡Empezar!'}
            </SketchButton>
          )}
        </div>
      )}
    </Modal>
  )
}
