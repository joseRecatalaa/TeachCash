'use client'

/**
 * Un entero que no es dinero y cuenta hasta su valor: las estrellas de la tienda,
 * que bajan contando al comprar. Es `AnimatedMoney` sin divisa y sin formato de
 * importe (las estrellas son enteros sin unidad y no pasan por `lib/money`); la
 * cuenta y el movimiento reducido los comparten en `useCuenta`.
 *
 * Mientras cuenta, el valor real viaja en `aria-label`: un lector de pantalla
 * que leyera los fotogramas iría cantando cifras que no son.
 */

import { useCuenta } from '../AnimatedMoney/useCuenta'

export interface AnimatedCountProps {
  valor: number
  className?: string
}

export function AnimatedCount({ valor, className }: AnimatedCountProps) {
  const mostrado = useCuenta(valor)
  return (
    <span className={className} aria-label={String(valor)}>
      <span aria-hidden>{mostrado}</span>
    </span>
  )
}
