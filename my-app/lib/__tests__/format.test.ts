import { describe, expect, test } from 'vitest'
import fc from 'fast-check'
import { money } from '@/lib/money'
import {
  formatDate,
  formatDateLong,
  formatMoney,
  formatMoneySigned,
  formatPeriod,
  formatPercent,
  parseMoney,
} from '@/lib/format'

const anyCents = fc.integer({ min: -100_000_000, max: 100_000_000 })

describe('formatMoney', () => {
  test('es-ES: decimal con coma y símbolo detrás', () => {
    expect(formatMoney(money(0))).toMatch(/^0,00\s€$/u)
    expect(formatMoney(money(-1))).toMatch(/^-0,01\s€$/u)
    expect(formatMoney(money(50))).toMatch(/^0,50\s€$/u)
  })

  test('el castellano no agrupa los números de cuatro dígitos', () => {
    // Regla real de es-ES (minimumGroupingDigits = 2): 1234,56 € va sin punto,
    // pero 12.345,67 € sí lo lleva. Construir el formato a mano se equivoca aquí.
    expect(formatMoney(money(123456))).toMatch(/^1234,56\s€$/u)
    expect(formatMoney(money(1234567))).toMatch(/^12\.345,67\s€$/u)
  })

  test('respeta la divisa', () => {
    expect(formatMoney(money(100, 'USD'))).toContain('1,00')
    expect(formatMoney(money(100, 'GBP'))).toContain('1,00')
  })

  test('formatMoneySigned marca el signo salvo en el cero', () => {
    expect(formatMoneySigned(money(1000))).toMatch(/^\+/)
    expect(formatMoneySigned(money(-1000))).toMatch(/^-/)
    expect(formatMoneySigned(money(0))).not.toMatch(/^[+-]/)
  })
})

describe('parseMoney', () => {
  test('acepta las formas que escribe una persona', () => {
    expect(parseMoney('1.234,56')?.amount).toBe(123456)
    expect(parseMoney('1234,56')?.amount).toBe(123456)
    expect(parseMoney('1234.56')?.amount).toBe(123456)
    expect(parseMoney('1.234.567,89')?.amount).toBe(123456789)
    expect(parseMoney('12')?.amount).toBe(1200)
    expect(parseMoney('  12,5 € ')?.amount).toBe(1250)
    expect(parseMoney('-45,10')?.amount).toBe(-4510)
    expect(parseMoney('+45,10')?.amount).toBe(4510)
  })

  test('trunca los decimales sobrantes, no los redondea', () => {
    // Quien escribe 1,999 quiere decir 1,99. Redondear a 2,00 es inventar dinero.
    expect(parseMoney('1,999')?.amount).toBe(199)
  })

  test('devuelve null ante entrada inválida en lugar de lanzar', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('   ')).toBeNull()
    expect(parseMoney('doce euros')).toBeNull()
    expect(parseMoney('1,2,3')).toBeNull()
    expect(parseMoney('--5')).toBeNull()
  })

  test('el espacio no separable del símbolo no rompe el parseo', () => {
    // Intl mete U+00A0 (o U+202F) antes del €. Es el fallo clásico de usar trim().
    expect(parseMoney('1.234,56 €')?.amount).toBe(123456)
    expect(parseMoney('1.234,56 €')?.amount).toBe(123456)
  })
})

describe('ida y vuelta', () => {
  test('formatear y parsear devuelve el importe original', () => {
    // La propiedad que más bugs reales encuentra: rompe con el separador de
    // miles, con los negativos y con el espacio no separable del símbolo.
    fc.assert(
      fc.property(anyCents, (cents) => {
        expect(parseMoney(formatMoney(money(cents)))?.amount).toBe(cents)
      }),
    )
  })

  test('también con signo explícito', () => {
    fc.assert(
      fc.property(anyCents, (cents) => {
        expect(parseMoney(formatMoneySigned(money(cents)))?.amount).toBe(cents)
      }),
    )
  })
})

describe('fechas y porcentajes', () => {
  test('formatDate no depende del huso', () => {
    expect(formatDate('2026-08-13')).toBe('13/08/2026')
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
    expect(formatDate('2026-12-31')).toBe('31/12/2026')
  })

  test('formatDateLong y formatPeriod en castellano', () => {
    expect(formatDateLong('2026-08-13')).toBe('13 de agosto de 2026')
    expect(formatPeriod('2026-08')).toBe('agosto de 2026')
  })

  test('formatPercent', () => {
    expect(formatPercent(0.85)).toMatch(/^85\s?%$/u)
    expect(formatPercent(1.8)).toMatch(/^180\s?%$/u)
  })
})
