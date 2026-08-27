'use client'

/**
 * Badge de estado.
 *
 * El tono se puede dar a mano (`tone`) o deducir del propio estado (`status`),
 * que es lo habitual: así el mapa estado → color vive en UN sitio y no en cada
 * tabla que enseñe la columna.
 *
 * `ESTADOS` está abierto a propósito: cuando entre una entidad con sus propios
 * estados (una fianza pendiente / devuelta / retenida, un presupuesto agotado),
 * se añade la clave aquí y todas las vistas la pintan igual sin tocarse.
 *
 * @example
 * <StatusBadge status="pendiente" />          // ámbar, con punto
 * <StatusBadge tone="danger" dot>Archivada</StatusBadge>
 */

import type { HTMLAttributes, ReactNode } from 'react'
import styles from './StatusBadge.module.css'

export type StatusTone =
  | 'neutral'
  | 'accent'
  | 'positive'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'

export type StatusBadgeSize = 'sm' | 'md' | 'lg'

/**
 * Estado conocido → tono y etiqueta.
 *
 * La clave es el valor CRUDO tal y como sale del repositorio, en minúsculas. La
 * etiqueta que se pinta sale de aquí, no del componente que lo usa: dos tablas
 * que escriban "Devuelta" y "Devuelto" para el mismo estado son dos bugs de
 * confianza esperando a pasar.
 */
export const ESTADOS: Record<string, { tone: StatusTone; label: string }> = {
  // Ciclo de una fianza / un depósito
  pendiente: { tone: 'warning', label: 'Pendiente' },
  devuelta: { tone: 'positive', label: 'Devuelta' },
  retenida: { tone: 'danger', label: 'Retenida' },
  // Estados que ya usa la aplicación
  conciliado: { tone: 'accent', label: 'Conciliado' },
  income: { tone: 'positive', label: 'Ingreso' },
  expense: { tone: 'danger', label: 'Gasto' },
}

const CLASE_TONO: Record<StatusTone, string> = {
  neutral: styles.neutral,
  accent: styles.accent,
  positive: styles.positive,
  warning: styles.warning,
  danger: styles.danger,
  info: styles.info,
  muted: styles.muted,
}

const CLASE_TAMANO: Record<StatusBadgeSize, string | undefined> = {
  sm: styles.sm,
  md: undefined,
  lg: styles.lg,
}

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Estado crudo. Resuelve tono y etiqueta contra `ESTADOS`. */
  status?: string
  /** Tono explícito. Gana al que deduciría `status`. */
  tone?: StatusTone
  size?: StatusBadgeSize
  /** Punto de color a la izquierda. Segunda señal, además del texto. */
  dot?: boolean
  /** Con trazo grueso y sombra dura: para el estado que encabeza una ficha. */
  raised?: boolean
  icon?: ReactNode
  /** Texto. Si se omite, sale la etiqueta de `ESTADOS` o el propio `status`. */
  children?: ReactNode
}

export function StatusBadge({
  status,
  tone,
  size = 'md',
  dot = true,
  raised = false,
  icon,
  children,
  className,
  ...rest
}: StatusBadgeProps) {
  const conocido = status ? ESTADOS[status.toLowerCase()] : undefined

  // Un estado que no está en el mapa NO se rompe ni se inventa un color: sale
  // en neutro con su valor crudo, que es la señal de que falta darlo de alta.
  const tonoFinal = tone ?? conocido?.tone ?? 'neutral'
  const etiqueta = children ?? conocido?.label ?? status ?? ''

  const clase = [
    styles.root,
    CLASE_TONO[tonoFinal],
    CLASE_TAMANO[size],
    raised ? styles.raised : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={clase} {...rest}>
      {dot && !icon && <span className={styles.dot} aria-hidden />}
      {icon && (
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      )}
      {etiqueta}
    </span>
  )
}
