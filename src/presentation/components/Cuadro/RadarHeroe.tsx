'use client'

/**
 * Las estadísticas del héroe: el polígono con su clave y su cifra en cada
 * punta, y un botón de información que abre la ficha con el desglose.
 *
 * Dibujado a mano y no con Recharts, en los dos verdes del sol que hay detrás
 * del héroe: el polígono es parte del escenario, no una tarjeta más.
 *
 * El dominio va FIJO de 0 a 100, pero el 0 no está en el centro sino en un
 * anillo pequeño (`BASE`): con todo a 0, los siete puntos caían en el mismo
 * sitio y se tapaban unos a otros.
 *
 * La ficha es un modal en mitad de la pantalla que se cierra con la cruz (y con
 * Escape, que es la cruz del teclado); tocar fuera no la cierra. Va en un
 * portal porque es `fixed`: un antepasado con `translate` (la entrada de
 * `sd-enter`) la encerraría en su caja. El lector de pantalla tiene la lista
 * entera sin abrir nada (`VisuallyHidden`).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { VisuallyHidden } from '@mantine/core'
import {
  IconBarbell,
  IconBolt,
  IconCalendarStats,
  IconCoins,
  IconHeart,
  IconInfoCircle,
  IconShield,
  IconSword,
  IconX,
} from '@tabler/icons-react'
import type { ClaveEstadistica, Estadistica } from '@/lib/estadisticas'
import { SketchTitle } from '../ui'
import styles from './RadarHeroe.module.css'

const ICONO: Record<ClaveEstadistica, ReactNode> = {
  VIT: <IconHeart size={18} stroke={2.4} />,
  DEF: <IconShield size={18} stroke={2.4} />,
  ATQ: <IconSword size={18} stroke={2.4} />,
  RES: <IconBarbell size={18} stroke={2.4} />,
  RIQ: <IconCoins size={18} stroke={2.4} />,
  CON: <IconCalendarStats size={18} stroke={2.4} />,
  POD: <IconBolt size={18} stroke={2.4} />,
}

/** Las que salen de los cursos; el resto, del dinero y del equipo. */
const DE_LOS_CURSOS = new Set<ClaveEstadistica>(['VIT', 'DEF', 'ATQ', 'RES'])

const RADIO = 90
/** Dónde cae el 0, en fracción del radio. */
const BASE = 0.2
const SEGMENTOS = 10

/** El punto del eje `i` (de `n`) a `r` del centro; el primero, arriba. */
function punto(i: number, n: number, r: number): [number, number] {
  const angulo = (2 * Math.PI * i) / n
  return [r * Math.sin(angulo), -r * Math.cos(angulo)]
}

function poligono(n: number, radio: (i: number) => number): string {
  return Array.from({ length: n }, (_, i) =>
    punto(i, n, radio(i))
      .map((v) => v.toFixed(2))
      .join(','),
  ).join(' ')
}

const acotar = (v: number) => Math.min(100, Math.max(0, v))
const enRadio = (v: number) => RADIO * (BASE + ((1 - BASE) * acotar(v)) / 100)

/** Las etiquetas de la derecha empiezan en su punta, las de la izquierda acaban en ella. */
function anclaDe(x: number): 'start' | 'end' | 'middle' {
  if (x > 8) return 'start'
  if (x < -8) return 'end'
  return 'middle'
}

function Grafico({ estadisticas }: { estadisticas: readonly Estadistica[] }) {
  const n = estadisticas.length
  const valor = (i: number) => enRadio(estadisticas[i].valor)
  return (
    <svg className={styles.grafico} viewBox="-150 -132 300 270" aria-hidden="true">
      <polygon points={poligono(n, () => RADIO)} className={styles.fondoFuera} />
      <polygon points={poligono(n, () => enRadio(55))} className={styles.fondoDentro} />
      {[25, 50, 75].map((v) => (
        <polygon key={v} points={poligono(n, () => enRadio(v))} className={styles.anillo} />
      ))}
      <polygon points={poligono(n, () => enRadio(0))} className={styles.cero} />
      {estadisticas.map((e, i) => {
        const [x, y] = punto(i, n, RADIO)
        const [bx, by] = punto(i, n, enRadio(0))
        return <line key={e.clave} x1={bx} y1={by} x2={x} y2={y} className={styles.radio} />
      })}
      <polygon points={poligono(n, valor)} className={styles.valores} />
      {estadisticas.map((e, i) => {
        const [x, y] = punto(i, n, valor(i))
        return <circle key={e.clave} cx={x} cy={y} r={6} className={styles.punto} data-clave={e.clave} />
      })}
      {estadisticas.map((e, i) => {
        const [x, y] = punto(i, n, RADIO + 20)
        const ancla = anclaDe(x)
        return (
          <text key={e.clave} x={x} y={y} textAnchor={ancla} dominantBaseline="middle" className={styles.etiqueta}>
            <tspan className={styles.etiquetaClave}>{e.clave}</tspan>
            <tspan dx={5} className={styles.etiquetaValor}>
              {e.valor}
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}

function Fila({ e }: { e: Estadistica }) {
  const llenos = Math.ceil(acotar(e.valor) / SEGMENTOS)
  return (
    <div className={styles.fila} data-clave={e.clave}>
      <span className={styles.chip} aria-hidden="true">
        {ICONO[e.clave]}
      </span>
      <div className={styles.cuerpo}>
        <p className={styles.cabecera}>
          <span className={styles.nombre}>{e.nombre}</span>
          <span className={styles.clave}>{e.clave}</span>
          <span className={styles.valor}>{e.valor}</span>
        </p>
        <span className={styles.barra} aria-hidden="true">
          {Array.from({ length: SEGMENTOS }, (_, i) => (
            <span key={i} data-lleno={i < llenos || undefined} />
          ))}
        </span>
        <p className={styles.fuente}>{e.fuente}</p>
      </div>
    </div>
  )
}

function Ficha({ estadisticas, onCerrar }: { estadisticas: readonly Estadistica[]; onCerrar: () => void }) {
  const cursos = estadisticas.filter((e) => DE_LOS_CURSOS.has(e.clave))
  const resto = estadisticas.filter((e) => !DE_LOS_CURSOS.has(e.clave))
  const cruz = useRef<HTMLButtonElement>(null)

  // Al abrir, el foco va a la cruz: es la única salida.
  useEffect(() => cruz.current?.focus(), [])

  return (
    <div className={styles.fondo}>
      <div className={styles.ficha} role="dialog" aria-modal="true" aria-labelledby="ficha-heroe-titulo">
        <header className={styles.fichaCabecera}>
          <SketchTitle as="h2" className={styles.titulo}>
            <span id="ficha-heroe-titulo">Ficha del héroe</span>
          </SketchTitle>
          <button ref={cruz} type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar la ficha">
            <IconX size={18} stroke={2.6} />
          </button>
        </header>
        <div className={styles.columnas}>
          <section>
            <p className={styles.grupo}>De los cursos</p>
            {cursos.map((e) => (
              <Fila key={e.clave} e={e} />
            ))}
          </section>
          <section>
            <p className={styles.grupo}>De tu dinero y tu equipo</p>
            {resto.map((e) => (
              <Fila key={e.clave} e={e} />
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}

export function RadarHeroe({ estadisticas }: { estadisticas: readonly Estadistica[] }) {
  const [abierta, setAbierta] = useState(false)
  const info = useRef<HTMLButtonElement>(null)

  const cerrar = () => {
    setAbierta(false)
    // El foco vuelve a quien abrió la ficha, no al principio de la página.
    info.current?.focus()
  }

  useEffect(() => {
    if (!abierta) return
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setAbierta(false)
        info.current?.focus()
      }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [abierta])

  return (
    <section className={styles.radar} aria-label="Estadísticas">
      <Grafico estadisticas={estadisticas} />
      <button
        ref={info}
        type="button"
        className={styles.info}
        aria-label="Ver la ficha del héroe"
        aria-haspopup="dialog"
        aria-expanded={abierta}
        onClick={() => setAbierta(true)}
      >
        <IconInfoCircle size={20} stroke={2.2} />
      </button>
      <VisuallyHidden>
        <dl>
          {estadisticas.map((e) => (
            <div key={e.clave}>
              <dt>{e.nombre}</dt>
              <dd>{e.valor} de 100</dd>
              <dd>{e.fuente}</dd>
            </div>
          ))}
        </dl>
      </VisuallyHidden>
      {/* Sin comprobar si hay `document`: solo se abre tras un clic, ya en el navegador. */}
      {abierta && createPortal(<Ficha estadisticas={estadisticas} onCerrar={cerrar} />, document.body)}
    </section>
  )
}
