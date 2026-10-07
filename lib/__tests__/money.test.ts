import { describe, expect, test } from 'vitest'
import fc from 'fast-check'
import {
  abs,
  add,
  allocate,
  asCurrency,
  compare,
  equals,
  isCurrency,
  isNegative,
  isPositive,
  isZero,
  money,
  mul,
  neg,
  sub,
  sum,
  sumByCurrency,
  zero,
} from '@/lib/money'

// Un millón de euros en céntimos: rango holgado para finanzas personales y muy
// lejos de MAX_SAFE_INTEGER, así que ninguna propiedad falla por desbordamiento.
const anyCents = fc.integer({ min: -100_000_000, max: 100_000_000 })

describe('construcción', () => {
  test('rechaza un importe no entero', () => {
    expect(() => money(12.5)).toThrow(TypeError)
    expect(() => money(0.1 + 0.2)).toThrow(TypeError)
  })

  test('rechaza NaN e Infinity', () => {
    expect(() => money(NaN)).toThrow(TypeError)
    expect(() => money(Infinity)).toThrow(TypeError)
  })

  test('normaliza -0 a 0', () => {
    // Object.is(-0, 0) es false: un -0 colado por un Math.round rompe comparaciones
    // mucho más adelante, donde ya no se ve de dónde vino.
    expect(Object.is(money(-0).amount, 0)).toBe(true)
    expect(Object.is(mul(money(1), -0.4).amount, 0)).toBe(true)
  })
})

describe('aritmética', () => {
  test('suma y resta del mismo importe dejan el original', () => {
    fc.assert(
      fc.property(anyCents, anyCents, (a, b) => {
        expect(sub(add(money(a), money(b)), money(b)).amount).toBe(a)
      }),
    )
  })

  test('la suma es conmutativa', () => {
    fc.assert(
      fc.property(anyCents, anyCents, (a, b) => {
        expect(add(money(a), money(b))).toEqual(add(money(b), money(a)))
      }),
    )
  })

  test('operar divisas distintas lanza', () => {
    expect(() => add(money(100, 'EUR'), money(100, 'USD'))).toThrow(TypeError)
    expect(() => sub(money(100, 'EUR'), money(100, 'GBP'))).toThrow(TypeError)
    expect(() => compare(money(100, 'EUR'), money(100, 'USD'))).toThrow(TypeError)
  })

  test('neg y abs', () => {
    expect(neg(money(-250)).amount).toBe(250)
    expect(abs(money(-250)).amount).toBe(250)
    expect(abs(money(250)).amount).toBe(250)
    expect(Object.is(neg(money(0)).amount, 0)).toBe(true)
  })

  test('equals compara importe y divisa', () => {
    expect(equals(money(100, 'EUR'), money(100, 'EUR'))).toBe(true)
    expect(equals(money(100, 'EUR'), money(100, 'USD'))).toBe(false)
  })

  test('mul redondea a entero con la política que se le pase', () => {
    expect(mul(money(1000), 0.21).amount).toBe(210)
    expect(mul(money(333), 1 / 3).amount).toBe(111)
    expect(mul(money(101), 0.5).amount).toBe(51) // Math.round: 50,5 → 51
    expect(mul(money(101), 0.5, Math.floor).amount).toBe(50)
  })
})

describe('sumar listas', () => {
  test('la lista vacía necesita divisa explícita', () => {
    expect(sum([])).toEqual(zero('EUR'))
    expect(sum([], 'USD')).toEqual(zero('USD'))
  })

  test('mezclar divisas en una suma plana lanza', () => {
    expect(() => sum([money(100, 'EUR'), money(100, 'USD')])).toThrow(TypeError)
  })

  test('sumByCurrency agrupa en lugar de mezclar', () => {
    const total = sumByCurrency([
      money(1000, 'EUR'),
      money(500, 'USD'),
      money(-250, 'EUR'),
      money(1, 'GBP'),
    ])
    expect(total).toEqual([money(750, 'EUR'), money(1, 'GBP'), money(500, 'USD')])
  })

  test('sumByCurrency de una lista vacía no inventa divisas', () => {
    expect(sumByCurrency([])).toEqual([])
  })
})

describe('reparto', () => {
  test('el reparto conserva el total exactamente', () => {
    fc.assert(
      fc.property(
        anyCents,
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 20 }),
        (total, weights) => {
          fc.pre(weights.some((w) => w > 0)) // pesos todos a cero es un error, no un reparto
          const parts = allocate(money(total), weights)
          expect(sum(parts).amount).toBe(total)
        },
      ),
    )
  })

  test('100 € entre 3 no pierde el céntimo', () => {
    const parts = allocate(money(10000), [1, 1, 1])
    expect(parts.map((p) => p.amount)).toEqual([3334, 3333, 3333])
    expect(sum(parts).amount).toBe(10000)
  })

  test('reparto entre 7', () => {
    const parts = allocate(money(10000), [1, 1, 1, 1, 1, 1, 1])
    expect(sum(parts).amount).toBe(10000)
    // 10000/7 = 1428,57 → 1428 a cada uno y 4 céntimos de resto a los 4 primeros.
    expect(parts.filter((p) => p.amount === 1429)).toHaveLength(4)
  })

  test('un peso de 0 no recibe el resto', () => {
    const parts = allocate(money(10000), [1, 0, 1, 1])
    expect(parts[1].amount).toBe(0)
    expect(sum(parts).amount).toBe(10000)
  })

  test('reparte totales negativos sin descuadre', () => {
    const parts = allocate(money(-10000), [1, 1, 1])
    expect(sum(parts).amount).toBe(-10000)
  })

  test('rechaza entradas imposibles', () => {
    expect(() => allocate(money(100), [])).toThrow(TypeError)
    expect(() => allocate(money(100), [0, 0])).toThrow(TypeError)
    expect(() => allocate(money(100), [1, -1])).toThrow(TypeError)
  })

  test('conserva la divisa del total', () => {
    expect(allocate(money(300, 'USD'), [1, 1]).every((p) => p.currency === 'USD')).toBe(true)
  })
})

describe('multiplicar con negativos', () => {
  // Math.round no es simétrico: redondea las mitades hacia +∞, así que -50,5
  // da -50 y 50,5 da 51. Es la política documentada de `mul`; si algún día se
  // cambia a "mitad lejos del cero", este test es el que tiene que cambiar.
  test('las mitades negativas suben hacia el cero', () => {
    expect(mul(money(-101), 0.5).amount).toBe(-50)
    expect(mul(money(101), 0.5).amount).toBe(51)
  })

  test('un resultado de -0,5 céntimos no deja un -0', () => {
    // Math.round(-0.5) es -0; `money` lo normaliza. Un -0 que se cuele se pinta
    // "-0,00 €" y Object.is(-0, 0) es false.
    expect(Object.is(mul(money(-1), 0.5).amount, 0)).toBe(true)
  })

  test('la política de redondeo se puede inyectar', () => {
    expect(mul(money(-101), 0.5, Math.floor).amount).toBe(-51)
    expect(mul(money(-101), 0.5, Math.trunc).amount).toBe(-50)
  })

  test('multiplicar por un factor entero es exacto', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000_00, max: 1_000_000_00 }),
        fc.integer({ min: -100, max: 100 }),
        (centimos, factor) => {
          expect(mul(money(centimos), factor).amount).toBe(centimos * factor + 0)
        },
      ),
    )
  })
})

describe('reparto justo', () => {
  const totales = fc.integer({ min: -1_000_000_00, max: 1_000_000_00 })
  const pesos = fc
    .array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 12 })
    .filter((w) => w.some((x) => x > 0))

  test('cada parte es su cuota redondeada abajo, más como mucho un céntimo', () => {
    // El contrato de la skill money-and-currency: suelo + reparto del resto de
    // uno en uno. NO es "la más cercana a la cuota exacta": el resto va por
    // orden, así que una parte con cuota entera puede llevarse un céntimo que
    // otra con ,8 no recibe (fast-check lo encontró: 13555737 entre
    // [64, 8, 2, 1, 35, 98]). El orden es una decisión de producto; ver el
    // test de abajo.
    fc.assert(
      fc.property(totales, pesos, (total, w) => {
        const totalPeso = w.reduce((a, b) => a + b, 0)
        allocate(money(total), w).forEach((parte, i) => {
          const suelo = Math.floor((total * w[i]) / totalPeso)
          expect(parte.amount - suelo).toBeGreaterThanOrEqual(0)
          expect(parte.amount - suelo).toBeLessThanOrEqual(1)
        })
      }),
    )
  })

  test('el resto se reparte por orden, empezando por el primero con peso', () => {
    // Decisión fijada: determinista y por posición. Si se cambia a "mayor
    // parte fraccionaria", este es el test que tiene que cambiar.
    expect(allocate(money(13555737), [64, 8, 2, 1, 35, 98]).map((m) => m.amount)).toEqual([
      4170997, 521375, 130344, 65171, 2281013, 6386837,
    ])
  })

  test('a quien tiene peso 0 no le toca nada, ni el céntimo del resto', () => {
    fc.assert(
      fc.property(totales, pesos, (total, w) => {
        allocate(money(total), w).forEach((parte, i) => {
          if (w[i] === 0) expect(parte.amount).toBe(0)
        })
      }),
    )
  })
})

describe('predicados y divisas', () => {
  test('isZero, isNegative e isPositive miran el signo', () => {
    const signos = (c: number) => [isZero(money(c)), isNegative(money(c)), isPositive(money(c))]
    expect(signos(0)).toEqual([true, false, false])
    expect(signos(-1)).toEqual([false, true, false])
    expect(signos(1)).toEqual([false, false, true])
  })

  test('solo se aceptan las divisas conocidas', () => {
    expect(isCurrency('EUR')).toBe(true)
    expect(isCurrency('eur')).toBe(false)
    expect(isCurrency('BTC')).toBe(false)
    expect(asCurrency('USD')).toBe('USD')
    expect(() => asCurrency('BTC')).toThrow(/Divisa desconocida/)
  })

  test('un importe fuera del rango exacto de Number se rechaza', () => {
    expect(() => money(Number.MAX_SAFE_INTEGER + 1)).toThrow(TypeError)
  })
})
