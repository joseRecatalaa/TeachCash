/**
 * Negrita y cursiva en el texto del contenido: `**negrita**` y `_cursiva_`.
 *
 * Un analizador pequeño que devuelve un árbol de nodos, y no HTML: quien lo
 * pinta (`Marcado.tsx`) monta elementos de React, sin `dangerouslySetInnerHTML`.
 * El texto es contenido escrito a mano y la CSP es estricta; convertirlo en
 * HTML abriría la puerta a meter etiquetas por el contenido.
 *
 * Lo usan también los esquemas del contenido (`heroe.types.ts`): una marca sin
 * cerrar es una errata, y se para en `pnpm heroe:validar` y en la CI.
 *
 * Reglas, pensadas para que el texto normal no se convierta en marcas:
 *  - una marca ABRE pegada a lo que marca y sin una letra o cifra delante
 *    (`**así**`, no `3 ** 4` ni `mi_variable`);
 *  - CIERRA pegada a lo marcado y sin una letra o cifra detrás;
 *  - un `*` suelto no es nada ("3 * 4"), y dos o más `_` seguidos tampoco
 *    (es el hueco de los ejercicios, `___`);
 *  - se pueden anidar (`**muy _importante_**`); una marca solo cierra la
 *    última que se abrió.
 */

export type Marca = 'strong' | 'em'
export type NodoMarcado = string | { marca: Marca; hijos: NodoMarcado[] }

export interface Analisis {
  nodos: NodoMarcado[]
  /** Las marcas que se abrieron y no se cerraron, en el orden en que se abrieron. */
  sinCerrar: ('**' | '_')[]
}

const SIMBOLO: Record<Marca, '**' | '_'> = { strong: '**', em: '_' }

const esPalabra = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c)
const esEspacio = (c: string | undefined) => c === undefined || /\s/.test(c)

type Marco = { marca: Marca | null; hijos: NodoMarcado[] }

/** Añade texto al marco, juntándolo con el texto anterior si lo hay. */
function anadirTexto(marco: Marco, texto: string) {
  const ultimo = marco.hijos.at(-1)
  if (typeof ultimo === 'string') marco.hijos[marco.hijos.length - 1] = ultimo + texto
  else marco.hijos.push(texto)
}

/** Qué marca empieza en la posición `i`, si alguna. */
function marcaEn(texto: string, i: number): Marca | null {
  if (texto.startsWith('**', i)) return texto[i + 2] === '*' || texto[i - 1] === '*' ? null : 'strong'
  if (texto[i] === '_') return texto[i + 1] === '_' || texto[i - 1] === '_' ? null : 'em'
  return null
}

/**
 * Una marca encontrada en el texto: cierra la última abierta si es la misma
 * y está pegada a lo marcado; si no, abre una nueva si está pegada a lo que
 * sigue; y si no hace ninguna de las dos cosas, es texto.
 */
function aplicarMarca(pila: Marco[], marca: Marca, antes: string | undefined, despues: string | undefined) {
  const arriba = pila[pila.length - 1]
  if (arriba.marca === marca && !esEspacio(antes) && !esPalabra(despues)) {
    pila.pop()
    pila[pila.length - 1].hijos.push({ marca, hijos: arriba.hijos })
  } else if (!esEspacio(despues) && !esPalabra(antes)) {
    pila.push({ marca, hijos: [] })
  } else {
    anadirTexto(arriba, SIMBOLO[marca])
  }
}

export function analizar(texto: string): Analisis {
  const pila: Marco[] = [{ marca: null, hijos: [] }]
  let i = 0

  while (i < texto.length) {
    const marca = marcaEn(texto, i)
    if (!marca) {
      anadirTexto(pila[pila.length - 1], texto[i])
      i++
      continue
    }
    aplicarMarca(pila, marca, texto[i - 1], texto[i + SIMBOLO[marca].length])
    i += SIMBOLO[marca].length
  }

  // Lo que quedó abierto se devuelve como texto, con su símbolo delante: el
  // lector enseña lo que hay escrito, y el validador avisa.
  const sinCerrar: ('**' | '_')[] = []
  while (pila.length > 1) {
    const abierto = pila.pop() as Marco
    const marca = abierto.marca as Marca
    sinCerrar.unshift(SIMBOLO[marca])
    const destino = pila[pila.length - 1]
    anadirTexto(destino, SIMBOLO[marca])
    for (const hijo of abierto.hijos) {
      if (typeof hijo === 'string') anadirTexto(destino, hijo)
      else destino.hijos.push(hijo)
    }
  }

  return { nodos: pila[0].hijos, sinCerrar }
}

/** El mensaje del validador para un texto con marcas sin cerrar, o `null` si está bien. */
export function errorDeMarcas(texto: string): string | null {
  const { sinCerrar } = analizar(texto)
  if (sinCerrar.length === 0) return null
  const nombres = sinCerrar.map((m) => (m === '**' ? 'una negrita (**)' : 'una cursiva (_)'))
  return `Hay ${nombres.join(' y ')} sin cerrar`
}

/** El texto que se lee, sin las marcas: para un `aria-label`, que no admite negritas. */
export function sinMarcas(texto: string): string {
  const plano = (nodos: NodoMarcado[]): string =>
    nodos.map((n) => (typeof n === 'string' ? n : plano(n.hijos))).join('')
  return plano(analizar(texto).nodos)
}
