/**
 * El contenido REAL del Camino del héroe (`content/heroe/`).
 *
 * Es el test que rompe la CI cuando un curso nuevo está mal escrito, y el que
 * lanza `pnpm heroe:validar` mientras se escribe. La carga (`cargarContenido`)
 * ya comprueba el formato de cada JSON, que los ids casan con su ruta, que no
 * falta ni sobra ningún nivel y que cada mundo acaba en su jefe; aquí se
 * añaden las reglas del diseño que no son de formato.
 */

import { beforeAll, describe, expect, test } from 'vitest'
import { cargarContenido, type Contenido } from '@/src/infrastructure/heroe/contenido'
import type { Nivel, Pregunta } from '@/src/types/heroe.types'

let contenido: Contenido

beforeAll(async () => {
  contenido = await cargarContenido()
})

const niveles = () => [...contenido.niveles.values()]

/** Las preguntas de un nivel, sea del tipo que sea. (`evaluables` es del servidor y no se importa aquí.) */
function preguntasDe(n: Nivel): Pregunta[] {
  if (n.tipo === 'lectura') return n.minitest
  if (n.tipo === 'interactivo') return n.ejercicios
  return n.preguntas
}

test('todo el contenido carga y pasa el formato', () => {
  expect(contenido.mundos.length).toBeGreaterThan(0)
})

describe('mundos', () => {
  test('cada uno con su dibujo: dos mundos iguales en el mapa no se distinguen', () => {
    const decorados = contenido.mundos.map((m) => m.decorado)
    expect(new Set(decorados).size).toBe(decorados.length)
  })

  test('sin dos mundos en la misma posición del mapa', () => {
    const ordenes = contenido.mundos.map((m) => m.orden)
    expect(new Set(ordenes).size).toBe(ordenes.length)
  })
})

describe('niveles', () => {
  test('toda lectura tiene minitest y ningún interactivo lo tiene', () => {
    const mal = niveles().filter((n) => 'minitest' in n !== (n.tipo === 'lectura'))
    expect(mal.map((n) => n.id)).toEqual([])
  })

  // `calcula` sigue existiendo en el código, pero el contenido no la usa: una
  // cuenta con decimales obliga a salir de la app a por la calculadora, y lo
  // que se quiere comprobar es que se ha entendido la idea, no la aritmética.
  test('ninguna pregunta pide hacer cuentas (`calcula`)', () => {
    const conCuentas = niveles().flatMap((n) =>
      preguntasDe(n)
        .filter((p) => p.tipo === 'calcula')
        .map((p) => `${n.id}#${p.id}`),
    )
    expect(conCuentas).toEqual([])
  })

  test('ningún título de nivel se repite', () => {
    const titulos = niveles().map((n) => n.titulo)
    expect(new Set(titulos).size).toBe(titulos.length)
  })
})
