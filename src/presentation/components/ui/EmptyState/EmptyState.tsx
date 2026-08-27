'use client'

/**
 * El hueco cuando no hay nada que enseñar.
 *
 * Existe porque un `<p>Todavía no hay datos</p>` en medio de una tarjeta vacía
 * se lee como un fallo de carga, no como un estado normal. Aquí el vacío ocupa
 * sitio, está dibujado y dice qué hacer a continuación.
 *
 * Las ilustraciones son SVG en línea y no ficheros: van con `currentColor` y
 * trazo del sistema, así que heredan el modo oscuro sin una segunda versión.
 * Un PNG en `public/` habría que dibujarlo dos veces.
 */

import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

export type EmptyStateDibujo = 'libreta' | 'etiquetas' | 'grafico'

export interface EmptyStateProps {
  dibujo?: EmptyStateDibujo
  /** Una línea. Lo que pasa, no una disculpa. */
  titulo: string
  /** Opcional: qué hacer para que deje de estar vacío. */
  descripcion?: string
  /** Normalmente un `SketchButton`. */
  accion?: ReactNode
  /** Reduce el dibujo, para un hueco dentro de una tarjeta pequeña. */
  compacto?: boolean
  className?: string
}

/**
 * Los tres dibujos.
 *
 * Trazo redondeado y líneas que no cierran del todo: es lo que hace que se lean
 * como dibujadas a mano y no como un icono. `vector-effect` mantiene el grosor
 * al escalar, que si no la versión compacta sale con el trazo más fino que el
 * resto de la interfaz.
 */
const DIBUJOS: Record<EmptyStateDibujo, ReactNode> = {
  // Una libreta abierta con el renglón vacío.
  libreta: (
    <>
      <path d="M8 14 C7 30 7 46 8 60 C20 57 32 57 44 60 C45 46 45 30 44 14 C32 11 20 11 8 14 Z" />
      <path d="M44 14 C56 11 68 11 80 14 C81 30 81 46 80 60 C68 57 56 57 44 60" />
      <path d="M44 15 L44 59" />
      <path d="M15 26 L36 26" opacity="0.55" />
      <path d="M15 34 L32 34" opacity="0.55" />
      <path d="M53 26 L73 26" opacity="0.55" />
      <path d="M53 34 L69 34" opacity="0.55" />
    </>
  ),
  // Dos etiquetas colgando.
  etiquetas: (
    <>
      <path d="M12 34 L34 12 C36 10 39 10 41 12 L64 35 C66 37 66 40 64 42 L42 64 C40 66 37 66 35 64 L12 41 Z" />
      <circle cx="30" cy="26" r="4.5" />
      <path d="M50 16 L70 16 C73 16 75 18 75 21 L75 44" opacity="0.55" />
    </>
  ),
  // Tres barras y una línea que no llega.
  grafico: (
    <>
      <path d="M12 62 L78 62" />
      <path d="M12 62 L12 14" />
      <path d="M24 62 L24 44" />
      <path d="M40 62 L40 32" />
      <path d="M56 62 L56 50" />
      <path d="M20 26 C30 22 38 30 48 24" opacity="0.5" strokeDasharray="4 5" />
    </>
  ),
}

export function EmptyState({
  dibujo = 'libreta',
  titulo,
  descripcion,
  accion,
  compacto = false,
  className,
}: EmptyStateProps) {
  const clases = [styles.root, compacto ? styles.compacto : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={clases}>
      <svg
        className={styles.dibujo}
        viewBox="0 0 88 76"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        // Decorativo: el texto de al lado ya dice todo lo que hay que saber.
        aria-hidden
        focusable="false"
      >
        {DIBUJOS[dibujo]}
      </svg>
      <p className={styles.titulo}>{titulo}</p>
      {descripcion && <p className={styles.descripcion}>{descripcion}</p>}
      {accion && <div className={styles.accion}>{accion}</div>}
    </div>
  )
}
