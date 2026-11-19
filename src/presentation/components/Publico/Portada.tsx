/*
 * La portada pública: lo que ve quien llega a www.teachcash.es sin sesión, y
 * lo que lee Google.
 *
 * Es la pantalla de título de un videojuego, no un folleto: poco texto,
 * dibujos grandes que se mueven y todo en el espacio (la noche la pone el
 * marco, `MarcoPublico`; cada sección lleva su propio cielo de estrellas).
 * Cada sección dice UNA cosa y la enseña:
 *
 *   1. Qué es: una pantalla de título. El lema centrado como rótulo de
 *      recreativa y, debajo, el héroe en su isla a la izquierda y la frase y
 *      el botón de jugar (entre flechas) a la derecha.
 *   2. Por qué: un dato oficial en una tarjeta dorada, con sus huchas.
 *   3. Los mundos: el héroe salta de planeta en planeta (`SaltoMundos`).
 *   4. Cómo se juega: los tres pasos y el combate contra el jefe (`Batalla`).
 *   5. Lo que se gana: el probador, lo único que se toca.
 *   6. La invitación.
 *   7. Las preguntas (las mismas del `FAQPage`: no se pueden quitar de aquí).
 *
 * Las cifras salen del contenido (`resumir`): ninguna va escrita a mano. Todo
 * se pinta en el servidor y se anima con CSS; lo único de cliente es el
 * probador. Con el movimiento reducido cada escena se queda en una pose
 * entera.
 */

import Link from 'next/link'
import type { Route } from 'next'
import { LEMA, RUTA_CURSOS } from '@/lib/seo'
import type { MundoPublicoDto } from '@/src/types/heroe.types'
import { EscenarioHeroe } from '../Pixel/EscenarioHeroe'
import { PixelHero } from '../Pixel/PixelHero'
import { CERDITO, LIBRO, MANDO, MONSTRUO } from '../Pixel/sprites'
import { Batalla } from './Batalla'
import { Cielo } from './Cielo'
import { DibujoPixel } from './DibujoPixel'
import { EnlaceCompleto } from './EnlaceCompleto'
import { RUTA_JUGAR } from './MarcoPublico'
import { PREGUNTAS } from './preguntas'
import { Probador } from './Probador'
import { enLetra, resumir } from './resumen'
import { SaltoMundos } from './SaltoMundos'
import escenas from './escenas.module.css'
import styles from './Portada.module.css'

/** El héroe de la portada, con algo de equipo: se ve que se gana algo. */
const EQUIPO_PORTADA = ['casco-media', 'espada-media', 'escudo-basica', 'botas-basica', 'alas-basica']

const EQUIPO_FINAL = ['casco-alta', 'armadura-alta', 'espada-alta', 'escudo-alta', 'botas-alta', 'alas-alta']

/** El lema en dos tamaños: lo que se busca, enorme; el resto, debajo. */
const CORTE = LEMA.indexOf(' al ')
const LEMA_GRANDE = CORTE > 0 ? LEMA.slice(0, CORTE) : LEMA
const LEMA_RESTO = CORTE > 0 ? LEMA.slice(CORTE + 1) : ''

/**
 * Las huchas del dato: 4 de cada 11 vacías es un 36,4 %, la misma cifra que
 * se cuenta al lado. Si cambia el dato, cambia la proporción.
 */
const HUCHAS = 11
const HUCHAS_VACIAS = 4

/** Una flecha a píxel hacia la derecha: dos columnas de grosor, siete de alto. */
const FLECHA = 'M0 0h2v1h-2zM1 1h2v1h-2zM2 2h2v1h-2zM3 3h2v1h-2zM2 4h2v1h-2zM1 5h2v1h-2zM0 6h2v1h-2z'

/**
 * El botón de jugar, a píxel. Un `<a>` que recarga (`EnlaceCompleto`): cruza
 * de la portada a la aplicación, que se monta al CARGAR.
 */
function Jugar({ children = 'Jugar gratis' }: { children?: string }) {
  return (
    <EnlaceCompleto href={RUTA_JUGAR} rel="nofollow" className={styles.jugar}>
      <span className={styles.jugarFlecha} aria-hidden="true">
        ▶
      </span>
      {children}
    </EnlaceCompleto>
  )
}

/**
 * Tres flechas que se encienden una tras otra hacia el botón: las de la
 * izquierda apuntan a la derecha y las de la derecha, volteadas, a la
 * izquierda. El orden del encendido también se invierte, para que las dos
 * filas avancen hacia el botón.
 */
function Flechas({ hacia = 'der' }: { hacia?: 'der' | 'izq' }) {
  return (
    <span className={styles.flechas} data-hacia={hacia} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 5 7" width={15} height={21} shapeRendering="crispEdges" data-flecha={i}>
          <path d={FLECHA} />
        </svg>
      ))}
    </span>
  )
}

export function Portada({ mundos }: { mundos: readonly MundoPublicoDto[] }) {
  const r = resumir(mundos)

  return (
    <div className={styles.portada}>
      {/* ── 1. La pantalla de título ──────────────────────────────────── */}
      <section className={styles.titulo} aria-labelledby="titulo-portada">
        <Cielo />
        <div className={`${styles.ancho} ${styles.tituloCuerpo}`}>
          <h1 id="titulo-portada" className={styles.h1}>
            <span className={styles.h1Grande}>{LEMA_GRANDE}</span>{' '}
            <span className={styles.h1Resto}>{LEMA_RESTO}</span>
          </h1>

          {/* Debajo del título, el héroe a la izquierda y la invitación a la
              derecha. */}
          <div className={styles.escenaTitulo}>
            <div className={styles.tituloDibujo}>
              {/* Dos tamaños y no uno escalado por CSS: a una escala que no es
                  entera, el píxel se emborrona (`EscenarioHeroe`). */}
              <div className={styles.soloMovil}>
                <EscenarioHeroe equipo={EQUIPO_PORTADA} escala={3} />
              </div>
              <div className={styles.soloAncho}>
                <EscenarioHeroe equipo={EQUIPO_PORTADA} escala={4} />
              </div>
            </div>
            <div className={styles.invitacion}>
              {/* Lo dice el héroe: un bocadillo de juego de rol, con la cola
                  hacia él y el ▼ de "sigue" parpadeando. */}
              <p className={styles.bocadillo}>
                Aprende, practica, entiende. Nivel a nivel.
                <span className={styles.sigue} aria-hidden="true">
                  ▼
                </span>
              </p>
              <div className={styles.llamadas}>
                <Flechas />
                <Jugar />
                <Flechas hacia="izq" />
              </div>
              <Link href={RUTA_CURSOS as Route} className={styles.verCursos}>
                Ver los cursos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Por qué ────────────────────────────────────────────────── */}
      <section className={styles.seccion} aria-labelledby="titulo-porque">
        <Cielo semilla={11} cuantas={40} />
        <div className={styles.ancho}>
          <div className={styles.dato}>
            <p className={styles.cifra}>36,4 %</p>
            <div className={styles.datoTexto}>
              <h2 id="titulo-porque" className={styles.datoTitulo}>
                Nadie nos enseñó a manejar el dinero
              </h2>
              <p className={styles.datoFrase}>
                Más de un tercio de la gente en España no podría pagar un gasto imprevisto con sus ahorros.
              </p>
              <div className={styles.huchas} aria-hidden="true">
                {Array.from({ length: HUCHAS }, (_, i) => (
                  <DibujoPixel
                    key={i}
                    sprite={CERDITO}
                    escala={3}
                    className={i < HUCHAS_VACIAS ? styles.huchaVacia : styles.hucha}
                  />
                ))}
              </div>
              <p className={styles.fuente}>INE, Encuesta de Condiciones de Vida 2025</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Los mundos ─────────────────────────────────────────────── */}
      <section id="mundos" className={styles.seccion} aria-labelledby="titulo-mundos">
        <Cielo semilla={31} cuantas={70} />
        <div className={styles.ancho}>
          <h2 id="titulo-mundos" className={`${styles.h2} ${styles.centrado}`}>
            Salta de mundo en mundo, empieza por el que quieras
          </h2>
          <SaltoMundos mundos={mundos} />
        </div>
      </section>

      {/* ── 4. Cómo se juega ──────────────────────────────────────────── */}
      <section id="como-se-juega" className={styles.seccion} aria-labelledby="titulo-como">
        <Cielo semilla={23} cuantas={50} />
        <div className={styles.ancho}>
          {/* Sin título a la vista (la escena lo cuenta sola), pero la
              sección sigue teniendo nombre para quien la oye. */}
          <h2 id="titulo-como" className={styles.oculto}>
            Cómo se juega: aprende, practica y derrota al jefe
          </h2>
          <div className={styles.como}>
            <ol className={styles.pasos}>
              <li className={styles.paso}>
                <DibujoPixel sprite={LIBRO} escala={4} className={styles.pasoIcono} />
                <span>
                  <strong className={styles.pasoNombre}>Aprende</strong>
                  Lecciones de {r.minutosMin} a {r.minutosMax} minutos.
                </span>
              </li>
              <li className={styles.paso}>
                <DibujoPixel sprite={MANDO} escala={4} className={styles.pasoIcono} />
                <span>
                  <strong className={styles.pasoNombre}>Practica</strong>
                  Casos reales, corregidos al momento.
                </span>
              </li>
              <li className={styles.paso}>
                <DibujoPixel
                  sprite={MONSTRUO}
                  escala={2}
                  decorado={mundos[0]?.decorado}
                  className={`${styles.pasoIcono} ${escenas.jefeVivo}`}
                />
                <span>
                  <strong className={styles.pasoNombre}>Vence</strong>
                  Al jefe del mundo, con lo aprendido.
                </span>
              </li>
            </ol>
            <Batalla mundo={mundos[0]} />
          </div>
        </div>
      </section>

      {/* ── 5. Lo que se gana ─────────────────────────────────────────── */}
      <section className={styles.seccion} aria-labelledby="titulo-probador">
        <Cielo semilla={41} cuantas={40} />
        <div className={styles.ancho}>
          <h2 id="titulo-probador" className={`${styles.h2} ${styles.centrado}`}>
            Gana estrellas y viste a tu héroe
          </h2>
          <Probador estrellasPosibles={r.estrellas} />
        </div>
      </section>

      {/* ── 6. La invitación ──────────────────────────────────────────── */}
      <section className={styles.final} aria-labelledby="titulo-final">
        <Cielo semilla={53} cuantas={60} />
        <div className={`${styles.ancho} ${styles.finalCuerpo}`}>
          <svg
            className={styles.finalHeroe}
            viewBox="-24 -12 80 60"
            width={80 * 3}
            height={60 * 3}
            shapeRendering="crispEdges"
            aria-hidden="true"
          >
            <PixelHero pose="celebra" equipo={EQUIPO_FINAL} />
          </svg>
          <p className={styles.pulsa} aria-hidden="true">
            Pulsa start
          </p>
          <h2 id="titulo-final" className={styles.h2Final}>
            {r.primero ? `Tu primera lección dura ${enLetra(r.primero.minutos)} minutos` : 'Tu primera lección te espera'}
          </h2>
          <Jugar>Empezar ahora</Jugar>
        </div>
      </section>

      {/* ── 7. Preguntas ──────────────────────────────────────────────── */}
      <section id="preguntas" className={styles.seccion} aria-labelledby="titulo-preguntas">
        <Cielo semilla={83} cuantas={40} />
        <div className={`${styles.ancho} ${styles.preguntas}`}>
          <h2 id="titulo-preguntas" className={styles.h2}>
            Preguntas
          </h2>
          <div className={styles.lista}>
            {PREGUNTAS.map((p) => (
              <details key={p.pregunta} className={styles.pregunta}>
                <summary>{p.pregunta}</summary>
                <p>{p.respuesta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
