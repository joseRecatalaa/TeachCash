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
