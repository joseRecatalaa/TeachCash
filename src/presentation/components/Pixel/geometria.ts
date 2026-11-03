/*
 * Formas a píxel para trazos SVG. Funciones puras: el servidor y el cliente
 * tienen que pintar exactamente lo mismo, o React avisa de un desajuste de
 * hidratación.
 */

/** Un círculo relleno de radio `r`, fila a fila: un `<path>` y no un `<circle>`, que saldría suave. */
export function circulo(cx: number, cy: number, r: number): string {
  let d = ''
  for (let dy = -r; dy <= r; dy++) {
    const m = Math.round(Math.sqrt(r * r - dy * dy))
    d += `M${cx - m} ${cy + dy}h${m * 2 + 1}v1h-${m * 2 + 1}z`
  }
  return d
}

/**
 * Las celdas de un recuadro que cumplen `dentro`, como un trazo de rachas
 * horizontales (igual que `PixelSprite`). Sirve para formas que no son un
 * círculo entero: la sombra de un planeta es "dentro del planeta y fuera de
 * un círculo desplazado".
 */
export function trazoDonde(
  x0: number,
  y0: number,
  ancho: number,
  alto: number,
  dentro: (x: number, y: number) => boolean,
): string {
  let d = ''
  for (let y = y0; y < y0 + alto; y++) {
    let x = x0
    while (x < x0 + ancho) {
      if (!dentro(x, y)) {
        x++
        continue
      }
      let fin = x + 1
      while (fin < x0 + ancho && dentro(fin, y)) fin++
      d += `M${x} ${y}h${fin - x}v1h-${fin - x}z`
      x = fin
    }
  }
  return d
}

/** Si la celda (x, y) cae en el círculo de centro (cx, cy) y radio r, medido desde el centro de la celda. */
export const enCirculo = (cx: number, cy: number, r: number) => (x: number, y: number) =>
  (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r
