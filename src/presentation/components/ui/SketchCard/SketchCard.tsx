'use client'

/**
 * La tarjeta-ficha del sistema de diseño.
 *
 * Sustituye al `<Paper>` de Mantine allí donde la tarjeta ES el contenido —una
 * cifra del saldo, el resumen de un mes, un gráfico— y no un simple
 * contenedor. Para paneles genéricos, el `<Paper>` de Mantine ya hereda el
 * mismo trazo por el tema.
 *
 * @example
 * <SketchCard eyebrow="Saldo" tone="accent" variant="highlight">
 *   <Text className="tabular">{formatMoney(m)}</Text>
 * </SketchCard>
 *
 * @example Tarjeta pulsable (se renderiza como <button>, no como <div> con onClick)
 * <SketchCard title="Este mes" onClick={abrir} ribbon>…</SketchCard>
 */

import type { HTMLAttributes, ReactNode } from 'react'
import styles from './SketchCard.module.css'

export type SketchCardVariant = 'paper' | 'sticker' | 'highlight' | 'flat'
export type SketchCardTone =
  | 'neutral'
  | 'accent'
  | 'positive'
  | 'warning'
  | 'danger'
  | 'info'
export type SketchCardTilt = 'none' | 'left' | 'right'
export type SketchCardPadding = 'none' | 'sm' | 'md' | 'lg'

const CLASE_TONO: Record<SketchCardTone, string> = {
  neutral: styles.toneNeutral,
  accent: styles.toneAccent,
  positive: styles.tonePositive,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  info: styles.toneInfo,
}

const CLASE_VARIANTE: Record<SketchCardVariant, string | undefined> = {
  paper: undefined,
  sticker: styles.sticker,
  highlight: styles.highlight,
  flat: styles.flat,
}

const CLASE_INCLINACION: Record<SketchCardTilt, string | undefined> = {
  none: undefined,
  left: styles.tiltLeft,
  right: styles.tiltRight,
}

const CLASE_RELLENO: Record<SketchCardPadding, string | undefined> = {
  none: styles.padNone,
  sm: styles.padSm,
  md: undefined,
  lg: styles.padLg,
}

/**
 * Se parte de `HTMLAttributes<HTMLElement>` y no de las props de `<div>` a
 * propósito: la tarjeta se renderiza como `<div>` o como `<button>` según tenga
 * `onClick`, y los manejadores tipados contra `HTMLDivElement` no se podrían
 * pasar a un `<button>`. Contra `HTMLElement` valen para las dos ramas.
 */
export interface SketchCardProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  variant?: SketchCardVariant
  /**
   * Tiñe el filete, el epígrafe y el lavado de `highlight`.
   *
   * NUNCA es el único portador del significado: el texto de la tarjeta tiene
   * que decir lo mismo. Misma regla que el color de ingreso/gasto.
   */
  tone?: SketchCardTone
  tilt?: SketchCardTilt
  padding?: SketchCardPadding
  /** Filete de rotulador sobre el borde superior, del color del tono. */
  ribbon?: boolean
  /** Línea pequeña en versales por encima del título. */
  eyebrow?: ReactNode
  title?: ReactNode
  /** Icono a la izquierda del título. Toma el color del tono. */
  icon?: ReactNode
  /** Acciones alineadas a la derecha de la cabecera. */
  actions?: ReactNode
  /** Pie separado por la línea de puntos. */
  footer?: ReactNode
  children?: ReactNode
}

export function SketchCard({
  variant = 'paper',
  tone = 'accent',
  tilt = 'none',
  padding = 'md',
  ribbon = false,
  eyebrow,
  title,
  icon,
  actions,
  footer,
  children,
  className,
  onClick,
  ...rest
}: SketchCardProps) {
  // Una tarjeta pulsable se renderiza como `<button>`: un `<div onClick>` no se
  // enfoca con el tabulador ni responde a Intro, y un lector de pantalla no lo
  // anuncia como accionable.
  const pulsable = typeof onClick === 'function'

  const clase = [
    styles.root,
    CLASE_VARIANTE[variant],
    CLASE_TONO[tone],
    CLASE_INCLINACION[tilt],
    CLASE_RELLENO[padding],
    pulsable ? styles.interactive : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const contenido = (
    <>
      {ribbon && <span className={styles.ribbon} aria-hidden />}

      {(eyebrow || title || actions) && (
        <div className={styles.header}>
          <div className={styles.headings}>
            {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
            {title && (
              <h3 className={styles.title}>
                {icon && (
                  <span className={styles.icon} aria-hidden>
                    {icon}
                  </span>
                )}
                {title}
              </h3>
            )}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}

      {children && <div className={styles.body}>{children}</div>}
      {footer && <div className={styles.footer}>{footer}</div>}
    </>
  )

  if (pulsable) {
    return (
      <button type="button" className={clase} onClick={onClick} {...rest}>
        {contenido}
      </button>
    )
  }

  return (
    <div className={clase} {...rest}>
      {contenido}
    </div>
  )
}
