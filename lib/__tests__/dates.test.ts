import { describe, expect, test } from 'vitest'
import fc from 'fast-check'
import {
  addDays,
  addMonths,
  compareDates,
  currentPeriod,
  daysBetween,
  daysInMonth,
  eachDay,
  fromEpochDay,
  isCivilDate,
  isLeapYear,
  lastNMonths,
  monthRange,
  periodOf,
  toEpochDay,
  today,
} from '@/lib/dates'

describe('validación', () => {
  test('acepta fechas civiles bien formadas', () => {
    expect(isCivilDate('2026-08-13')).toBe(true)
    expect(isCivilDate('2024-02-29')).toBe(true)
  })

  test('rechaza días que no existen', () => {
    expect(isCivilDate('2026-02-30')).toBe(false)
    expect(isCivilDate('2026-02-29')).toBe(false) // 2026 no es bisiesto
    expect(isCivilDate('2026-04-31')).toBe(false)
    expect(isCivilDate('2026-13-01')).toBe(false)
    expect(isCivilDate('13/08/2026')).toBe(false)
    expect(isCivilDate('2026-8-13')).toBe(false)
  })

  test('años bisiestos, incluida la regla de los siglos', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(1900)).toBe(false) // divisible por 100
    expect(isLeapYear(2000)).toBe(true) // divisible por 400
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2026, 4)).toBe(30)
  })
})

describe('aritmética de días', () => {
  test('epochDay ida y vuelta', () => {
    fc.assert(
      fc.property(fc.integer({ min: -25_000, max: 25_000 }), (n) => {
        expect(toEpochDay(fromEpochDay(n))).toBe(n)
      }),
    )
  })

  test('el epoch está donde debe', () => {
    expect(toEpochDay('1970-01-01')).toBe(0)
    expect(fromEpochDay(0)).toBe('1970-01-01')
  })

  test('cruza fin de mes y fin de año', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  test('los días de cambio de hora tienen 1 día, no 23 ni 25 horas', () => {
    // El bug clásico: sumar 86.400.000 ms a un Date el día del cambio de hora
    // deja la fecha en el mismo día o se salta uno. Aquí no hay milisegundos.
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30') // último domingo de marzo
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26') // último domingo de octubre
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })

  test('compareDates ordena como fechas', () => {
    expect(compareDates('2026-01-01', '2026-01-02')).toBe(-1)
    expect(compareDates('2026-01-02', '2026-01-01')).toBe(1)
    expect(compareDates('2026-01-01', '2026-01-01')).toBe(0)
  })

  test('eachDay incluye ambos extremos', () => {
    expect(eachDay('2026-02-26', '2026-03-01')).toEqual([
      '2026-02-26',
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ])
    expect(eachDay('2026-01-01', '2026-01-01')).toEqual(['2026-01-01'])
    expect(eachDay('2026-01-02', '2026-01-01')).toEqual([])
    expect(eachDay('2024-02-01', '2024-02-29')).toHaveLength(29)
  })
})

describe('periodos', () => {
  test('el primer y el último día del mes caen en su mes', () => {
    expect(periodOf('2026-08-01')).toBe('2026-08')
    expect(periodOf('2026-08-31')).toBe('2026-08')
    expect(periodOf('2026-12-31')).toBe('2026-12')
  })

  test('monthRange cubre el mes completo', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthRange('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
    expect(monthRange('2026-04')).toEqual({ from: '2026-04-01', to: '2026-04-30' })
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })

  test('addMonths no produce el 31 de febrero', () => {
    // Sumar meses a un Date del día 31 desborda al mes siguiente. Aquí se opera
    // sobre año/mes, no sobre un día concreto, así que no puede pasar.
    expect(addMonths('2026-01', 1)).toBe('2026-02')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-01', -13)).toBe('2024-12')
    expect(addMonths('2026-06', 12)).toBe('2027-06')
    expect(addMonths('2026-06', 0)).toBe('2026-06')
  })

  test('lastNMonths va del más antiguo al más reciente', () => {
    expect(lastNMonths(3, '2026-01')).toEqual(['2025-11', '2025-12', '2026-01'])
    expect(lastNMonths(1, '2026-08')).toEqual(['2026-08'])
    expect(lastNMonths(12, '2026-08')).toHaveLength(12)
  })
})

describe('hoy', () => {
  test('depende del huso del usuario, no del servidor', () => {
    // 13 de agosto a las 22:30 UTC ya es día 14 en Madrid (UTC+2 en verano).
    const instant = new Date('2026-08-13T22:30:00Z')
    expect(today('Europe/Madrid', instant)).toBe('2026-08-14')
    expect(today('UTC', instant)).toBe('2026-08-13')
    expect(today('America/Los_Angeles', instant)).toBe('2026-08-13')
  })

  test('today y currentPeriod son coherentes entre sí', () => {
    expect(currentPeriod()).toBe(today().slice(0, 7))
  })
})
