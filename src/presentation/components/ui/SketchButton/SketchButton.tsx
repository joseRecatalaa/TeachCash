'use client'

/**
 * El botón del sistema de diseño.
 *
 * Existe además del `<Button>` de Mantine por una razón concreta: es el único
 * que puede renderizar un `<a>` de `next/link` SIN pasar por el polimorfismo de
 * Mantine, que obliga a `component={Link}` y pierde el tipado de `href`. Aquí,
 * si hay `href`, es un enlace de Next con sus props tipadas; si no, es un
 * `<button>` con las suyas.
 *
 * Los botones de Mantine que ya hay repartidos por la aplicación NO se
 * sustituyen uno a uno: heredan el mismo aspecto por el tema
 * (`src/presentation/styles/mantine-sketch.module.css`). Este componente es para
 * lo nuevo y para donde haga falta un enlace con aspecto de botón.
 *
 * @example
 * <SketchButton variant="primary" leftSection={<IconPlus size={16} />}>
 *   Nuevo movimiento
 * </SketchButton>
 *
 * <SketchButton href="/Movimientos/Create" variant="secondary">
 *   Ver movimientos
 * </SketchButton>
 */

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import Link from 'next/link'
import styles from './SketchButton.module.css'

export type SketchButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type SketchButtonSize = 'sm' | 'md' | 'lg'

interface SketchButtonBaseProps {
  /** `primary` lleva trazo grueso: solo puede haber uno por pantalla. */
  variant?: SketchButtonVariant
  size?: SketchButtonSize
  fullWidth?: boolean
  /** Atenúa el texto y pinta la ruleta encima, sin cambiar el ancho. */
  loading?: boolean
  leftSection?: ReactNode
  rightSection?: ReactNode
  children?: ReactNode
  className?: string
}

type NativeProps = SketchButtonBaseProps &
  Omit<ComponentPropsWithoutRef<'button'>, keyof SketchButtonBaseProps> & {
    href?: never
  }

/** `href` es lo que discrimina la unión: con él, esto es un `<Link>`. */
type LinkProps = SketchButtonBaseProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof SketchButtonBaseProps>

export type SketchButtonProps = NativeProps | LinkProps

const esEnlace = (props: SketchButtonProps): props is LinkProps =>
  'href' in props && props.href !== undefined

/**
 * Clase y contenido, que son idénticos en las dos ramas.
 *
 * Se calcula aparte y no destructurando la unión en la firma: destructurar una
 * unión discriminada pierde la relación entre `href` y el resto de props, y
 * entonces TypeScript deja de comprobar que `prefetch` solo se pasa a un enlace.
 */
function presentacion({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftSection,
  rightSection,
  children,
  className,
}: SketchButtonBaseProps) {
  const clase = [
    styles.root,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : null,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const contenido = (
    <>
      {leftSection && <span className={styles.section}>{leftSection}</span>}
      <span className={loading ? `${styles.label} ${styles.loadingLabel}` : styles.label}>
        {children}
      </span>
      {rightSection && <span className={styles.section}>{rightSection}</span>}
      {loading && <span className={styles.spinner} aria-hidden />}
    </>
  )

  return { clase, contenido }
}

/** Las props que consume el propio componente y que NO van al DOM. */
const CLAVES_PROPIAS = [
  'variant',
  'size',
  'fullWidth',
  'loading',
  'leftSection',
  'rightSection',
  'children',
  'className',
] as const

/**
 * Lo que sí va al elemento.
 *
 * Se quitan por copia y no destructurando: destructurar obligaría a nombrar ocho
 * variables que no se usan (`variant: _v`…) en cada una de las dos ramas, y eso
 * son dieciséis avisos del linter por un detalle de implementación.
 */
function propsDelElemento<T extends SketchButtonBaseProps>(
  props: T,
): Omit<T, (typeof CLAVES_PROPIAS)[number]> {
  const salida = { ...props }
  for (const clave of CLAVES_PROPIAS) delete salida[clave]
  return salida
}

export function SketchButton(props: SketchButtonProps) {
  const { clase, contenido } = presentacion(props)
  const { loading } = props

  if (esEnlace(props)) {
    const rest = propsDelElemento(props)

    return (
      <Link
        {...rest}
        className={clase}
        // Un `<a>` no se puede deshabilitar. Mientras carga se anula la
        // navegación y se marca para los lectores de pantalla: sin esto, un
        // enlace "cargando" sigue siendo pulsable.
        aria-disabled={loading || undefined}
        aria-busy={loading || undefined}
        tabIndex={loading ? -1 : rest.tabIndex}
        onClick={(e) => {
          if (loading) {
            e.preventDefault()
            return
          }
          rest.onClick?.(e)
        }}
      >
        {contenido}
      </Link>
    )
  }

  const rest = propsDelElemento(props)

  return (
    <button
      {...rest}
      // `type="button"` por defecto: sin esto, un botón dentro de un formulario
      // lo ENVÍA, y "Cancelar" acabaría guardando el registro. Va DESPUÉS del
      // spread para que un `type={undefined}` explícito no lo borre.
      type={rest.type ?? 'button'}
      className={clase}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
    >
      {contenido}
    </button>
  )
}
