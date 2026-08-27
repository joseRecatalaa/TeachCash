/*
 * Los apuntes al margen del cuaderno: monedas, billetes, gráficas, hucha,
 * calculadora, cartera, recibos. Van en dos grises de lápiz (`--sp-lapiz` y
 * `--sp-lapiz-claro`) y muy tenues a propósito — tienen que notarse al mirar,
 * no al leer, y sobre todo no competir con el personaje.
 *
 * Cada dibujo se traza CENTRADO en (0,0) para poder colocarlo con un solo
 * `translate`. Las clases `d1`/`d2`/`d3` son las tres derivas lentas que les
 * da el módulo; repartirlos entre las tres evita que el fondo entero respire
 * a la vez, que es lo que delata el truco.
 */

import styles from './Splash.module.css'

const P = {
  stroke: 'var(--sp-lapiz)',
  strokeWidth: 2.6,
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const PT = {
  stroke: 'var(--sp-lapiz-claro)',
  strokeWidth: 2,
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const FORMAS = {
  moneda: (
    <>
      <ellipse cx="0" cy="6" rx="38" ry="12" {...P} />
      <path d="M-38,6 v-14 M38,6 v-14" {...P} />
      <ellipse cx="0" cy="-8" rx="38" ry="12" {...P} />
      <path d="M-9,-14 q0,-8 9,-8 q6,0 8,4 M-14,-9 h14 M-14,-4 h11" {...P} />
    </>
  ),
  billete: (
    <>
      <rect x="-62" y="-34" width="124" height="68" rx="7" {...P} />
      <rect x="-52" y="-24" width="104" height="48" rx="5" strokeDasharray="7 6" {...PT} />
      <circle cx="0" cy="0" r="15" {...P} />
      <path d="M-6,-6 q0,-7 7,-7 q5,0 6,4 M-10,-2 h12 M-10,3 h9" {...PT} />
      <path d="M-44,-14 h10 M-44,14 h10 M34,-14 h10 M34,14 h10" {...PT} />
    </>
  ),
  barras: (
    <>
      <path d="M-46,34 h94 M-46,34 v-72" {...P} />
      <rect x="-36" y="0" width="18" height="34" rx="3" {...P} />
      <rect x="-10" y="-20" width="18" height="54" rx="3" {...P} />
      <rect x="16" y="-40" width="18" height="74" rx="3" {...P} />
      <path d="M-36,-8 h18 M-10,-28 h18" {...PT} />
    </>
  ),
  linea: (
    <>
      <path d="M-52,32 h104 M-52,32 v-64" {...P} />
      <path d="M-42,18 L-16,-4 L6,10 L34,-24" {...P} />
      <circle cx="-42" cy="18" r="4.5" {...P} />
      <circle cx="-16" cy="-4" r="4.5" {...P} />
      <circle cx="6" cy="10" r="4.5" {...P} />
      <circle cx="34" cy="-24" r="4.5" {...P} />
      <path d="M28,-30 l10,-4 -2,11" {...PT} />
    </>
  ),
  quesito: (
    <>
      <circle cx="0" cy="0" r="36" {...P} />
      <path d="M0,0 V-36 M0,0 L31,18" {...P} />
      <path d="M0,-36 a36,36 0 0 1 31,54" strokeDasharray="5 5" {...PT} />
      <path d="M-30,20 a36,36 0 0 0 30,16" {...PT} />
    </>
  ),
  hucha: (
    <>
      <path
        d="M-44,4 q0,-26 26,-32 q10,-9 22,-2 q22,3 32,20 q10,2 12,12 q-2,10 -12,11 q-6,12 -20,17 l-2,12 h-13 l-2,-10 h-16 l-2,10 h-13 l-2,-14 q-10,-9 -10,-24 z"
        {...P}
      />
      <path d="M-8,-26 h20" {...P} />
      <circle cx="20" cy="0" r="3.5" {...P} />
      <path d="M-46,-2 q-10,-4 -8,-14 q8,2 10,10" {...PT} />
    </>
  ),
  euro: (
    <>
      <path d="M22,-26 q-30,-14 -44,10 q-10,18 -2,36 q12,24 44,12" {...P} strokeWidth={4} />
      <path d="M-32,-6 h34 M-32,8 h30" {...P} strokeWidth={4} />
    </>
  ),
  calculadora: (
    <>
      <rect x="-30" y="-42" width="60" height="84" rx="8" {...P} />
      <rect x="-21" y="-33" width="42" height="18" rx="4" {...PT} />
      <path
        d="M-19,-2 h10 M-4,-2 h10 M11,-2 h10 M-19,12 h10 M-4,12 h10 M11,12 h10 M-19,26 h10 M-4,26 h10 M11,26 h10"
        {...P}
      />
    </>
  ),
  flecha: (
    <>
      <path d="M-40,26 q22,-6 34,-26 q10,-18 30,-26" {...P} strokeWidth={3.2} />
      <path d="M8,-30 l18,4 -6,18" {...P} strokeWidth={3.2} />
    </>
  ),
  cartera: (
    <>
      <rect x="-46" y="-28" width="92" height="58" rx="9" {...P} />
      <path d="M-46,-10 h70 q10,0 10,10 v6 q0,10 -10,10 h-70" {...PT} />
      <circle cx="26" cy="3" r="5" {...P} />
      <path d="M-30,-28 q0,-12 14,-12 h34 q12,0 12,12" {...PT} />
    </>
  ),
  recibo: (
    <>
      <path d="M-26,-40 h52 v76 l-9,-7 -8,7 -9,-7 -8,7 -9,-7 -9,7 z" {...P} />
      <path d="M-16,-26 h32 M-16,-14 h32 M-16,-2 h20 M-16,10 h26" {...PT} />
    </>
  ),
} as const

type Forma = keyof typeof FORMAS

/** [forma, x, y, escala, giro, cuál de las tres derivas] */
const COMPOSICION: [Forma, number, number, number, number, 1 | 2 | 3][] = [
  ['billete', 150, 118, 1.1, -13, 1],
  ['moneda', 372, 92, 1.0, 0, 2],
  ['barras', 1268, 152, 1.15, 7, 3],
  ['quesito', 1078, 96, 0.95, -6, 1],
  ['euro', 640, 84, 1.0, -8, 2],
  ['linea', 118, 372, 1.05, 5, 3],
  ['hucha', 1310, 402, 1.1, -5, 2],
  ['moneda', 1150, 320, 0.8, 0, 1],
  ['calculadora', 96, 636, 0.95, 9, 2],
  ['billete', 1268, 640, 0.95, 11, 3],
  ['cartera', 300, 792, 1.0, -7, 1],
  ['recibo', 1078, 800, 0.9, 6, 2],
  ['flecha', 566, 828, 1.15, 0, 3],
  ['moneda', 862, 806, 0.85, 0, 1],
  ['euro', 1400, 520, 0.8, 12, 3],
  ['moneda', 44, 236, 0.7, 0, 2],
]

export function PencilBackdrop() {
  return (
    <svg
      className={styles.doodles}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {COMPOSICION.map(([forma, x, y, escala, giro, deriva], i) => (
        <g
          key={i}
          className={`dd d${deriva}`}
          transform={`translate(${x},${y}) rotate(${giro}) scale(${escala})`}
        >
          {FORMAS[forma]}
        </g>
      ))}
    </svg>
  )
}
