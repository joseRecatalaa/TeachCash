'use client'

/*
 * El mapa de mundos: cada mundo es un PLANETA a píxel (`planeta.ts`) con su
 * decorado encima, y el héroe espera en el suelo, debajo del elegido.
 *
 * Se ven TRES planetas a la vez: grandes se leen mejor que cuatro pequeños,
 * y así caben los mundos que vengan. La fila sigue al héroe: el mundo
 * elegido va SIEMPRE en el centro de los tres, salvo el primero y el último,
 * que no tienen vecino a un lado. Las flechas (y las del teclado) llevan al
 * héroe al mundo de al lado, y la fila se desliza con él.
 *
 * Elegir un planeta (clic, toque, o Enter con el teclado) hace que el héroe
 * CORRA hasta ponerse debajo; "Entrar" lo hace saltar dentro del planeta y
 * lleva a su camino. Pulsar otra vez el planeta ya elegido también entra.
 * Encima de cada planeta van sus estrellas; los mundos aún sin niveles salen
 * apagados y con un candado: se ven, pero no se entra.
 *
 * Las estrellas son progreso DERIVADO que calcula el servidor (regla dura 7).
 */

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { ActionIcon } from '@mantine/core'
import { IconChevronLeft, IconChevronRight, IconLock, IconRocket } from '@tabler/icons-react'
import type { Decorado, MapaDto, MundoResumenDto } from '@/src/types/heroe.types'
import { ALTO_HEROE, ANCHO_HEROE } from '../Pixel/PixelHero'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import {
  BARRAS,
  CANDADO,
  CERDITO,
  CORAZON,
  ESCUDO,
  ESTRELLA,
  HUCHA,
  MONEDA,
  MONTANA,
  PALETA_CAMINO,
  TARJETA,
  TARJETITA,
  type Sprite,
} from '../Pixel/sprites'
import { useMovimientoReducido } from '../Pixel/useMovimientoReducido'
import { SketchButton } from '../ui'
import type { Punto } from './camino'
import { PLANETAS, RADIO_PLANETA } from './planeta'
import { HeroeCamino } from './HeroeCamino'
import { useCaminata } from './useCaminata'
import styles from './MapaMundos.module.css'

const DIBUJO: Record<Decorado, Sprite> = {
  escudo: ESCUDO,
  hucha: HUCHA,
  montana: MONTANA,
  tarjeta: TARJETA,
}

export const rutaMundo = (id: string) => `/CaminoHeroe/Mundo?id=${encodeURIComponent(id)}` as Route

/* La escena, en píxeles de juego: tres huecos de planeta a la vista. De
   arriba abajo: el nombre del mundo, sus estrellas, el decorado, el planeta y,
   pegados abajo, el suelo y el héroe. El héroe va a escala 1,3: es el
   protagonista y tiene que leerse al lado de planetas tan grandes. */
const VISIBLES = 3
const HUECO = 140
const ANCHO = HUECO * VISIBLES
const ALTO = 206
const NOMBRE_Y = 12
const MARCADOR_Y = 25
const CENTRO_Y = 92
const SUELO = 202
const ESCALA_HEROE = 1.3
/** Píxeles de juego por segundo: un hueco en 400 ms. Lo comparten el héroe y la fila. */
const VELOCIDAD_CARRERA = 350
/** Lo que dura el salto dentro del planeta. Igual que `heroe-entra` en el módulo. */
const SALTO_MS = 520
/** Cuántas letras caben en una línea sobre un planeta; si no, el nombre va en dos. */
const LETRAS_POR_LINEA = 20

const centroX = (i: number) => i * HUECO + HUECO / 2
const bajoPlaneta = (i: number): Punto => ({
  x: Math.round(centroX(i) - (ANCHO_HEROE * ESCALA_HEROE) / 2),
  y: Math.round(SUELO - ALTO_HEROE * ESCALA_HEROE),
})
const acotar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/**
 * Lo que puebla cada planeta: cuatro habitantes de pie en la ladera (los de
 * la derecha, volteados: se miran) y tres satélites flotando alrededor.
 */
const HABITANTES: Record<Decorado, { ladera: Sprite; satelite: Sprite }> = {
  escudo: { ladera: CORAZON, satelite: CORAZON },
  hucha: { ladera: CERDITO, satelite: MONEDA },
  montana: { ladera: BARRAS, satelite: ESTRELLA },
  tarjeta: { ladera: TARJETITA, satelite: MONEDA },
}
/** A qué distancia del centro se plantan los de la ladera: dos a cada lado. */
const LADERA_X = [-30, -17, 17, 30]
/** Los satélites: [x, y] respecto al centro del planeta. */
const SATELITES = [
  [-RADIO_PLANETA - 14, -14],
  [RADIO_PLANETA + 8, 4],
  [-RADIO_PLANETA - 6, 22],
] as const

/**
 * "Salud financiera" → ["Salud", "financiera"]: un nombre que no cabe bajo su
 * planeta se parte por el espacio más centrado. En una línea se cortaba por
 * el borde del mapa.
 */
export function partirNombre(nombre: string): string[] {
  if (nombre.length <= LETRAS_POR_LINEA || !nombre.includes(' ')) return [nombre]
  const espacios = [...nombre.matchAll(/ /g)].map((m) => m.index ?? 0)
  const mitad = nombre.length / 2
  const corte = espacios.reduce((mejor, e) => (Math.abs(e - mitad) < Math.abs(mejor - mitad) ? e : mejor))
  return [nombre.slice(0, corte), nombre.slice(corte + 1)]
}

/** Unas pocas estrellas fijas: el fondo es el papel, con pocos detalles. */
const ESTRELLAS = Array.from({ length: 34 }, (_, k) => [
  (k * 53 + (k % 5) * 17) % (HUECO * 8),
  8 + ((k * 37) % 150),
])

/**
 * La posición de la fila, en píxeles de juego, deslizándose hasta `destino`
 * de píxel entero en píxel entero. Con el movimiento reducido salta
 * directamente.
 *
 * Va a velocidad constante y a la MISMA que el héroe, y por eso él se queda
 * clavado en pantalla mientras el mundo pasa. Con una curva de salida la fila
 * le ganaba al principio y lo arrastraba hacia atrás justo al pulsar la flecha.
 */
function useDesliz(destino: number): number {
  const reducido = useMovimientoReducido()
  const [x, setX] = useState(destino)
  const actual = useRef(destino)

  useEffect(() => {
    if (reducido) return
    const desde = actual.current
    if (desde === destino) return
    let cuadro = 0
    let inicio: number | null = null
    const avanzar = (ahora: number) => {
      inicio ??= ahora
      const t = Math.min(1, ((ahora - inicio) / 1000) * (VELOCIDAD_CARRERA / Math.abs(destino - desde)))
      actual.current = Math.round(desde + (destino - desde) * t)
      setX(actual.current)
      if (t < 1) cuadro = requestAnimationFrame(avanzar)
    }
    cuadro = requestAnimationFrame(avanzar)
    return () => cancelAnimationFrame(cuadro)
  }, [destino, reducido])

  return reducido ? destino : x
}

/**
 * La fila que se desliza. Es un componente aparte, con los planetas como
 * `children`, para que su estado no repinte el mapa en cada cuadro: `children`
 * llega ya creado y React no vuelve a pintar lo de dentro.
 */
function Fila({ destino, children }: { destino: number; children: ReactNode }) {
  const x = useDesliz(destino)
  return <g transform={`translate(${x} 0)`}>{children}</g>
}

function Planeta({
  mundo,
  i,
  elegido,
  alPulsar,
}: {
  mundo: MundoResumenDto
  i: number
  elegido: boolean
  alPulsar: () => void
}) {
  const capas = PLANETAS[mundo.decorado]
  const sprite = DIBUJO[mundo.decorado]
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length
  const alTeclear = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      alPulsar()
    }
  }
  const estado = mundo.proximamente ? 'próximamente' : `${mundo.hechos} de ${mundo.total} niveles`

  return (
    <g
      className={`${pixel.paletaCamino} ${styles.planeta}`}
      data-decorado={mundo.decorado}
      data-elegido={elegido}
      data-proximamente={mundo.proximamente}
      transform={`translate(${centroX(i)} ${CENTRO_Y})`}
      role="button"
      tabIndex={0}
      aria-pressed={elegido}
      aria-label={`${mundo.titulo}, ${estado}`}
      onClick={alPulsar}
      onKeyDown={alTeclear}
    >
      <g className={styles.cuerpo}>
        <g className={styles.flota}>
          <path d={capas.anilloDetras} className={styles.anilloDetras} />
          <path d={capas.atmosfera} className={styles.atmosfera} />
          <path d={capas.contorno} className={styles.contorno} />
          <path d={capas.superficie} className={styles.superficie} />
          <path d={capas.detalle} className={styles.detalle} />
          <path d={capas.detalleLuz} className={styles.brillo} />
          <path d={capas.tramado} className={styles.sombra} />
          <path d={capas.sombra} className={styles.sombra} />
          <path d={capas.brillo} className={styles.brillo} />
          <path d={capas.chispa} className={styles.chispa} />
          <path d={capas.anilloDelante} className={styles.anilloDelante} />
          {/* Los habitantes de la ladera, a un lado y otro del decorado. */}
          {LADERA_X.map((x) => {
            const { ladera } = HABITANTES[mundo.decorado]
            const w = ladera.filas[0].length
            const h = ladera.filas.length
            const superficie = -Math.round(Math.sqrt(RADIO_PLANETA ** 2 - x ** 2))
            const transformacion =
              x < 0
                ? `translate(${x - Math.floor(w / 2)} ${superficie + 2 - h})`
                : `translate(${x + Math.ceil(w / 2)} ${superficie + 2 - h}) scale(-1 1)`
            return (
              <g key={x} transform={transformacion}>
                <PixelSprite sprite={ladera} paleta={PALETA_CAMINO} />
              </g>
            )
          })}
          {/* El decorado, de pie sobre el planeta y hundido un par de píxeles. */}
          <g transform={`translate(${-Math.floor(ancho / 2)} ${-RADIO_PLANETA + 3 - alto})`}>
            <PixelSprite sprite={sprite} paleta={PALETA_CAMINO} />
          </g>
        </g>
        {SATELITES.map(([x, y]) => (
          <g key={`${x},${y}`} className={styles.satelite} transform={`translate(${x} ${y})`}>
            <PixelSprite sprite={HABITANTES[mundo.decorado].satelite} paleta={PALETA_CAMINO} />
          </g>
        ))}
      </g>
      {/* Encima del planeta: su nombre y, debajo, lo conseguido (sus
          estrellas, o un candado si aún no tiene niveles). */}
      <text y={NOMBRE_Y - CENTRO_Y} className={styles.nombre} textAnchor="middle">
        {partirNombre(mundo.titulo).map((linea, k) => (
          <tspan key={linea} x="0" dy={k === 0 ? 0 : 10}>
            {linea}
          </tspan>
        ))}
      </text>
      <Marcador mundo={mundo} />
    </g>
  )
}

/** Lo que mide de ancho una letra de la tipografía a píxel a 8 px, más o menos. */
const ANCHO_LETRA = 6
const ANCHO_ICONO = 7
const HUELGO_ICONO = 3

/**
 * El marcador de encima del planeta: sus estrellas, o un candado y "Pronto".
 * El icono y el texto se centran JUNTOS sobre el planeta, según lo largo que
 * sea el texto: centrar solo el texto dejaba "Pronto" corrido a la derecha.
 */
function Marcador({ mundo }: { mundo: MundoResumenDto }) {
  const texto = mundo.proximamente ? 'Pronto' : `${mundo.estrellas}/${mundo.estrellasMax}`
  const ancho = ANCHO_ICONO + HUELGO_ICONO + texto.length * ANCHO_LETRA
  const x = -Math.round(ancho / 2)
  return (
    <g transform={`translate(${x} ${MARCADOR_Y - CENTRO_Y})`}>
      <g transform="translate(0 -4)">
        <PixelSprite sprite={mundo.proximamente ? CANDADO : ESTRELLA} paleta={PALETA_CAMINO} />
      </g>
      <text x={ANCHO_ICONO + HUELGO_ICONO} y="0" className={styles.marcador}>
        {texto}
      </text>
    </g>
  )
}

function Heroe({
  desde,
  hasta,
  entrando,
  posicionRef,
}: {
  desde: Punto
  hasta: Punto
  entrando: boolean
  posicionRef: RefObject<Punto>
}) {
  const { pos, andando, mirando } = useCaminata(desde, hasta, { velocidad: VELOCIDAD_CARRERA, espera: 0 })
  useEffect(() => {
    posicionRef.current = pos
  }, [pos, posicionRef])
  return (
    <g transform={`translate(${pos.x} ${pos.y}) scale(${ESCALA_HEROE})`} className={styles.heroe}>
      <g className={entrando ? styles.entrando : undefined}>
        <HeroeCamino pose={andando ? 'corre' : 'quieto'} mirando={mirando} />
      </g>
    </g>
  )
}

export function MapaMundos({ mapa }: { mapa: MapaDto }) {
  const router = useRouter()
  const reducido = useMovimientoReducido()
  const { mundos } = mapa
  const ultimoInicio = Math.max(0, mundos.length - VISIBLES)

  const idxInicial = Math.max(
    0,
    mundos.findIndex((m) => m.id === (mapa.ultimoMundo ?? mundos.find((x) => !x.proximamente)?.id)),
  )
  const [elegido, setElegido] = useState(idxInicial)
  // De dónde sale el héroe: donde esté, aunque vaya a medio camino. Si saliera
  // siempre del planeta anterior, pulsar dos veces seguidas lo teletransportaría.
  const [desde, setDesde] = useState(() => bajoPlaneta(idxInicial))
  const posicionRef = useRef(desde)
  const [entrando, setEntrando] = useState(false)
  // La fila se deriva del elegido: él en el centro, salvo en los extremos.
  const inicio = acotar(elegido - 1, 0, ultimoInicio)

  const mundo = mundos[elegido]
  if (!mundo) return null

  const elegir = (i: number) => {
    if (i === elegido) {
      entrar()
      return
    }
    setDesde(posicionRef.current)
    setElegido(i)
  }

  /** Las flechas: el héroe corre al mundo de al lado (sin entrar). */
  const deslizar = (paso: -1 | 1) => {
    const destino = acotar(elegido + paso, 0, mundos.length - 1)
    if (destino !== elegido) elegir(destino)
  }

  function entrar() {
    if (mundo.proximamente || entrando) return
    if (reducido) {
      router.push(rutaMundo(mundo.id))
      return
    }
    setEntrando(true)
    window.setTimeout(() => router.push(rutaMundo(mundo.id)), SALTO_MS)
  }

  const alTeclear = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') deslizar(-1)
    if (e.key === 'ArrowRight') deslizar(1)
  }

  return (
    <div className={styles.mapa}>
      {/* Las flechas del teclado también deslizan, con el foco dentro del mapa. */}
      <div className={styles.carril} onKeyDown={alTeclear}>
        <ActionIcon
          className={`${styles.flecha} ${styles.flechaIzq}`}
          variant="default"
          size="xl"
          aria-label="Mundo anterior"
          disabled={elegido === 0}
          onClick={() => deslizar(-1)}
        >
          <IconChevronLeft size={22} />
        </ActionIcon>

        <svg
          className={styles.escena}
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          shapeRendering="crispEdges"
          role="group"
          aria-label={`Mapa de mundos: ${mundos.length} mundos, se ven del ${inicio + 1} al ${Math.min(mundos.length, inicio + VISIBLES)}`}
        >
          <Fila destino={-inicio * HUECO}>
            <path d={ESTRELLAS.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join('')} className={styles.estrellasFondo} />
            <rect y={SUELO} width={Math.max(ANCHO, HUECO * mundos.length)} height="2" className={styles.suelo} />
            <path
              d={Array.from({ length: Math.ceil((HUECO * mundos.length) / 37) }, (_, k) => {
                const s = k * 37 + (k % 3) * 5
                return `M${s} ${SUELO - 1}h1v1h-1zM${s + 2} ${SUELO - 2}h1v2h-1z`
              }).join('')}
              className={styles.suelo}
            />
            {mundos.map((m, i) => (
              <Planeta key={m.id} mundo={m} i={i} elegido={i === elegido} alPulsar={() => elegir(i)} />
            ))}
            <Heroe
              key={`${desde.x},${desde.y}->${elegido}`}
              desde={desde}
              hasta={bajoPlaneta(elegido)}
              entrando={entrando}
              posicionRef={posicionRef}
            />
          </Fila>
        </svg>

        <ActionIcon
          className={`${styles.flecha} ${styles.flechaDer}`}
          variant="default"
          size="xl"
          aria-label="Mundo siguiente"
          disabled={elegido === mundos.length - 1}
          onClick={() => deslizar(1)}
        >
          <IconChevronRight size={22} />
        </ActionIcon>
      </div>

      {/* Sin ficha: el nombre y las estrellas ya están en el mapa. El botón
          dice adónde se entra, y es lo que encuentra quien navega con teclado
          o con lector de pantalla. */}
      <div className={styles.entrar} aria-live="polite">
        <SketchButton
          onClick={entrar}
          disabled={mundo.proximamente}
          leftSection={mundo.proximamente ? <IconLock size={16} aria-hidden /> : <IconRocket size={16} aria-hidden />}
        >
          {mundo.proximamente ? `${mundo.titulo}: próximamente` : `Entrar en ${mundo.titulo}`}
        </SketchButton>
      </div>
    </div>
  )
}
