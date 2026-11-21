/*
 * Las pantallas de la presentación del proyecto, en el orden en que se cuentan.
 *
 * Están hechas con las piezas del juego, no con capturas: el héroe, los
 * planetas, los jefes, el combate y el probador son los mismos componentes de
 * la portada y del Camino. Si mañana cambia un sprite, la presentación cambia
 * con él.
 *
 * Las cifras del juego (mundos, niveles, estrellas, minutos, jefes) salen del
 * contenido (`resumir`), como en la portada: ninguna va escrita a mano. Las del
 * panel de Patrimonio son un ejemplo, y lo dicen ("las cuentas de Pepito").
 *
 * Los textos van en primera persona y como hablo: esto lo cuento yo.
 */

import { HUECOS } from '@/lib/tienda'
import { formatMoney, formatMoneySigned } from '@/lib/format'
import { DIVISA_APP, money } from '@/lib/money'
import type { MundoPublicoDto, TipoNivel } from '@/src/types/heroe.types'
import caminoStyles from '../Heroe/CaminoMundo.module.css'
import { circulo } from '../Pixel/geometria'
import { EscenarioHeroe } from '../Pixel/EscenarioHeroe'
import { PixelHero } from '../Pixel/PixelHero'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import {
  CANDADO,
  CERDITO,
  CORAZON,
  ESCUDO,
  ESTRELLA,
  LIBRO,
  MANDO,
  MONEDA,
  MONSTRUO,
  PALETA_CAMINO,
  PALETA_ESTRELLA_VACIA,
  type Sprite,
} from '../Pixel/sprites'
import { Batalla } from '../Publico/Batalla'
import { Cielo } from '../Publico/Cielo'
import { DibujoPixel } from '../Publico/DibujoPixel'
import escenas from '../Publico/escenas.module.css'
import { PlanetaPixel } from '../Publico/PlanetaPixel'
import { Probador } from '../Publico/Probador'
import { medida, resumir } from '../Publico/resumen'
import { SaltoMundos } from '../Publico/SaltoMundos'
import type { Diapositiva } from './Presentacion'
import { QR_LADO, QR_TEACHCASH } from './qr'
import styles from './Presentacion.module.css'

const AUTOR = 'Jose Recatalá Pesudo'
/** La escuela del máster. */
const ESCUELA = 'The Big School'

const EQUIPO_TITULO = ['casco-media', 'espada-media', 'escudo-basica', 'botas-basica', 'alas-basica']
const EQUIPO_CAMINO = ['casco-media', 'espada-media', 'botas-basica']
const EQUIPO_CORRE = ['casco-basica', 'espada-basica', 'botas-basica', 'alas-basica']
const EQUIPO_TODO = ['casco-alta', 'armadura-alta', 'guantes-alta', 'botas-alta', 'espada-alta', 'escudo-alta', 'alas-alta']
const EQUIPO_FINAL = ['casco-alta', 'armadura-alta', 'espada-alta', 'escudo-alta', 'botas-alta', 'alas-alta']

/* ── Piezas pequeñas ───────────────────────────────────────────────────── */

function Etiqueta({ children }: { children: string }) {
  return <p className={styles.etiqueta}>{children}</p>
}

/**
 * El ∞ dibujado a píxel: la letra de píxel no lo tiene, y el de la fuente de
 * repuesto sale con otra línea base y otro trazo.
 */
function Infinito() {
  return (
    <svg
      className={styles.infinito}
      viewBox="0 0 9 5"
      width={9 * 5}
      height={5 * 5}
      shapeRendering="crispEdges"
      role="img"
      aria-label="infinitas"
    >
      <path d="M1 0h2v1h-2zM6 0h2v1h-2zM0 1h1v3h-1zM3 1h1v1h-1zM5 1h1v1h-1zM8 1h1v3h-1zM4 2h1v1h-1zM3 3h1v1h-1zM5 3h1v1h-1zM1 4h2v1h-2zM6 4h2v1h-2z" />
    </svg>
  )
}

/* ── El elefante en la habitación ──────────────────────────────────────────
 * Un elefante a píxel hecho de rectángulos en píxeles de juego, mirando a la
 * derecha: primero el contorno de cada parte (un píxel más grande por cada
 * lado) y encima los rellenos, así las partes se funden sin líneas por dentro.
 * La oreja es la excepción: va delante, con su contorno, para que se lea.
 * Los colores salen de la noche (`.elefante*` en el módulo), no de una paleta
 * de sprite: es un dibujo de una sola pantalla.
 */

type Trozo = readonly [x: number, y: number, ancho: number, alto: number]

const CUERPO: readonly Trozo[] = [
  [3, 7, 19, 10],
  [5, 5, 15, 2],
  [4, 16, 4, 6],
  [9, 16, 4, 6],
  [15, 16, 4, 6],
  [19, 16, 4, 5],
  [21, 3, 8, 10],
  [23, 2, 5, 1],
  [26, 12, 3, 6],
  [27, 17, 3, 3],
  [29, 18, 2, 2],
  [1, 9, 2, 1],
  [0, 10, 1, 2],
]
/** La oreja, por filas: ancha arriba y redondeada hacia abajo, como un abanico. */
const OREJA: readonly Trozo[] = [
  [17, 4, 5, 1],
  [16, 5, 7, 6],
  [17, 11, 5, 2],
  [18, 13, 3, 1],
]
const OREJA_SOMBRA: readonly Trozo[] = [
  [16, 6, 2, 5],
  [17, 11, 2, 1],
]
const OREJA_LUZ: Trozo = [18, 5, 3, 1]
const LUZ: readonly Trozo[] = [
  [6, 6, 10, 1],
  [22, 3, 4, 1],
]
const SOMBRA: readonly Trozo[] = [
  [4, 15, 17, 1],
  [16, 13, 6, 1],
]
const OJO: Trozo = [25, 6, 1, 2]
const COLMILLO: Trozo = [25, 13, 2, 1]

const rects = (trozos: readonly Trozo[], className: string, borde = 0) =>
  trozos.map(([x, y, w, h], i) => (
    <rect key={i} x={x - borde} y={y - borde} width={w + borde * 2} height={h + borde * 2} className={className} />
  ))

function Elefante() {
  return (
    <svg
      className={styles.elefante}
      viewBox="-1 1 33 22"
      width={33 * 14}
      height={22 * 14}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Un elefante enorme en medio de la habitación"
    >
      {rects(CUERPO, styles.elefanteContorno, 1)}
      {rects(CUERPO, styles.elefanteCuerpo)}
      {rects(SOMBRA, styles.elefanteSombra)}
      {rects(LUZ, styles.elefanteLuz)}
      {/* La oreja va ENCIMA del cuerpo y con su propio contorno: si no, se
          funde con él y parece una puerta. */}
      {rects(OREJA, styles.elefanteContorno, 1)}
      {rects(OREJA, styles.elefanteOreja)}
      {rects(OREJA_SOMBRA, styles.elefanteSombra)}
      {rects([OREJA_LUZ], styles.elefanteLuz)}
      {rects([OJO], styles.elefanteContorno)}
      {rects([COLMILLO], styles.elefanteColmillo)}
    </svg>
  )
}

/** Lo que nadie nos explicó: flotan alrededor del elefante como preguntas. */
const DESCONOCIDOS = ['TIN', 'TAE', 'IPC', 'IRPF', 'Euríbor', 'Facturas']

/* ── El camino, en horizontal ──────────────────────────────────────────────
 * El del juego sube de abajo arriba porque se lee en el móvil; en una pantalla
 * apaisada va de izquierda a derecha. Los nodos y el jefe se pintan con las
 * mismas clases que `CaminoMundo`: dos hechos con sus estrellas, el tercero
 * latiendo con el héroe encima y el resto con candado.
 */

const CAMINO = { ancho: 480, alto: 120, inicio: 36, paso: 52 }
const ZIGZAG = [74, 56, 74, 92]
const RADIO = 11
const ICONO: Record<Exclude<TipoNivel, 'jefe'>, Sprite> = { lectura: LIBRO, interactivo: MANDO }
const HECHOS = 2

/**
 * El jefe no sale apagado como en el juego (allí, bloqueado, va en gris): en
 * una diapositiva tiene que dar miedo. `acecha` no casa con ninguna regla de
 * `CaminoMundo.module.css`, así que se pinta con su color y sin halo.
 */
function estadoDe(i: number, total: number): 'hecho' | 'disponible' | 'bloqueado' | 'acecha' {
  if (i < HECHOS) return 'hecho'
  if (i === HECHOS) return 'disponible'
  return i === total - 1 ? 'acecha' : 'bloqueado'
}

function Centrado({ sprite, paleta = PALETA_CAMINO }: { sprite: Sprite; paleta?: typeof PALETA_CAMINO }) {
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length
  return (
    <g transform={`translate(${-Math.floor(ancho / 2)} ${-Math.floor(alto / 2)})`}>
      <PixelSprite sprite={sprite} paleta={paleta} />
    </g>
  )
}

function CaminoApaisado({ mundo }: { mundo: MundoPublicoDto }) {
  const niveles = mundo.niveles
  const puntos = niveles.map((_, i) => ({ x: CAMINO.inicio + i * CAMINO.paso, y: ZIGZAG[i % ZIGZAG.length] }))
  const sendero = puntos.slice(1).map((b, i) => {
    const a = puntos[i]
    const largo = Math.hypot(b.x - a.x, b.y - a.y)
    const piedras = Math.floor(largo / 7)
    let d = ''
    for (let k = 1; k < piedras; k++) {
      const t = k / piedras
      d += `M${Math.round(a.x + (b.x - a.x) * t) - 1} ${Math.round(a.y + (b.y - a.y) * t) - 1}h2v2h-2z`
    }
    return { d, hecho: i < HECHOS }
  })
  const actual = puntos[HECHOS]

  return (
    <svg
      viewBox={`0 0 ${CAMINO.ancho} ${CAMINO.alto}`}
      width={CAMINO.ancho * 3}
      height={CAMINO.alto * 3}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`El camino de ${mundo.titulo}: ${niveles.length} niveles, del primero al jefe.`}
    >
      <g className={pixel.paletaCamino} data-decorado={mundo.decorado}>
        {sendero.map((s, i) => (
          <path key={i} d={s.d} className={s.hecho ? caminoStyles.senderoRecorrido : caminoStyles.senderoPendiente} />
        ))}
        {niveles.map((nivel, i) => {
          const p = puntos[i]
          const estado = estadoDe(i, niveles.length)
          return (
            <g
              key={nivel.id}
              className={caminoStyles.nodo}
              data-estado={estado}
              data-tipo={nivel.tipo}
              transform={`translate(${p.x} ${p.y})`}
            >
              {nivel.tipo === 'jefe' ? (
                <>
                  <path d={circulo(0, 4, RADIO + 5)} className={caminoStyles.halo} />
                  <path d="M-10 9h20v1h-20zM-12 10h24v1h-24z" className={caminoStyles.sombraJefe} />
                  <g className={caminoStyles.monstruo} transform="translate(-14 -15)">
                    <PixelSprite sprite={MONSTRUO} paleta={PALETA_CAMINO} />
                  </g>
                  <g transform="translate(0 -22)">
                    <Centrado sprite={CANDADO} />
                  </g>
                </>
              ) : (
                <>
                  <path d={circulo(0, 0, RADIO + 5)} className={caminoStyles.halo} />
                  <path d={circulo(0, 0, RADIO + 2)} className={caminoStyles.borde} />
                  <path d={circulo(0, 0, RADIO)} className={caminoStyles.fondo} />
                  <g className={caminoStyles.icono}>
                    <Centrado sprite={estado === 'bloqueado' ? CANDADO : ICONO[nivel.tipo]} />
                  </g>
                </>
              )}
              {estado === 'hecho' && (
                <g transform={`translate(-12 ${RADIO + 5})`}>
                  {[0, 1, 2].map((k) => (
                    <g key={k} transform={`translate(${k * 8} 0)`}>
                      <PixelSprite sprite={ESTRELLA} paleta={i === 1 && k === 2 ? PALETA_ESTRELLA_VACIA : PALETA_CAMINO} />
                    </g>
                  ))}
                </g>
              )}
            </g>
          )
        })}
      </g>
      {/* El héroe, de pie sobre el nivel que toca. */}
      <g transform={`translate(${actual.x - 16} ${actual.y - RADIO - 2 - 44 + 4})`}>
        <PixelHero pose="quieto" equipo={EQUIPO_CAMINO} />
      </g>
    </svg>
  )
}

/* ── Las estadísticas, en barras de vida ───────────────────────────────── */

const STATS = [
  { clave: 'VIT', nombre: 'Vitalidad · Salud financiera', valor: 78 },
  { clave: 'DEF', nombre: 'Defensa · Ahorro', valor: 100 },
  { clave: 'ATQ', nombre: 'Ataque · Inversión', valor: 56 },
  { clave: 'RES', nombre: 'Resistencia · Deuda y crédito', valor: 67 },
  { clave: 'RIQ', nombre: 'Riqueza · Tu patrimonio', valor: 45, real: true },
  { clave: 'CON', nombre: 'Constancia · Meses en positivo', valor: 75, real: true },
  { clave: 'POD', nombre: 'Poder · Lo que llevas puesto', valor: 62 },
] as const

/* ── El panel de Patrimonio, de ejemplo ────────────────────────────────── */

const MESES = [
  [8, 6],
  [8, 7],
  [9, 6],
  [8, 5],
  [10, 7],
  [9, 4],
] as const

const MOVIMIENTOS = [
  { concepto: 'Nómina', importe: 165000 },
  { concepto: 'Alquiler', importe: -62000 },
  { concepto: 'Supermercado', importe: -8430 },
  { concepto: 'Al fondo de emergencia', importe: -15000 },
] as const

const eur = (centimos: number) => money(centimos, DIVISA_APP)

/* ── La lista ──────────────────────────────────────────────────────────── */

export function crearDiapositivas(mundos: readonly MundoPublicoDto[]): Diapositiva[] {
  const r = resumir(mundos)
  const cuatro = mundos.slice(0, 4)
  const primero = mundos[0]
  const lectura = primero?.niveles.find((n) => n.tipo === 'lectura')

  return [
    {
      id: 'titulo',
      nombre: 'TeachCash',
      notas:
        'Hola, soy Jose y esto es TeachCash, mi Trabajo Fin de Máster en The Big School. Es educación financiera para cualquiera, pero no en forma de curso aburrido: es un videojuego a píxel. Este de aquí es el héroe. Va a acompañarnos toda la presentación.',
      contenido: (
        <div className={`${styles.diapo} ${styles.centro}`}>
          <Cielo semilla={7} cuantas={120} />
          <p className={styles.autor}>
            <span className={styles.autorNombre}>{AUTOR}</span> · Trabajo Fin de Máster · {ESCUELA}
          </p>
          <h1 className={styles.marca}>TeachCash</h1>
          <p className={styles.lema}>Educación financiera al alcance de cualquiera</p>
          <div className={styles.tituloEscena}>
            <EscenarioHeroe equipo={EQUIPO_TITULO} escala={5} />
            <div>
              <p className={styles.bocadillo}>
                ¡Hola! Vamos a aprender a manejar el dinero… jugando.
                <span className={styles.sigue} aria-hidden="true">
                  ▼
                </span>
              </p>
              <p className={styles.pulsa}>▶ Pulsa start</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'problema',
      nombre: 'El problema',
      notas:
        'Empiezo con una pregunta: ¿quién os enseñó a manejar el dinero? A mí, nadie. Y no es solo cosa mía: según el INE, más de un tercio de la gente en España no podría pagar un gasto imprevisto con sus ahorros. Cuatro de cada once huchas, vacías.',
      contenido: (
        <div className={styles.diapo}>
          <Cielo semilla={11} cuantas={50} />
          <Etiqueta>El problema</Etiqueta>
          <h2 className={`${styles.titular} ${styles.titularLinea}`}>¿Quién te enseñó a manejar el dinero?</h2>
          <div className={styles.datoMarco}>
            <div className={styles.datoPanel}>
              <div>
                <p className={styles.datoFrase}>
                  <strong className={styles.datoCifra}>36,4 %</strong> de la gente en España{' '}
                  <strong className={styles.oro}>no podría pagar un gasto imprevisto</strong> con sus ahorros.
                </p>
                <div className={styles.huchas} aria-hidden="true">
                  {Array.from({ length: 11 }, (_, i) => (
                    <DibujoPixel key={i} sprite={CERDITO} escala={7} className={i < 4 ? styles.huchaVacia : undefined} />
                  ))}
                </div>
                <p className={styles.fuente}>Fuente: INE, Encuesta de Condiciones de Vida 2025</p>
              </div>
              {/* El héroe, sin equipo y mirando sus huchas: aún no ha empezado. */}
              <div className={styles.datoHeroe} aria-hidden="true">
                <p className={styles.bocadilloAbajo}>¿Y mis ahorros?</p>
                <svg viewBox="0 0 32 46" width={32 * 6} height={46 * 6} shapeRendering="crispEdges">
                  <PixelHero pose="quieto" mirando="izq" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'elefante',
      nombre: 'El elefante en la habitación',
      notas:
        'Y esto tiene una causa. Nadie nos prepara para el mundo real. La falta de educación financiera es el elefante en la habitación: todos lo vemos y nadie lo señala. Los jóvenes no sabemos qué es el TIN, la TAE o el IPC; muchas veces ni entendemos una factura. Son objetos desconocidos del inventario. Y el resultado es este: no tenemos una mentalidad financiera sana para gestionar nuestro patrimonio.',
      contenido: (
        <div className={`${styles.diapo} ${styles.centro}`}>
          <Cielo semilla={13} cuantas={45} />
          <Etiqueta>El elefante en la habitación</Etiqueta>
          <h2 className={`${styles.titular} ${styles.titularLinea}`}>Nadie nos prepara para el mundo real</h2>
          <div className={styles.habitacion}>
            {DESCONOCIDOS.map((t) => (
              <span key={t} className={styles.duda}>
                {t} <span className={styles.dudaQue}>???</span>
              </span>
            ))}
            <Elefante />
            <span className={styles.suelo} aria-hidden="true" />
          </div>
          <p className={styles.remate}>
            La falta de educación financiera de los jóvenes es{' '}
            <span className={styles.oro}>el elefante en la habitación que nadie señala</span>, y es la causa de que
            seamos incapaces de gestionar de forma competente nuestro patrimonio.
          </p>
        </div>
      ),
    },
    {
      id: 'idea',
      nombre: 'La idea',
      notas:
        'Así que la idea es sencilla: si no lo aprendimos en clase, lo aprendemos jugando. Tres palabras lo resumen: interactivo, veraz y lúdico. Y la de veraz no es de adorno: es un requisito.',
      contenido: (
        <div className={`${styles.diapo} ${styles.centro}`}>
          <Cielo semilla={19} cuantas={60} />
          <Etiqueta>La idea</Etiqueta>
          <h2 className={styles.titular}>
            ¿Y si aprender finanzas
            <br />
            fuera un videojuego?
          </h2>
          <div className={styles.cartas}>
            <article className={styles.carta}>
              <div className={styles.cartaIcono}>
                <DibujoPixel sprite={MANDO} escala={7} />
              </div>
              <h3 className={styles.cartaTitulo}>Interactivo</h3>
              <p className={styles.cartaTexto}>Aprendes haciendo, no leyendo un PDF eterno.</p>
            </article>
            <article className={styles.carta}>
              <div className={styles.cartaIcono}>
                <DibujoPixel sprite={LIBRO} escala={8} />
              </div>
              <h3 className={styles.cartaTitulo}>Veraz</h3>
              <p className={styles.cartaTexto}>Cifras y normas de España, sacadas de fuentes oficiales.</p>
            </article>
            <article className={styles.carta}>
              <div className={styles.cartaIcono}>
                <DibujoPixel sprite={ESTRELLA} escala={11} />
              </div>
              <h3 className={styles.cartaTitulo}>Lúdico</h3>
              <p className={styles.cartaTexto}>Mundos, jefes, estrellas y un héroe que es solo tuyo.</p>
            </article>
          </div>
          <div className={styles.pista} aria-hidden="true">
            <svg className={styles.corredor} viewBox="0 0 32 46" width={96} height={138} shapeRendering="crispEdges">
              <PixelHero pose="corre" equipo={EQUIPO_CORRE} />
            </svg>
          </div>
        </div>
      ),
    },
    {
      id: 'mundos',
      nombre: 'Los mundos',
      notas: `El juego tiene ${r.mundos} mundos, cada uno un planeta: ${cuatro.map((m) => m.titulo).join(', ')}. Están todos abiertos desde el principio: empiezas por el que más te preocupe.`,
      contenido: (
        <div className={`${styles.diapo} ${styles.centro}`}>
          <Cielo semilla={31} cuantas={90} />
          <Etiqueta>Selecciona mundo</Etiqueta>
          <h2 className={`${styles.titular} ${styles.titularMedio}`}>Salta de mundo en mundo</h2>
          <div className={styles.salto}>
            <SaltoMundos mundos={mundos} />
          </div>
          <div className={styles.contadores}>
            <span className={styles.contador}>
              <strong>{r.mundos}</strong> mundos
            </span>
            <span className={styles.contador}>
              <strong>{r.niveles}</strong> niveles
            </span>
            <span className={styles.contador}>
              <strong>{r.estrellas}</strong> estrellas
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'planetas',
      nombre: 'Qué se aprende',
      notas:
        'Y esto es lo que hay en cada uno. Ahorro, deuda, inversión y salud financiera: lo que de verdad te encuentras en la vida, desde el fondo de emergencia hasta leer la letra pequeña de un préstamo.',
      contenido: (
        <div className={styles.diapo}>
          <Cielo semilla={37} cuantas={60} />
          <Etiqueta>Qué se aprende</Etiqueta>
          <h2 className={`${styles.titular} ${styles.titularMedio}`}>Lo que de verdad te vas a encontrar</h2>
          <div className={styles.planetas}>
            {cuatro.map((m) => (
              <article key={m.id} className={styles.planeta}>
                <PlanetaPixel decorado={m.decorado} escala={3} />
                <h3 className={styles.planetaNombre}>{m.titulo}</h3>
                <p className={styles.planetaTexto}>{m.descripcion}</p>
                <p className={styles.planetaMedida}>{medida(m)}</p>
              </article>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'camino',
      nombre: 'El camino',
      notas: `Dentro de cada mundo hay un camino. Lecciones cortas, de ${r.minutosMin} a ${r.minutosMax} minutos, con un minitest; prácticas con casos reales; y arriba del todo, el jefe. Sin calculadora: se pregunta por la idea, no por la cuenta.`,
      contenido: (
        <div className={styles.diapo}>
          <Cielo semilla={43} cuantas={50} />
          <Etiqueta>{primero ? `Mundo: ${primero.titulo}` : 'El camino'}</Etiqueta>
          <h2 className={`${styles.titular} ${styles.titularMedio}`}>Nivel a nivel, hasta el jefe</h2>
          <div className={styles.camino}>{primero && <CaminoApaisado mundo={primero} />}</div>
          <div className={styles.leyenda}>
            <div className={styles.leyendaItem}>
              <DibujoPixel sprite={LIBRO} escala={6} />
              <span>
                <strong>Lección</strong>
                De {r.minutosMin} a {r.minutosMax} minutos, con un minitest de 3 preguntas.
              </span>
            </div>
            <div className={styles.leyendaItem}>
              <DibujoPixel sprite={MANDO} escala={5} />
              <span>
                <strong>Práctica</strong>
                Casos reales, corregidos al momento.
              </span>
            </div>
            <div className={styles.leyendaItem}>
              <DibujoPixel sprite={MONSTRUO} escala={2} decorado={primero?.decorado} />
              <span>
                <strong>Jefe</strong>
                Todo lo del mundo, de golpe. Sin calculadora.
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'jefes',
      nombre: 'Los jefes',
      notas:
        'Cada mundo acaba con un jefe, un monstruo de su color. Seis preguntas y necesitas un 65 % para tumbarlo. Y si pierdes no pasa nada: lo vuelves a intentar. Aquí equivocarse es gratis, que es justo lo que no pasa con el dinero de verdad.',
      contenido: (
        <div className={`${styles.diapo} ${styles.centro}`}>
          <Cielo semilla={47} cuantas={70} />
          <Etiqueta>Peligro</Etiqueta>
          <h2 className={styles.titular}>Cada mundo tiene su jefe</h2>
          <div className={styles.jefes}>
            {cuatro.map((m) => (
              <div key={m.id} className={styles.jefe}>
                <DibujoPixel sprite={MONSTRUO} escala={8} decorado={m.decorado} className={escenas.jefeVivo} />
                <span className={styles.jefeSuelo} aria-hidden="true" />
                <p className={styles.jefeNombre}>{m.niveles.find((n) => n.tipo === 'jefe')?.titulo ?? 'El jefe'}</p>
                <p className={styles.jefeMundo}>{m.titulo}</p>
              </div>
            ))}
          </div>
          <div className={styles.reglas}>
            <span className={styles.regla}>
              <strong>6</strong> preguntas
            </span>
            <span className={styles.regla}>
              <strong>65 %</strong> para vencer
            </span>
            <span className={styles.regla}>
              Vidas: <Infinito />
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'combate',
      nombre: 'El combate',
      notas:
        'Y así se ve. Cada golpe es una idea que has aprendido: presupuesto, ahorro, interés compuesto. Lo que aprendes es literalmente tu arma. Ganas, y te llevas hasta tres estrellas.',
      contenido: (
        <div className={styles.diapo}>
          <Cielo semilla={53} cuantas={50} />
          <div className={`${styles.dos} ${styles.dosAncha}`}>
            <div>
              <Etiqueta>Combate</Etiqueta>
              <h2 className={styles.titular}>Lo que aprendes es tu arma</h2>
              <p className={styles.texto}>
                Cada golpe es una idea: <strong className={styles.oro}>presupuesto</strong>,{' '}
                <strong className={styles.oro}>ahorro</strong>,{' '}
                <strong className={styles.oro}>interés compuesto</strong>.
              </p>
              <p className={styles.texto}>Ganas, y te llevas hasta tres estrellas. Que es lo que mola.</p>
            </div>
            <div className={styles.combate}>
              <Batalla mundo={primero} />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tienda',
      nombre: 'La tienda',
      notas: `Las estrellas sirven para algo: la tienda. Casco, armadura, guantes, botas, espada, escudo y alas, en cuero, hierro y oro. Hay ${r.estrellas} estrellas en juego y no dan para comprarlo todo, así que toca elegir. Que, pensándolo bien, también es educación financiera. Este probador es de verdad: lo puedo tocar ahora mismo.`,
      contenido: (
        <div className={styles.diapo}>
          <Cielo semilla={59} cuantas={40} />
          <div className={styles.tienda}>
            <div>
              <Etiqueta>Tienda</Etiqueta>
              <h2 className={`${styles.titular} ${styles.titularMedio}`}>
                Gana estrellas,
                <br />
                viste a tu héroe
              </h2>
              <p className={styles.texto}>
                {HUECOS.length} piezas, tres calidades. Hay <strong className={styles.oro}>{r.estrellas} estrellas</strong>{' '}
                en juego… y no llegan para todo.
              </p>
              <p className={styles.texto}>Toca elegir. (Sí, eso también es educación financiera.)</p>
              <div className={styles.calidades}>
                <span className={styles.calidad} data-calidad="basica">
                  Cuero
                </span>
                <span className={styles.calidad} data-calidad="media">
                  Hierro
                </span>
                <span className={styles.calidad} data-calidad="alta">
                  Oro
                </span>
              </div>
              <p className={styles.pista2} aria-hidden="true">
                ▶ Toca una casilla para probártela
              </p>
            </div>
            <Probador estrellasPosibles={r.estrellas} />
          </div>
        </div>
      ),
    },
    {
      id: 'heroe',
      nombre: 'Tu héroe',
      notas:
        'Todo eso se junta en el Cuadro de mando: tu héroe con su equipo y siete estadísticas. Los cursos suben Vitalidad, Defensa, Ataque y Resistencia. Pero ojo: Riqueza y Constancia solo suben si a tu dinero de verdad le va bien. El juego se cruza con tu vida.',
      contenido: (
        <div className={styles.diapo}>
          <Cielo semilla={61} cuantas={60} />
          <div className={styles.dos}>
            <div className={styles.dibujo}>
              <EscenarioHeroe equipo={EQUIPO_TODO} escala={7} />
            </div>
            <div>
              <Etiqueta>Cuadro de mando</Etiqueta>
              <h2 className={`${styles.titular} ${styles.titularMedio}`}>Tu héroe crece contigo</h2>
              <div className={styles.stats} role="list" aria-label="Estadísticas de ejemplo">
                {STATS.map((s) => (
                  <div key={s.clave} className={styles.stat} role="listitem" data-real={'real' in s || undefined}>
                    <span className={styles.statClave}>{s.clave}</span>
                    <span>
                      <span className={styles.statBarra} aria-hidden="true">
                        {Array.from({ length: 10 }, (_, i) => (
                          <span key={i} data-lleno={i < Math.round(s.valor / 10) || undefined} />
                        ))}
                      </span>
                      <span className={styles.statNombre}>{s.nombre}</span>
                    </span>
                    <span className={styles.statValor}>{s.valor}</span>
                  </div>
                ))}
              </div>
              <p className={styles.texto}>
                <strong className={styles.oro}>Riqueza</strong> y <strong className={styles.oro}>Constancia</strong>{' '}
                solo suben si a tu dinero de verdad le va bien.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'patrimonio',
      nombre: 'Tu dinero de verdad',
      notas:
        'Porque TeachCash no se queda en el juego. Tiene un gestor de patrimonio para aplicarlo con tu dinero: anotas ingresos y gastos en segundos, los ordenas por categorías y ves cómo va tu mes. Estas son las cuentas de Pepito, nuestro personaje de ejemplo.',
      contenido: (
        <div className={styles.diapo}>
          <Cielo semilla={67} cuantas={40} />
          <div className={styles.dos}>
            <div>
              <Etiqueta>Gestión de patrimonio</Etiqueta>
              <h2 className={`${styles.titular} ${styles.titularMedio}`}>Y luego, a tu dinero de verdad</h2>
              <ul className={styles.lista}>
                <li>Anotas un gasto en dos segundos</li>
                <li>Categorías y planificación del mes</li>
                <li>Gráficos de ingresos, gastos y saldo</li>
                <li>Todo exportable a Excel</li>
              </ul>
            </div>
            <div className={styles.panel}>
              <div>
                <p className={styles.panelEtiqueta}>Patrimonio de Pepito · ejemplo</p>
                <p className={styles.panelCifra}>{formatMoney(eur(1248035))}</p>
                <span className={styles.panelSube}>{formatMoneySigned(eur(53570))} este mes</span>
              </div>
              <div className={styles.barras} aria-hidden="true">
                {MESES.map(([ingreso, gasto], i) => (
                  <div key={i} className={styles.mes}>
                    <span data-tipo="ingreso" data-alto={ingreso} />
                    <span data-tipo="gasto" data-alto={gasto} />
                  </div>
                ))}
              </div>
              <ul className={styles.movimientos}>
                {MOVIMIENTOS.map((m) => (
                  <li key={m.concepto}>
                    {m.concepto}
                    <span className={styles.importe} data-signo={m.importe > 0 ? 'mas' : 'menos'}>
                      {formatMoneySigned(eur(m.importe))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'veraz',
      nombre: 'Veraz',
      notas:
        'Y lo que más me importa: aquí no se inventa ni un dato. Cada cifra de los cursos sale de una fuente oficial española y pasa por revisión humana antes de publicarse. Para mí, un dato mal es un bug, igual que un importe mal sumado.',
      contenido: (
        <div className={styles.diapo}>
          <Cielo semilla={71} cuantas={50} />
          <div className={styles.dos}>
            <div>
              <Etiqueta>Sin trampas</Etiqueta>
              <h2 className={`${styles.titular} ${styles.titularMedio}`}>Aquí no se inventa ni un dato</h2>
              <p className={styles.texto}>
                Cada cifra sale de una <strong className={styles.oro}>fuente oficial española</strong> y pasa por
                revisión humana antes de publicarse.
              </p>
              <div className={styles.fuentes}>
                {['Banco de España', 'CNMV', 'INE', 'Seguridad Social', 'Tesoro Público', 'BOE'].map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>
              <p className={styles.aviso}>Contenido educativo, no asesoramiento financiero.</p>
            </div>
            <div className={styles.sello}>
              <DibujoPixel sprite={ESCUDO} escala={10} />
              <p className={styles.selloTexto}>
                Un dato mal
                <br />
                es un bug
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'excusas',
      nombre: 'Cero excusas',
      notas: `Y para que nadie se quede fuera: es gratis, no hace falta registrarse, una lección dura ${lectura ? lectura.minutos : r.minutosMin} minutos y si te gusta, creas la cuenta y no pierdes nada de lo que llevas.`,
      contenido: (
        <div className={`${styles.diapo} ${styles.centro}`}>
          <Cielo semilla={73} cuantas={70} />
          <Etiqueta>Sin excusas</Etiqueta>
          <h2 className={styles.titular}>Empezar cuesta cero</h2>
          <div className={styles.excusas}>
            <article className={styles.excusa}>
              <DibujoPixel sprite={MONEDA} escala={14} />
              <p className={styles.excusaGrande}>0 €</p>
              <p className={styles.excusaTexto}>Gratis. Sin letra pequeña (de esa ya hablamos en el juego).</p>
            </article>
            <article className={styles.excusa}>
              <DibujoPixel sprite={CANDADO} escala={10} />
              <p className={styles.excusaGrande}>0 registros</p>
              <p className={styles.excusaTexto}>Entras y juegas. Ni email ni contraseña.</p>
            </article>
            <article className={styles.excusa}>
              <DibujoPixel sprite={LIBRO} escala={8} />
              <p className={styles.excusaGrande}>
                {r.minutosMin}-{r.minutosMax} min
              </p>
              <p className={styles.excusaTexto}>Lo que dura una lección. Cabe en el bus.</p>
            </article>
            <article className={styles.excusa}>
              <DibujoPixel sprite={CORAZON} escala={10} />
              <p className={styles.excusaGrande}>0 pérdidas</p>
              <p className={styles.excusaTexto}>Si te gusta, creas tu cuenta y te llevas todo lo que llevas.</p>
            </article>
          </div>
        </div>
      ),
    },
    {
      id: 'tecnica',
      nombre: 'Bajo el capó',
      notas:
        'Para el tribunal, un vistazo a lo de dentro. Next 16 con Server Actions, Supabase con Postgres y Auth, Drizzle, Refine y Mantine. Y las cosas de las que estoy más orgulloso: está en producción en teachcash.es con dominio y emails propios; hay tests unitarios, de integración y E2E, y un CI que no deja entrar nada a develop sin pasar, con despliegue automático en Vercel; pasé una auditoría de seguridad contra OWASP, y todo el pixel art es propio, sin una sola imagen.',
      contenido: (
        <div className={styles.diapo}>
          <Cielo semilla={79} cuantas={40} />
          <Etiqueta>Bajo el capó</Etiqueta>
          <h2 className={`${styles.titular} ${styles.titularMedio}`}>Inventario técnico</h2>
          <div className={styles.inventario}>
            {[
              ['Next.js 16', 'App Router y Server Actions'],
              ['React 19 + TS', 'TypeScript strict, de punta a punta'],
              ['Supabase', 'Postgres + Auth, con RLS'],
              ['Drizzle ORM', 'Consultas tipadas contra Postgres'],
              ['Refine + Mantine', 'CRUD declarativo sobre Server Actions'],
              ['Zod 4', 'Todo se valida en el servidor'],
              ['Recharts', 'Gráficos con datos ya agregados'],
              ['Vitest + PGlite', 'Tests rápidos con Postgres en WASM'],
              ['Playwright', 'Los flujos clave, de punta a punta'],
              ['Vercel + Actions', 'Despliegue y CI en cada PR'],
            ].map(([nombre, para]) => (
              <div key={nombre} className={styles.pieza}>
                <span className={styles.piezaNombre}>{nombre}</span>
                <span className={styles.piezaPara}>{para}</span>
              </div>
            ))}
          </div>
          <div className={styles.logros}>
            {[
              ['Logro', 'En producción en teachcash.es, con dominio y emails propios'],
              ['Logro', 'Auditoría OWASP Top 10 y API Top 10'],
              ['Logro', 'CSP con nonce y cookies httpOnly'],
              ['Logro', 'Tests unitarios, de integración y E2E, un CI que vigila cada merge y despliegue automático'],
              ['Logro', 'Clean Architecture en cuatro capas, vigilada por ESLint'],
              ['Logro', 'Pixel art 100 % propio: ni una imagen'],
            ].map(([titulo, texto]) => (
              <div key={texto} className={styles.logro}>
                <DibujoPixel sprite={ESTRELLA} escala={5} />
                <span>
                  <strong>{titulo} desbloqueado</strong>
                  {texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'futuro',
      nombre: 'Lo que viene',
      notas:
        'El Trabajo de Final de Máster se acaba aquí, pero el proyecto no. Voy a seguir con él: más mundos y más jefes, más funcionalidades y, sobre todo, formar una comunidad alrededor de TeachCash.',
      contenido: (
        <div className={`${styles.diapo} ${styles.centro}`}>
          <Cielo semilla={83} cuantas={80} />
          <Etiqueta>Próximos niveles</Etiqueta>
          <h2 className={`${styles.titular} ${styles.titularMedio}`}>
            El Trabajo de Final de Máster
            <br />
            se acaba. El proyecto, no.
          </h2>
          <div className={styles.proximos}>
            {(
              [
                [MONSTRUO, 3, 'Más mundos, más jefes'],
                [MANDO, 9, 'Más funcionalidades'],
                [CORAZON, 12, 'Formar una comunidad'],
              ] as const
            ).map(([sprite, escala, texto]) => (
              <div key={texto} className={styles.proximo}>
                <span className={styles.proximoIcono}>
                  <DibujoPixel sprite={sprite} escala={escala} decorado="tarjeta" />
                </span>
                {texto}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'continua',
      nombre: 'Continue?',
      notas:
        'Y acabo como acaban los juegos: ¿continuar? TeachCash está en producción en www.teachcash.es. Escanead el QR, entrad sin registraros y probad la primera lección. Vuestro héroe os está esperando. ¡Gracias!',
      contenido: (
        <div className={`${styles.diapo} ${styles.centro}`}>
          <Cielo semilla={89} cuantas={130} />
          <h2 className={styles.continua}>
            Continue?
            <span className={styles.cuenta} aria-hidden="true">
              {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </h2>
          <div className={styles.final}>
            <svg viewBox="-24 -12 80 60" width={80 * 5} height={60 * 5} shapeRendering="crispEdges" aria-hidden="true">
              <PixelHero pose="celebra" equipo={EQUIPO_FINAL} />
            </svg>
            <div>
              <p className={styles.url}>www.teachcash.es</p>
              <p className={styles.gracias}>Gratis y sin registrarte. Tu héroe te espera.</p>
              <p className={styles.pulsa}>▶ ¡Gracias!</p>
            </div>
            <svg
              className={styles.qr}
              viewBox={`0 0 ${QR_LADO} ${QR_LADO}`}
              width={QR_LADO * 12}
              height={QR_LADO * 12}
              shapeRendering="crispEdges"
              role="img"
              aria-label="Código QR a www.teachcash.es"
            >
              <path d={QR_TEACHCASH} />
            </svg>
          </div>
        </div>
      ),
    },
  ]
}
