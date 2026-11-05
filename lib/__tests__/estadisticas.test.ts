import fc from 'fast-check'
import { describe, expect, test } from 'vitest'
import { calcularEstadisticas, puntosRiqueza, TRAMOS_RIQUEZA, type DatosEstadisticas } from '../estadisticas'

const DATOS: DatosEstadisticas = {
  mundos: {
    salud: { hechos: 9, total: 9 },
    ahorro: { hechos: 3, total: 9 },
    inversion: { hechos: 1, total: 3 },
    deuda: { hechos: 0, total: 9 },
  },
  ganancia: 100_000,
  mesesEnPositivo: 6,
  precioEquipo: 15,
  maximoEquipable: 75,
}

const valor = (d: DatosEstadisticas, clave: string) =>
  calcularEstadisticas(d).find((e) => e.clave === clave)?.valor

describe('los puntos de Riqueza', () => {
  test.each(TRAMOS_RIQUEZA.map(([g, p]) => [g, p]))('%d céntimos son %d puntos', (ganancia, puntos) => {
    expect(puntosRiqueza(ganancia)).toBe(puntos)
  })

  test('perder dinero es cero, no negativo', () => {
    expect(puntosRiqueza(-5_000_000)).toBe(0)
  })

  test('interpola dentro del tramo', () => {
    expect(puntosRiqueza(5_000)).toBe(10)
    expect(puntosRiqueza(55_000)).toBe(30)
  })

  test('más allá del último tramo se queda en 100', () => {
    expect(puntosRiqueza(10_000_001)).toBe(100)
  })

  test('nunca baja al ganar más y siempre es un entero de 0 a 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -2_000_000_000, max: 2_000_000_000 }),
        fc.integer({ min: 0, max: 2_000_000_000 }),
        (a, extra) => {
          const p = puntosRiqueza(a)
          expect(Number.isInteger(p)).toBe(true)
          expect(p).toBeGreaterThanOrEqual(0)
          expect(p).toBeLessThanOrEqual(100)
          expect(puntosRiqueza(a + extra)).toBeGreaterThanOrEqual(p)
        },
      ),
    )
  })
})

describe('las estadísticas', () => {
  test('son siete, siempre en el mismo orden: el radar no puede bailar', () => {
    expect(calcularEstadisticas(DATOS).map((e) => e.clave)).toEqual([
      'VIT',
      'DEF',
      'ATQ',
      'RES',
      'RIQ',
      'CON',
      'POD',
    ])
  })

  test('cada mundo va a su eje', () => {
    expect(valor(DATOS, 'VIT')).toBe(100)
    expect(valor(DATOS, 'DEF')).toBe(33)
    expect(valor(DATOS, 'ATQ')).toBe(33)
    expect(valor(DATOS, 'RES')).toBe(0)
  })

  test('Riqueza, Constancia y Poder salen de lo suyo', () => {
    expect(valor(DATOS, 'RIQ')).toBe(40)
    expect(valor(DATOS, 'CON')).toBe(50)
    expect(valor(DATOS, 'POD')).toBe(20)
  })

  test('un mundo que no existe o aún no tiene niveles vale cero, sin dividir entre cero', () => {
    const d = { ...DATOS, mundos: { salud: { hechos: 0, total: 0 } } }
    expect(valor(d, 'VIT')).toBe(0)
    expect(valor(d, 'DEF')).toBe(0)
  })

  test('todo equipado es Poder 100, y sin catálogo no revienta', () => {
    expect(valor({ ...DATOS, precioEquipo: 75 }, 'POD')).toBe(100)
    expect(valor({ ...DATOS, maximoEquipable: 0 }, 'POD')).toBe(0)
  })
})
