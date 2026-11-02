/*
 * Pinta un texto del contenido con su `**negrita**` y su `_cursiva_`
 * (`lib/marcas.ts`) como elementos de React: `<strong>` y `<em>` de verdad,
 * sin `dangerouslySetInnerHTML`. Lo que no es una marca sale como texto,
 * escapado por React igual que cualquier otro.
 */

import { Fragment, type ReactNode } from 'react'
import { analizar, type NodoMarcado } from '@/lib/marcas'

function pintar(nodos: NodoMarcado[]): ReactNode[] {
  return nodos.map((nodo, k) => {
    if (typeof nodo === 'string') return <Fragment key={k}>{nodo}</Fragment>
    const Etiqueta = nodo.marca
    return <Etiqueta key={k}>{pintar(nodo.hijos)}</Etiqueta>
  })
}

export function Marcado({ texto }: { texto: string }) {
  return <>{pintar(analizar(texto).nodos)}</>
}
