'use client'

/**
 * Un importe que cuenta hasta su valor.
 *
 * Dos cosas que NO son negociables aquí, porque esto es una cifra de dinero:
 *
 *   1. **Solo se anima el camino, nunca el destino.** El último fotograma es
 *      exactamente `formatMoney(money(valor, divisa))` — el mismo entero, el
 *      mismo formateador. La animación interpola un número intermedio que se
 *      redondea a entero antes de construir el `Money`, así que jamás se
 *      formatea un decimal (regla dura 1).
 *   2. **Si se pide menos movimiento, no hay animación.** El CSS no llega hasta
 *      aquí: esto es JavaScript y tiene que preguntarlo por `matchMedia`. Sin
 *      esa comprobación, `prefers-reduced-motion` no serviría de nada en la
 *      cifra más grande de la portada.
 *
 * Y una tercera que se olvida: mientras cuenta, el valor real viaja en
 * `aria-label`. Un lector de pantalla que leyera los fotogramas iría cantando
 * cifras falsas.
 */

import { useEffect, useRef, useState } from 'react'
import { formatMoney, formatMoneySigned } from '@/lib/format'
import { DIVISA_APP, money, type Currency } from '@/lib/money'

export interface AnimatedMoneyProps {
  /** Céntimos, entero con signo. */
  valor: number | undefined
  divisa?: Currency
  /** Pinta el signo siempre. Para netos y flujos, donde el signo es el dato. */
  signed?: boolean
  /** Lo que se enseña mientras no hay valor. */
  placeholder?: string
  className?: string
}

/** Frena al final en vez de cortar en seco: es lo que lo hace parecer un conteo. */
const easeOut = (t: number) => 1 - (1 - t) ** 3

const DURACION = 650

export function AnimatedMoney({
  valor,
  divisa = DIVISA_APP,
  signed = false,
  placeholder = '—',
  className,
}: AnimatedMoneyProps) {
  const [mostrado, setMostrado] = useState(valor ?? 0)
  // Desde dónde arranca la próxima cuenta. En una ref y no en estado: cambiarlo
  // no tiene que provocar un render, solo alimentar al siguiente frame.
  const desde = useRef(valor ?? 0)

  useEffect(() => {
    if (valor === undefined) return

    const destino = valor
    const reducido =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducido || desde.current === destino) {
      desde.current = destino
      setMostrado(destino)
      return
    }

    const origen = desde.current
    const t0 = performance.now()
    let frame = 0

    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - t0) / DURACION)
      // Redondeo a entero SIEMPRE: un fotograma con decimales haría que
      // `money()` lanzara, que es justo la red que queremos conservar.
      setMostrado(Math.round(origen + (destino - origen) * easeOut(t)))
      if (t < 1) frame = requestAnimationFrame(paso)
      else desde.current = destino
    }

    frame = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(frame)
  }, [valor])

  if (valor === undefined) return <span className={className}>{placeholder}</span>

  const formatear = signed ? formatMoneySigned : formatMoney
  const final = formatear(money(valor, divisa))

  return (
    <span className={className} aria-label={final}>
      {/* El texto animado se oculta al lector de pantalla: el `aria-label` de
          arriba ya lleva la cifra real y definitiva. */}
      <span aria-hidden>{formatear(money(mostrado, divisa))}</span>
    </span>
  )
}
