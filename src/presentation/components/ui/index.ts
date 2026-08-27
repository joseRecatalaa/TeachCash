/**
 * Los primitivos del sistema de diseño.
 *
 * Se importan desde aquí (`@/src/presentation/components/ui`) y no por su ruta
 * completa: si mañana un componente se parte en dos ficheros, quien lo usa no
 * se entera.
 *
 * Lo que NO está aquí es igual de importante: los botones, inputs, paneles y
 * tablas siguen siendo los de Mantine. Heredan el mismo trazo por el tema
 * (`src/presentation/styles/mantine-sketch.module.css`), así que no hay que
 * sustituirlos. Estos existen porque hacen algo que Mantine no hace: un botón
 * que es un `<Link>` tipado de Next, una ficha con cinta y filete, un badge que
 * resuelve su tono desde el estado, un hueco vacío que está dibujado y un
 * importe que cuenta hasta su valor sin dejar de ser exacto.
 */

export { SketchButton } from './SketchButton/SketchButton'
export type {
  SketchButtonProps,
  SketchButtonSize,
  SketchButtonVariant,
} from './SketchButton/SketchButton'

export { SketchCard } from './SketchCard/SketchCard'
export type {
  SketchCardPadding,
  SketchCardProps,
  SketchCardTilt,
  SketchCardTone,
  SketchCardVariant,
} from './SketchCard/SketchCard'

export { ESTADOS, StatusBadge } from './StatusBadge/StatusBadge'
export type {
  StatusBadgeProps,
  StatusBadgeSize,
  StatusTone,
} from './StatusBadge/StatusBadge'

export { EmptyState } from './EmptyState/EmptyState'
export type { EmptyStateDibujo, EmptyStateProps } from './EmptyState/EmptyState'

export { AnimatedMoney } from './AnimatedMoney/AnimatedMoney'
export type { AnimatedMoneyProps } from './AnimatedMoney/AnimatedMoney'
