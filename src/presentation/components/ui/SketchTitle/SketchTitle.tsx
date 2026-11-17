/*
 * El título de una pantalla: la tipografía de titulares y el trazo de
 * rotulador debajo, que se pinta al entrar.
 *
 * Antes estaba copiado en el módulo de cada página (Inicio, Planificación).
 * Aquí vive una vez, y una pantalla nueva lo tiene con una línea.
 */

import type { ReactNode } from 'react'
import styles from './SketchTitle.module.css'

export interface SketchTitleProps {
  children: ReactNode
  /** El nivel del encabezado. Una pantalla tiene un solo `h1`. */
  as?: 'h1' | 'h2'
  className?: string
}

export function SketchTitle({ children, as: Etiqueta = 'h1', className }: SketchTitleProps) {
  return <Etiqueta className={className ? `${styles.titulo} ${className}` : styles.titulo}>{children}</Etiqueta>
}
