'use client'

/**
 * El Cuadro de mando, sin tarjetas: una pantalla de juego. El héroe en el
 * centro, el patrimonio arriba a la izquierda, las estadísticas arriba a la
 * derecha y las estrellas debajo de ellas.
 *
 * Lo que se enseña lo ha calculado el servidor: aquí no se suma nada.
 */

import Link from 'next/link'
import { VisuallyHidden } from '@mantine/core'
import { IconArrowRight, IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'
import { formatMoneySigned } from '@/lib/format'
import { DIVISA_APP, money } from '@/lib/money'
import type { CuadroDto } from '@/src/types/cuadro.types'
import { AnimatedMoney, SketchButton } from '../ui'
import styles from './CuadroMando.module.css'
import { HeroeEquipo } from './HeroeEquipo'
import { RadarHeroe } from './RadarHeroe'

function Patrimonio({
  patrimonio,
  ganancia,
  inicialElegido,
}: Pick<CuadroDto, 'patrimonio' | 'ganancia' | 'inicialElegido'>) {
  const signo = Math.sign(ganancia)
  return (
    <section className={styles.patrimonio} aria-label="Patrimonio total">
      <p className={styles.etiqueta}>Tu patrimonio</p>
      <AnimatedMoney valor={patrimonio} className={`${styles.cifra} tabular`} />
      <p className={styles.ganancia} data-signo={signo}>
        {ganancia === 0 ? (
          'Sin cambios desde que empezaste'
        ) : (
          // El signo va en la cifra: el color y la flecha solo lo refuerzan.
          <>
            <span className={styles.sello}>
              {signo > 0 ? (
                <IconTrendingUp size={18} stroke={2.6} aria-hidden="true" />
              ) : (
                <IconTrendingDown size={18} stroke={2.6} aria-hidden="true" />
              )}
              <span className={`${styles.importe} tabular`}>{formatMoneySigned(money(ganancia, DIVISA_APP))}</span>{' '}
              desde que empezaste
            </span>
          </>
        )}
      </p>
      {/* La pregunta vive en /Patrimonio; sin esto, quien entra por la portada no la encontraría. */}
      <SketchButton href="/Patrimonio" variant="ghost" size="sm" rightSection={<IconArrowRight size={15} />}>
        {inicialElegido ? 'Ver mi patrimonio' : '¿Con cuánto empiezas? Dímelo aquí'}
      </SketchButton>
    </section>
  )
}

/** Las cinco puntas de la estrella, en un `viewBox` de 130x120 con el centro en (56, 56). */
const PUNTAS_ESTRELLA = Array.from({ length: 10 }, (_, i) => {
  const radio = i % 2 === 0 ? 50 : 22
  const angulo = -Math.PI / 2 + (i * Math.PI) / 5
  return `${(56 + radio * Math.cos(angulo)).toFixed(1)},${(56 + radio * Math.sin(angulo)).toFixed(1)}`
}).join(' ')

/**
 * Las estrellas para gastar: una estrella dibujada como el resto de la interfaz
 * (trazo de tinta grueso y sombra dura, nada de píxel) con la cifra encima, en su
 * esquina de abajo a la derecha, como el contador de una insignia. Debajo, un
 * enlace discreto. Lo ganado y lo gastado se ve en la tienda.
 *
 * La cifra es un `<text>` de SVG y no HTML: el borde grueso por fuera de la letra
 * es `paint-order: stroke`, que en SVG funciona en todos los navegadores.
 */
function Estrellas({ estrellas }: Pick<CuadroDto, 'estrellas'>) {
  const { disponibles, ganadas } = estrellas
  return (
    <section className={styles.estrellas} aria-label="Estrellas">
      <p className={styles.recuadroEstrella}>
        <svg className={styles.insignia} viewBox="0 0 130 120" aria-hidden="true">
          <polygon points={PUNTAS_ESTRELLA} className={styles.estrellaSombra} transform="translate(5 5)" />
          <polygon points={PUNTAS_ESTRELLA} className={styles.estrellaCuerpo} />
          <path d="M51 22 L46 36" className={styles.estrellaBrillo} />
          <text x={100} y={104} className={styles.cifraSombra} transform="translate(4 4)">
            {disponibles}
          </text>
          <text x={100} y={104} className={styles.cifraEstrellas}>
            {disponibles}
          </text>
        </svg>
        <VisuallyHidden>
          {disponibles} {disponibles === 1 ? 'estrella para gastar' : 'estrellas para gastar'}
        </VisuallyHidden>
      </p>
      {/* Sin ninguna ganada, la tienda no sirve de nada: el enlace lleva a ganarlas. */}
      {ganadas === 0 ? (
        <Link href="/CaminoHeroe" className={styles.enlace}>
          Gánalas en el Camino del héroe <IconArrowRight size={15} aria-hidden="true" />
        </Link>
      ) : (
        <Link href="/Tienda" className={styles.enlace}>
          Ir a la tienda <IconArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}

export function CuadroMando({ cuadro }: { cuadro: CuadroDto }) {
  return (
    <div className={`${styles.cuadro} sd-enter`}>
      <Patrimonio patrimonio={cuadro.patrimonio} ganancia={cuadro.ganancia} inicialElegido={cuadro.inicialElegido} />
      <div className={styles.centro}>
        <HeroeEquipo equipo={cuadro.equipo} />
      </div>
      <div className={styles.derecha}>
        <RadarHeroe estadisticas={cuadro.estadisticas} />
        <Estrellas estrellas={cuadro.estrellas} />
      </div>
    </div>
  )
}
