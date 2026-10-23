/*
 * La escena a píxel de la pantalla de carga: un "mundo 1" con el héroe.
 *
 * MEDIDAS QUE NO SE TOCAN A OJO
 *
 * El lienzo es de 192x108 píxeles de juego (16:9) y se escala con
 * `xMidYMax slice`: llena la pantalla recortando lo que sobre, pero siempre
 * pegado al SUELO. Por eso todo lo importante vive en la franja central: en
 * un móvil en vertical solo se ven unos 50 píxeles de ancho alrededor de
 * x = 96, y ahí tienen que caber el héroe, el billete y los destellos.
 *
 * El héroe (32x44) se apoya en x = 80, y = 48: centrado en 96 y con las botas
 * en la fila 91, justo encima del césped (`SUELO`). El billete flotante está
 * donde el billete sostenido queda con el salto en lo alto (12 px): si cambias
 * la altura del salto en el módulo, cambia `SALTO` aquí o agarrará aire.
 *
 * Las siluetas (montañas, colinas, sol) se generan con funciones puras al
 * cargar el módulo, no con `Math.random`: el servidor y el cliente tienen que
 * pintar exactamente lo mismo o React avisa de un desajuste de hidratación.
 */

import { PixelSprite } from './PixelSprite'
import styles from './Splash.module.css'
import {
  BILLETE,
  BOCA,
  BRAZO_ARRIBA,
  BRAZO_DER_ABAJO,
  BRAZO_IZQ_ABAJO,
  CUERPO,
  DESTELLO,
  NUBE,
  OJOS,
  OJOS_ARRIBA,
  PALETA_HEROE,
  PALETA_MUNDO,
  PIERNAS,
  PINO,
} from './sprites'

const ANCHO = 192
const ALTO = 108
const SUELO = 92
const HEROE_X = 80
const HEROE_Y = 48
/** Lo que sube el salto, en píxeles. Lo mismo que el pico de `px-salto`. */
const SALTO = 12

/** Columnas de alturas → un trazo, juntando las columnas iguales vecinas. */
function silueta(alto: (x: number) => number, base: number): string {
  let d = ''
  let x = 0
  while (x < ANCHO) {
    const h = Math.max(0, alto(x))
    let fin = x + 1
    while (fin < ANCHO && Math.max(0, alto(fin)) === h) fin++
    if (h > 0) d += `M${x} ${base - h}h${fin - x}v${h}h-${fin - x}z`
    x = fin
  }
  return d
}

const PICOS = [
  { cx: 18, h: 34 },
  { cx: 62, h: 26 },
  { cx: 124, h: 40 },
  { cx: 172, h: 31 },
] as const

function picoDominante(x: number) {
  return PICOS.reduce((mejor, p) =>
    p.h - Math.abs(x - p.cx) > mejor.h - Math.abs(x - mejor.cx) ? p : mejor,
  )
}
const alturaMontana = (x: number) => {
  const p = picoDominante(x)
  return p.h - Math.abs(x - p.cx)
}
/** La ladera de la derecha va en sombra: es lo que da volumen con dos tonos. */
const alturaSombra = (x: number) => (x > picoDominante(x).cx ? alturaMontana(x) : 0)
/** Nieve: lo que asoma por encima de esta fila. */
const LINEA_NIEVE = 60

function lomas(lista: readonly { cx: number; w: number; h: number }[]) {
  return (x: number) =>
    Math.max(
      0,
      ...lista.map(({ cx, w, h }) => {
        const t = (x - cx) / w
        return Math.abs(t) >= 1 ? 0 : Math.round(h * Math.sqrt(1 - t * t))
      }),
    )
}
const colinaLejos = lomas([
  { cx: 8, w: 42, h: 22 },
  { cx: 74, w: 46, h: 15 },
  { cx: 146, w: 52, h: 24 },
  { cx: 196, w: 32, h: 17 },
])
const colinaCerca = lomas([
  { cx: 38, w: 36, h: 9 },
  { cx: 112, w: 42, h: 7 },
  { cx: 172, w: 30, h: 11 },
])

const PINOS = [6, 22, 136, 150, 160].map((x) => ({ x, y: SUELO - colinaLejos(x + 4) - 12 }))

function circulo(cx: number, cy: number, r: number): string {
  let d = ''
  for (let dy = -r; dy <= r; dy++) {
    const m = Math.round(Math.sqrt(r * r - dy * dy))
    d += `M${cx - m} ${cy + dy}h${m * 2 + 1}v1h-${m * 2 + 1}z`
  }
  return d
}

/** Las mismas posiciones en claro y en oscuro; en claro se pintan transparentes. */
const ESTRELLAS = [
  [12, 8], [34, 20], [50, 6], [70, 14], [88, 4], [104, 22], [118, 9],
  [138, 30], [176, 8], [186, 24], [26, 36], [160, 40], [8, 50], [96, 34],
] as const

const NUBES = [
  { x: 14, y: 12, clase: styles.nube1 },
  { x: 108, y: 6, clase: styles.nube2 },
  { x: 160, y: 46, clase: styles.nube3 },
] as const

const PUNTAS_CESPED = [4, 19, 41, 58, 67, 122, 131, 149, 166, 183]

const DESTELLOS_COGER = [
  [-10, -21],
  [15, -26],
  [3, -29],
] as const

export function PixelScene() {
  const brillo = (x: number, y: number, clase: string) => (
    <g key={`${x},${y}`} transform={`translate(${x - 2} ${y - 2})`}>
      <g className={clase}>
        <PixelSprite sprite={DESTELLO} paleta={PALETA_HEROE} className={styles.titila} />
      </g>
    </g>
  )

  return (
    <svg
      className={styles.escena}
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <defs>
        {/* El tramado entre dos bandas de cielo: la transición de color de las
            consolas de 16 bits, que no tenían degradados. */}
        <pattern id="px-trama-1" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="var(--px-cielo-2)" />
          <rect width="1" height="1" fill="var(--px-cielo-1)" />
          <rect x="1" y="1" width="1" height="1" fill="var(--px-cielo-1)" />
        </pattern>
        <pattern id="px-trama-2" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="var(--px-cielo-3)" />
          <rect width="1" height="1" fill="var(--px-cielo-2)" />
          <rect x="1" y="1" width="1" height="1" fill="var(--px-cielo-2)" />
        </pattern>
        <pattern id="px-tierra" width="16" height="8" patternUnits="userSpaceOnUse">
          <rect width="16" height="8" fill="var(--px-tierra)" />
          <rect x="2" y="2" width="3" height="2" fill="var(--px-piedra)" />
          <rect x="10" y="5" width="4" height="2" fill="var(--px-piedra)" />
          <rect x="13" y="1" width="1" height="1" fill="var(--px-tierra-sombra)" />
          <rect x="6" y="6" width="1" height="1" fill="var(--px-tierra-sombra)" />
          <rect x="2" y="4" width="3" height="1" fill="var(--px-tierra-sombra)" />
          <rect x="10" y="7" width="4" height="1" fill="var(--px-tierra-sombra)" />
        </pattern>
      </defs>

      {/* ── Cielo ─────────────────────────────────────────────────────── */}
      <rect width={ANCHO} height="34" fill="var(--px-cielo-1)" />
      <rect y="34" width={ANCHO} height="4" fill="url(#px-trama-1)" />
      <rect y="38" width={ANCHO} height="18" fill="var(--px-cielo-2)" />
      <rect y="56" width={ANCHO} height="4" fill="url(#px-trama-2)" />
      <rect y="60" width={ANCHO} height={SUELO - 60} fill="var(--px-cielo-3)" />

      <path
        d={ESTRELLAS.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')}
        fill="var(--px-estrella)"
        className={styles.estrellas}
      />
      <path d={circulo(152, 18, 8)} fill="var(--px-astro)" />
      <path d={circulo(150, 16, 4)} fill="var(--px-astro-luz)" />

      {NUBES.map(({ x, y, clase }) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <PixelSprite sprite={NUBE} paleta={PALETA_MUNDO} className={clase} />
        </g>
      ))}

      {/* ── Montañas y colinas ────────────────────────────────────────── */}
      <path d={silueta(alturaMontana, SUELO)} fill="var(--px-montana)" />
      <path d={silueta(alturaSombra, SUELO)} fill="var(--px-montana-sombra)" />
      <path
        d={silueta((x) => alturaMontana(x) - (SUELO - LINEA_NIEVE), LINEA_NIEVE)}
        fill="var(--px-nieve)"
      />
      <path d={silueta(colinaLejos, SUELO)} fill="var(--px-colina)" />
      {PINOS.map(({ x, y }) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <PixelSprite sprite={PINO} paleta={PALETA_MUNDO} />
        </g>
      ))}
      <path d={silueta(colinaCerca, SUELO)} fill="var(--px-colina-cerca)" />

      {/* ── Suelo ─────────────────────────────────────────────────────── */}
      <path
        d={PUNTAS_CESPED.map((x) => `M${x} ${SUELO - 1}h1v1h-1zM${x + 2} ${SUELO - 2}h1v2h-1z`).join('')}
        fill="var(--px-cesped)"
      />
      <rect y={SUELO} width={ANCHO} height="1" fill="var(--px-cesped-luz)" />
      <rect y={SUELO + 1} width={ANCHO} height="3" fill="var(--px-cesped)" />
      <rect y={SUELO + 4} width={ANCHO} height={ALTO - SUELO - 4} fill="url(#px-tierra)" />
      {/* El borde del césped gotea sobre la tierra: sin esto el corte es
          una regla y parece un rectángulo pegado, no un suelo. */}
      <path
        d={Array.from({ length: ANCHO / 4 }, (_, i) => `M${i * 4 + (i % 3)} ${SUELO + 4}h2v${1 + (i % 2)}h-2z`).join('')}
        fill="var(--px-cesped-sombra)"
      />

      {/* ── El héroe ──────────────────────────────────────────────────── */}
      <g transform={`translate(${HEROE_X} ${HEROE_Y})`}>
        <path d="M8 44h16v1h-16zM6 45h20v1h-20z" fill="var(--px-sombra)" className={styles.sombraSuelo} />

        <g transform={`translate(0 ${-SALTO})`}>
          <g className={styles.flota}>
            <g className={styles.gira}>
              <PixelSprite sprite={BILLETE} paleta={PALETA_HEROE} />
            </g>
          </g>
        </g>

        <g className={styles.salta}>
          <PixelSprite sprite={PIERNAS} paleta={PALETA_HEROE} />
          <g className={styles.respira}>
            <PixelSprite sprite={CUERPO} paleta={PALETA_HEROE} />
            <PixelSprite sprite={BRAZO_IZQ_ABAJO} paleta={PALETA_HEROE} className={styles.brazoIzq} />
            <PixelSprite sprite={BRAZO_DER_ABAJO} paleta={PALETA_HEROE} />
            <PixelSprite sprite={OJOS} paleta={PALETA_HEROE} className={styles.ojos} />
            <PixelSprite sprite={OJOS_ARRIBA} paleta={PALETA_HEROE} className={styles.ojosArriba} />
            <PixelSprite sprite={BOCA} paleta={PALETA_HEROE} />
            <g className={styles.lleva}>
              <PixelSprite sprite={BILLETE} paleta={PALETA_HEROE} />
              <PixelSprite sprite={BRAZO_ARRIBA} paleta={PALETA_HEROE} />
            </g>
          </g>
        </g>

        {DESTELLOS_COGER.map(([x, y]) => brillo(x, y, styles.brilloCoger))}
      </g>
    </svg>
  )
}
