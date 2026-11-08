/*
 * El héroe grande, con su equipo. Lo pintan el Cuadro de mando y la Tienda; el
 * pequeño (`PixelHero`) lleva el mismo equipo por el Camino del héroe, dibujado
 * a su escala.
 *
 * Mide 48x66 píxeles de juego con el origen arriba a la izquierda. Las botas
 * apoyan en la fila 65 y la sombra cae en las filas 66 y 67. Alas, arma y escudo
 * salen de esa caja a propósito, y por eso la escena tiene margen.
 *
 * El orden de las capas es el orden de pintado: la armadura va sobre el torso y
 * bajo los brazos, los guantes sobre las manos y el escudo y el arma delante de
 * todo. Si se cambia, una pieza acaba tapando a otra sin que falle nada.
 *
 * Solo respira lo que va de cintura para arriba, igual que `PixelHero`: las botas
 * se quedan clavadas en el suelo.
 */

import { equipoPorHueco, objetoPorId, type Hueco, type Objeto, type TipoObjeto } from '@/lib/tienda'
import { PixelSprite } from './PixelSprite'
import styles from './pixel.module.css'
import { DESTELLO, ESTRELLA, PALETA_CAMINO, type Sprite } from './sprites'
import {
  GRANDE_BRAZO_DER,
  GRANDE_BRAZO_IZQ,
  GRANDE_CABEZA,
  GRANDE_PIERNAS,
  GRANDE_TORSO,
  OBJETO_ALAS,
  OBJETO_ARMADURA,
  OBJETO_BOTAS,
  OBJETO_CASCO,
  OBJETO_ESCUDO,
  OBJETO_ESPADA,
  OBJETO_GUANTES,
  OBJETO_MARTILLO,
  PALETA_HEROE_GRANDE as PALETA,
} from './spritesGrande'

/** Lo que mide el héroe grande, en píxeles de juego. */
export const ANCHO_HEROE_GRANDE = 48
export const ALTO_HEROE_GRANDE = 66

/** Un dibujo por tipo: la calidad es solo la paleta (`data-calidad`). */
export const SPRITE_OBJETO: Record<TipoObjeto, Sprite> = {
  casco: OBJETO_CASCO,
  armadura: OBJETO_ARMADURA,
  guantes: OBJETO_GUANTES,
  botas: OBJETO_BOTAS,
  espada: OBJETO_ESPADA,
  martillo: OBJETO_MARTILLO,
  escudo: OBJETO_ESCUDO,
  alas: OBJETO_ALAS,
}

/** La caja del `viewBox` de `EscenaHeroe`: los destellos no se salen de ella. */
const ESCENA = { x: -22, y: -2, ancho: 92, alto: 70 } as const

function Pieza({ objeto, estreno = false }: { objeto: Objeto | undefined; estreno?: boolean }) {
  if (!objeto) return null
  return (
    <g
      className={estreno ? `${styles.equipo} ${styles.estreno}` : styles.equipo}
      data-calidad={objeto.calidad}
      data-hueco={objeto.hueco}
      data-estreno={estreno || undefined}
    >
      <PixelSprite sprite={SPRITE_OBJETO[objeto.tipo]} paleta={PALETA} />
    </g>
  )
}

/**
 * Los destellos de una pieza recién comprada: cuatro, en sus esquinas y un poco
 * por fuera, sin salirse de la escena. Titilan una vez, uno detrás de otro
 * (`.destello` en `pixel.module.css`), y se quedan transparentes: sin animación,
 * no se ven.
 */
function Destellos({ sprite }: { sprite: Sprite }) {
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length
  const lado = DESTELLO.filas.length
  const dentro = (x: number, y: number) => [
    Math.min(Math.max(x, ESCENA.x), ESCENA.x + ESCENA.ancho - lado),
    Math.min(Math.max(y, ESCENA.y), ESCENA.y + ESCENA.alto - lado),
  ]
  const puntos = [
    dentro(sprite.x - 3, sprite.y - 2),
    dentro(sprite.x + ancho - 2, sprite.y - 3),
    dentro(sprite.x + ancho - 1, sprite.y + alto - 4),
    dentro(sprite.x - 4, sprite.y + alto - 3),
  ]
  return (
    <g className={styles.destellos} data-destellos="">
      {puntos.map(([x, y]) => (
        <g key={`${x},${y}`} transform={`translate(${x} ${y})`}>
          <PixelSprite sprite={DESTELLO} paleta={PALETA} className={styles.destello} />
        </g>
      ))}
    </g>
  )
}

export function HeroeGrande({
  equipo = [],
  estreno = null,
}: {
  equipo?: readonly string[]
  /**
   * El id de lo que se acaba de comprar: aparece con un gesto y destellos. Solo
   * lo pasa la tienda tras una compra; equipar algo que ya era tuyo, no.
   */
  estreno?: string | null
}) {
  const puesto = equipoPorHueco(equipo)
  const pieza = (hueco: Hueco) => {
    const objeto = puesto.get(hueco)
    return <Pieza objeto={objeto} estreno={objeto !== undefined && objeto.id === estreno} />
  }
  const nuevo = [...puesto.values()].find((o) => o.id === estreno)

  return (
    <g className={styles.paleta}>
      <path d="M12 66h24v1h-24zM9 67h30v1h-30z" className={styles.sombra} />
      <PixelSprite sprite={GRANDE_PIERNAS} paleta={PALETA} />
      {pieza('botas')}
      <g className={styles.respira}>
        {pieza('alas')}
        <PixelSprite sprite={GRANDE_TORSO} paleta={PALETA} />
        {pieza('armadura')}
        <PixelSprite sprite={GRANDE_BRAZO_IZQ} paleta={PALETA} />
        <PixelSprite sprite={GRANDE_BRAZO_DER} paleta={PALETA} />
        {pieza('guantes')}
        <PixelSprite sprite={GRANDE_CABEZA} paleta={PALETA} />
        {pieza('casco')}
        {pieza('escudo')}
        {pieza('arma')}
      </g>
      {/* Con su `key`, una compra nueva vuelve a montarlos y a lanzar su animación. */}
      {nuevo && <Destellos key={nuevo.id} sprite={SPRITE_OBJETO[nuevo.tipo]} />}
    </g>
  )
}

/**
 * El héroe en su propio `<svg>`, con margen para el equipo y centrado en su eje.
 * El tamaño va en `.escena`, en múltiplos enteros de este `viewBox`: a cualquier
 * otra escala los píxeles salen de anchos distintos y deja de verse nítido.
 */
export function EscenaHeroe({
  equipo = [],
  estreno = null,
}: {
  equipo?: readonly string[]
  estreno?: string | null
}) {
  const nombres = equipo.flatMap((id) => objetoPorId(id)?.nombre ?? [])
  return (
    <svg
      className={styles.escena}
      viewBox={`${ESCENA.x} ${ESCENA.y} ${ESCENA.ancho} ${ESCENA.alto}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={nombres.length > 0 ? `El héroe, con: ${nombres.join(', ')}` : 'El héroe, sin equipo'}
    >
      <HeroeGrande equipo={equipo} estreno={estreno} />
    </svg>
  )
}

/** Un objeto suelto, a la mayor escala entera que quepa en `caja` píxeles de pantalla. */
export function ObjetoPixel({ objeto, caja = 120 }: { objeto: Objeto; caja?: number }) {
  const sprite = SPRITE_OBJETO[objeto.tipo]
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length
  const escala = Math.max(1, Math.floor(caja / Math.max(ancho, alto)))
  return (
    <svg
      className={styles.paleta}
      width={ancho * escala}
      height={alto * escala}
      viewBox={`${sprite.x} ${sprite.y} ${ancho} ${alto}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Pieza objeto={objeto} />
    </svg>
  )
}

/** La estrella de los niveles, la misma que se gana en el camino. */
export function EstrellaPixel({ tamano = 20 }: { tamano?: number }) {
  return (
    <svg
      className={styles.paletaCamino}
      width={tamano}
      height={tamano}
      viewBox={`${ESTRELLA.x} ${ESTRELLA.y} ${ESTRELLA.filas[0].length} ${ESTRELLA.filas.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <PixelSprite sprite={ESTRELLA} paleta={PALETA_CAMINO} />
    </svg>
  )
}
