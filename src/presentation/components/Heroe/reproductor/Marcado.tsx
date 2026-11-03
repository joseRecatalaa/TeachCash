/*
 * Pinta un texto del contenido con su `**negrita**` y su `_cursiva_`
 * (`lib/marcas.ts`) como elementos de React: `<strong>` y `<em>` de verdad,
 * sin `dangerouslySetInnerHTML`. Lo que no es una marca sale como texto,
 * escapado por React igual que cualquier otro.
 *
 * Los emoticonos van en su propio `<span data-emoji>`, que el CSS pasa por
 * el filtro de `FiltroPixel`: salen pixelados, como el resto del módulo. Son
 * texto igualmente, y el lector de pantalla los lee (un ✅ o un ❌ dicen algo).
 */

import { Fragment, type ReactNode } from 'react'
import { analizar, type NodoMarcado } from '@/lib/marcas'
import styles from './Marcado.module.css'

/** Un emoticono entero: con su variante, sus uniones (👨‍👩‍👧) o un número en tecla (1️⃣). */
const EMOTICONO =
  /(\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic})*|[0-9#*]️?⃣)/u

function conEmoticonos(texto: string): ReactNode[] {
  return texto.split(EMOTICONO).map((trozo, k) =>
    k % 2 === 1 ? (
      <span key={k} data-emoji className={styles.emoji}>
        {trozo}
      </span>
    ) : (
      <Fragment key={k}>{trozo}</Fragment>
    ),
  )
}

function pintar(nodos: NodoMarcado[]): ReactNode[] {
  return nodos.map((nodo, k) => {
    if (typeof nodo === 'string') return <Fragment key={k}>{conEmoticonos(nodo)}</Fragment>
    const Etiqueta = nodo.marca
    return <Etiqueta key={k}>{pintar(nodo.hijos)}</Etiqueta>
  })
}

export function Marcado({ texto }: { texto: string }) {
  return <>{pintar(analizar(texto).nodos)}</>
}

/**
 * El filtro que pixela los emoticonos: recorta la imagen a un píxel de cada
 * cuadro de 3x3 y lo agranda hasta llenar el cuadro. Se pinta UNA vez por
 * pantalla (lo pone `PaginaHeroe`) y los `span` lo usan por su id.
 */
export const ID_FILTRO_PIXEL = 'tc-pixelar'

export function FiltroPixel() {
  return (
    <svg className={styles.filtro} aria-hidden="true" focusable="false">
      <filter id={ID_FILTRO_PIXEL} x="0" y="0" width="1" height="1">
        <feFlood x="1" y="1" width="1" height="1" />
        <feComposite width="3" height="3" />
        <feTile result="rejilla" />
        <feComposite in="SourceGraphic" in2="rejilla" operator="in" />
        <feMorphology operator="dilate" radius="1" />
      </filter>
    </svg>
  )
}
