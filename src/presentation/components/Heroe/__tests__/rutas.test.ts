/**
 * Las rutas limpias del Camino: el id va en el camino, y la página lo
 * recompone desde los segmentos. Si `rutaNivel` y `segmento` no fueran la una
 * inversa de la otra, "Siguiente nivel" llevaría a un nivel que no existe.
 */

import { describe, expect, test } from 'vitest'
import { rutaMundo, rutaNivel, segmento } from '../rutas'

describe('rutas del Camino', () => {
  test('un mundo es /CaminoHeroe/<mundo>', () => {
    expect(rutaMundo('ahorro')).toBe('/CaminoHeroe/ahorro')
  })

  test('un nivel lleva su mundo como un segmento más, sin codificar la barra', () => {
    expect(rutaNivel('ahorro/01-fondo-de-emergencia')).toBe('/CaminoHeroe/ahorro/01-fondo-de-emergencia')
  })

  test('cada trozo se codifica por separado', () => {
    expect(rutaNivel('a b/c?d')).toBe('/CaminoHeroe/a%20b/c%3Fd')
  })

  test('segmento deshace la codificación y deja igual lo que llega en claro', () => {
    expect(segmento('a%20b')).toBe('a b')
    expect(segmento('ahorro')).toBe('ahorro')
    expect(segmento(undefined)).toBe('')
    expect(segmento(['ahorro', '02'])).toBe('ahorro/02')
  })

  test('un segmento mal codificado no rompe la página: se queda como llegó', () => {
    expect(segmento('%E0%A4%A')).toBe('%E0%A4%A')
  })
})
