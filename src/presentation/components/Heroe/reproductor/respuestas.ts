/*
 * Lo que el reproductor necesita saber de una respuesta, sin pintar nada:
 * con qué valor arranca cada ejercicio, cuándo está lista para comprobarse y
 * cómo se enseña la solución.
 *
 * La FORMA de cada respuesta es la que espera el servidor
 * (`heroe.repository.ts`): un índice, un verdadero/falso, una lista de índices
 * o un entero en la unidad mínima. Si el cliente mandara otra cosa, el
 * servidor la rechazaría entera como "respuestas no válidas".
 */

import { formatMoney } from '@/lib/format'
import { DIVISA_APP, money } from '@/lib/money'
import type { Pregunta } from '@/src/types/heroe.types'

/** `null` = aún sin contestar. En emparejar, `null` es el concepto aún sin pareja. */
export type Respuesta = number | boolean | (number | null)[] | null

/**
 * Una permutación de 0..n-1 que NO es la identidad. Los pasos se escriben en
 * el orden bueno, así que enseñarlos sin barajar daría la respuesta hecha.
 * `aleatorio` se inyecta para poder probarlo.
 */
export function barajar(n: number, aleatorio: () => number = Math.random): number[] {
  const orden = [...Array(n).keys()]
  if (n < 2) return orden
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1))
    ;[orden[i], orden[j]] = [orden[j], orden[i]]
  }
  // Si ha salido ordenado, se rota uno: volver a barajar en bucle se
  // colgaría con un azar que repite siempre lo mismo.
  if (orden.every((v, i) => v === i)) orden.push(orden.shift() as number)
  return orden
}

export function valorInicial(pregunta: Pregunta, aleatorio?: () => number): Respuesta {
  switch (pregunta.tipo) {
    case 'ordenar':
      return barajar(pregunta.pasos.length, aleatorio)
    case 'emparejar':
      return pregunta.pares.map(() => null)
    default:
      return null
  }
}

/** Si ya se puede comprobar (o pasar a la siguiente). */
export function completa(pregunta: Pregunta, valor: Respuesta): boolean {
  switch (pregunta.tipo) {
    case 'opcion':
    case 'hueco':
    case 'calcula':
      return typeof valor === 'number'
    case 'verdaderoFalso':
      return typeof valor === 'boolean'
    case 'ordenar':
      return Array.isArray(valor)
    case 'emparejar':
      // Cada concepto con una definición y ninguna repetida: el servidor
      // espera una permutación, y una repetida la rechazaría entera.
      return (
        Array.isArray(valor) &&
        valor.every((v) => v !== null) &&
        new Set(valor).size === valor.length
      )
  }
}

const PORCENTAJE = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** Una cifra de `calcula` para leer: la unidad mínima solo se divide al formatear (regla dura 1). */
export function formatoCifra(unidad: 'euros' | 'porcentaje' | 'numero', valor: number): string {
  if (unidad === 'euros') return formatMoney(money(valor, DIVISA_APP))
  if (unidad === 'porcentaje') return `${PORCENTAJE.format(valor / 100)} %`
  return new Intl.NumberFormat('es-ES').format(valor)
}

/** La respuesta buena, dicha con palabras, para la explicación al fallar. */
export function solucion(pregunta: Pregunta): string {
  switch (pregunta.tipo) {
    case 'opcion':
    case 'hueco':
      return pregunta.opciones[pregunta.correcta]
    case 'verdaderoFalso':
      return pregunta.correcta ? 'Verdadero' : 'Falso'
    case 'ordenar':
      return pregunta.pasos.map((p, i) => `${i + 1}. ${p}`).join(' · ')
    case 'emparejar':
      return pregunta.pares.map((p) => `${p.concepto}: ${p.definicion}`).join(' · ')
    case 'calcula':
      return formatoCifra(pregunta.unidad, pregunta.solucion)
  }
}
