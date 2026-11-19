/**
 * Las cifras que cuenta la portada ("cuatro mundos", "108 estrellas"), sacadas
 * del contenido y no escritas a mano: un mundo nuevo las cambia solo. Una cifra
 * escrita en el texto es una cifra que acaba mintiendo.
 */

import type { MundoPublicoDto, NivelPublicoDto, TipoNivel } from '@/src/types/heroe.types'

/** Estrellas por nivel: las de la ficha del camino. */
export const ESTRELLAS_POR_NIVEL = 3

export interface Resumen {
  mundos: number
  niveles: number
  estrellas: number
  /** Lo que dura la lección más corta y la más larga. */
  minutosMin: number
  minutosMax: number
  /** El primer nivel del primer mundo: por donde empieza quien entra. */
  primero: NivelPublicoDto | undefined
}

export function resumir(mundos: readonly MundoPublicoDto[]): Resumen {
  const niveles = mundos.flatMap((m) => m.niveles)
  const lecturas = niveles.filter((n) => n.tipo === 'lectura').map((n) => n.minutos)
  return {
    mundos: mundos.length,
    niveles: niveles.length,
    estrellas: niveles.length * ESTRELLAS_POR_NIVEL,
    minutosMin: lecturas.length ? Math.min(...lecturas) : 0,
    minutosMax: lecturas.length ? Math.max(...lecturas) : 0,
    primero: niveles[0],
  }
}

const LETRAS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']

/** "cuatro" hasta diez; a partir de ahí, la cifra. Un número pequeño en letra se lee mejor en una frase. */
export const enLetra = (n: number): string => LETRAS[n] ?? String(n)

/** "Cuatro", para empezar una frase. */
export const enLetraMayuscula = (n: number): string => {
  const t = enLetra(n)
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const QUE_ES: Record<TipoNivel, string> = {
  lectura: 'Lección',
  interactivo: 'Práctica',
  jefe: 'Jefe final',
}

/** "9 niveles · 41 minutos" */
export function medida(mundo: MundoPublicoDto): string {
  const n = mundo.niveles.length
  return `${n} ${n === 1 ? 'nivel' : 'niveles'} · ${mundo.minutos} minutos`
}
