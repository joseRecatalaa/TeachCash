/*
 * Pinta un sprite de `sprites.ts` como SVG.
 *
 * Un `<path>` por COLOR, no un `<rect>` por píxel: cada racha horizontal del
 * mismo color es un subtrazo `M x y h n v1 h-n z`. La pantalla de carga va en
 * el HTML de TODAS las respuestas (el servidor no sabe si ya se vio), y con un
 * `<rect>` por píxel pesaba decenas de KB para un dibujo de 32x40.
 *
 * Los bordes nítidos los pone `shape-rendering: crispEdges` en el `<svg>` de la
 * escena; sin él, el navegador suaviza los cantos y el píxel se emborrona.
 */

import type { Paleta, Sprite } from './sprites'

function trazos(sprite: Sprite): Map<string, string> {
  const porColor = new Map<string, string>()
  sprite.filas.forEach((fila, j) => {
    let i = 0
    while (i < fila.length) {
      const clave = fila[i]
      let fin = i + 1
      while (fin < fila.length && fila[fin] === clave) fin++
      if (clave !== '.') {
        const d = `M${sprite.x + i} ${sprite.y + j}h${fin - i}v1h-${fin - i}z`
        porColor.set(clave, (porColor.get(clave) ?? '') + d)
      }
      i = fin
    }
  })
  return porColor
}

export function PixelSprite({
  sprite,
  paleta,
  className,
}: {
  sprite: Sprite
  paleta: Paleta
  className?: string
}) {
  return (
    <g className={className}>
      {[...trazos(sprite)].map(([clave, d]) => (
        <path key={clave} d={d} fill={`var(--px-${paleta[clave]})`} />
      ))}
    </g>
  )
}
