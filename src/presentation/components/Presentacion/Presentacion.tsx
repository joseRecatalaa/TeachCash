'use client'

/*
 * El proyector de la presentación: enseña una pantalla de 1920x1080 cada vez,
 * escalada para que quepa entera en la ventana, y se maneja como un juego.
 *
 *   - Flechas, espacio, Re Pág/Av Pág, Inicio y Fin para moverse.
 *   - F pone la pantalla completa; N enseña las notas de quien presenta.
 *   - La pantalla va en el hash (`#7`): recargar no te devuelve a la portada y
 *     se puede enlazar una diapositiva concreta.
 *
 * Solo se monta la pantalla de turno, y con su número como `key`: así cada
 * una arranca sus animaciones al entrar, como una escena nueva.
 *
 * En modo `imprimir` no hay proyector: salen todas, una debajo de otra y sin
 * escalar, cada una en su página de 1920x1080. Es lo que lee el script de
 * exportación (`scripts/exportar-presentacion.mts`) para sacar el PDF.
 *
 * La escala se escribe con `style.setProperty` y no con un `style` en el JSX:
 * depende de la ventana, que el servidor no conoce, y así el primer pintado
 * del servidor y el del cliente no discuten.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import { MONEDA, PALETA_CAMINO } from '../Pixel/sprites'
import escenas from '../Publico/escenas.module.css'
import styles from './Presentacion.module.css'

export const ANCHO_DIAPO = 1920
export const ALTO_DIAPO = 1080

export interface Diapositiva {
  id: string
  /** El nombre corto, para el lector de pantalla y el contador. */
  nombre: string
  contenido: ReactNode
  /** Lo que digo yo mientras está en pantalla. */
  notas: string
}

const leerHash = (total: number): number => {
  const n = Number.parseInt(window.location.hash.slice(1), 10)
  return Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : 0
}

function Marcador({ actual, total }: { actual: number; total: number }) {
  return (
    <div className={styles.hud} aria-hidden="true">
      <span className={styles.hudMarca}>
        <svg viewBox="0 0 5 5" width={30} height={30} shapeRendering="crispEdges">
          <g className={pixel.paletaCamino}>
            <PixelSprite sprite={MONEDA} paleta={PALETA_CAMINO} />
          </g>
        </svg>
        TeachCash
      </span>
      <span className={styles.hudBarra}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} data-hecho={i <= actual || undefined} />
        ))}
      </span>
      <span className={styles.hudNivel}>
        NIVEL {String(actual + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
      </span>
    </div>
  )
}

export function Presentacion({ diapositivas, imprimir }: { diapositivas: readonly Diapositiva[]; imprimir: boolean }) {
  const total = diapositivas.length
  const [actual, setActual] = useState(0)
  const [notas, setNotas] = useState(false)
  const escenario = useRef<HTMLDivElement>(null)

  const ir = useCallback(
    (n: number) => {
      const destino = Math.min(Math.max(n, 0), total - 1)
      setActual(destino)
      window.history.replaceState(null, '', `#${destino + 1}`)
    },
    [total],
  )

  // La diapositiva del hash, al entrar y si alguien cambia la dirección a mano.
  useEffect(() => {
    if (imprimir) return
    const alCambiar = () => setActual(leerHash(total))
    alCambiar()
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [imprimir, total])

  // A la mayor escala que cabe en la ventana, sin recortar nada.
  useEffect(() => {
    if (imprimir) return
    const ajustar = () => {
      const escala = Math.min(window.innerWidth / ANCHO_DIAPO, window.innerHeight / ALTO_DIAPO)
      escenario.current?.style.setProperty('--escala', String(escala))
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [imprimir])

  useEffect(() => {
    if (imprimir) return
    const alTeclear = (e: KeyboardEvent) => {
      // Dentro de un botón (el probador), el espacio y Enter son del botón.
      const enBoton = e.target instanceof HTMLElement && e.target.closest('button')
      if (['ArrowRight', 'PageDown'].includes(e.key) || (e.key === ' ' && !enBoton)) {
        e.preventDefault()
        ir(actual + 1)
      } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        ir(actual - 1)
      } else if (e.key === 'Home') ir(0)
      else if (e.key === 'End') ir(total - 1)
      else if (e.key === 'n' || e.key === 'N') setNotas((v) => !v)
      else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void document.documentElement.requestFullscreen?.()
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [actual, imprimir, ir, total])

  if (imprimir) {
    return (
      <div className={`${escenas.noche} ${styles.impreso}`}>
        {diapositivas.map((d, i) => (
          <section key={d.id} className={styles.escenario} aria-label={d.nombre} data-diapositiva={i + 1}>
            {d.contenido}
            <Marcador actual={i} total={total} />
          </section>
        ))}
      </div>
    )
  }

  const diapo = diapositivas[actual]

  return (
    <div className={`${escenas.noche} ${styles.proyector}`}>
      <div ref={escenario} className={styles.escenario}>
        <section
          key={diapo.id}
          className={styles.entra}
          aria-roledescription="diapositiva"
          aria-label={`${actual + 1} de ${total}: ${diapo.nombre}`}
        >
          {diapo.contenido}
        </section>
        <Marcador actual={actual} total={total} />
      </div>

      <nav className={styles.mandos} aria-label="Diapositivas">
        <button type="button" onClick={() => ir(actual - 1)} disabled={actual === 0} aria-label="Anterior">
          ◀
        </button>
        <button type="button" onClick={() => ir(actual + 1)} disabled={actual === total - 1} aria-label="Siguiente">
          ▶
        </button>
      </nav>

      {notas && (
        <aside className={styles.notas} aria-label="Notas">
          <strong>{diapo.nombre}</strong>
          <p>{diapo.notas}</p>
        </aside>
      )}
    </div>
  )
}
