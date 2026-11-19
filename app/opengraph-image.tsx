import { ImageResponse } from 'next/og'
import { LEMA, NOMBRE_SITIO } from '@/lib/seo'
import { trazos } from '@/src/presentation/components/Pixel/PixelSprite'
import {
  ESCUDO,
  ESTRELLA,
  HUCHA,
  MONEDA,
  MONTANA,
  PALETA_CAMINO,
  TARJETA,
  type Sprite,
} from '@/src/presentation/components/Pixel/sprites'

/**
 * La imagen que sale al compartir un enlace (WhatsApp, redes, Slack): los
 * cuatro mundos a píxel sobre el verde de la marca, con el nombre y el lema.
 * Vale para todas las páginas que no declaran la suya.
 *
 * Aquí no hay CSS: `ImageResponse` pinta JSX con estilos en línea y no lee
 * `pixel.module.css`. Por eso cada color va escrito: son los de
 * `.paletaCamino`. Si se retocan allí, se retocan aquí.
 */

export const alt = `${NOMBRE_SITIO}: ${LEMA}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const COLOR: Record<string, string> = {
  contorno: '#2b1a10',
  blanco: '#ffffff',
  moneda: '#f0b429',
  'moneda-sombra': '#c98d10',
  hucha: '#f4a3b5',
  'hucha-sombra': '#d97a92',
  'hucha-luz': '#fbd0da',
  escudo: '#5b8bd6',
  'escudo-sombra': '#3c67ab',
  'escudo-luz': '#a9c6f0',
  corazon: '#e5484d',
  'corazon-luz': '#f7a1a3',
  roca: '#b7bdb5',
  'roca-sombra': '#8f978d',
  cumbre: '#ffffff',
  grafica: '#2f9e5b',
  bandera: '#e5484d',
  tarjeta: '#8a6cd1',
  'tarjeta-sombra': '#6249a8',
  'tarjeta-luz': '#c2b0ee',
  banda: '#2b1a10',
  metal: '#d4dde0',
  'metal-sombra': '#7f8d93',
  estrella: '#f0b429',
}

const VERDE_BOSQUE = '#1b4332'
const VERDE_CLARO = '#d8f3dc'

/** Un sprite como `<svg>` a una escala entera, para que el píxel salga nítido. */
function Dibujo({ sprite, escala }: { sprite: Sprite; escala: number }) {
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length
  return (
    <svg width={ancho * escala} height={alto * escala} viewBox={`0 0 ${ancho} ${alto}`} shapeRendering="crispEdges">
      {[...trazos({ ...sprite, x: 0, y: 0 })].map(([letra, d]) => (
        <path key={letra} d={d} fill={COLOR[PALETA_CAMINO[letra]] ?? 'transparent'} />
      ))}
    </svg>
  )
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: VERDE_BOSQUE,
          color: '#ffffff',
          padding: '64px 72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Dibujo sprite={MONEDA} escala={12} />
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>{NOMBRE_SITIO}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
            {LEMA}
          </div>
          <div style={{ fontSize: 32, color: VERDE_CLARO, maxWidth: 940 }}>
            Construye una relación sana con la economía mediante un videojuego a píxel gratuito.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 56 }}>
          <Dibujo sprite={ESCUDO} escala={6} />
          <Dibujo sprite={HUCHA} escala={6} />
          <Dibujo sprite={MONTANA} escala={6} />
          <Dibujo sprite={TARJETA} escala={6} />
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
            <Dibujo sprite={ESTRELLA} escala={8} />
            <Dibujo sprite={ESTRELLA} escala={8} />
            <Dibujo sprite={ESTRELLA} escala={8} />
          </div>
        </div>
      </div>
    ),
    size,
  )
}
