/**
 * Las utilidades puras de la tabla: cómo se filtra, se compara y se lee una
 * celda. Sin montar nada: son las reglas que el modo cliente aplica a cada
 * fila, y un operador mal resuelto aquí esconde filas sin avisar.
 */

import { describe, expect, test, vi } from 'vitest'
import { CLAVES_COLOR } from '@/lib/colores'
import {
  comparar,
  cumpleFiltro,
  divisaDe,
  textoDe,
  tonoBadge,
  type AppTableColumn,
  type ColumnFilter,
} from '../columnas'

const f = (operator: ColumnFilter['operator'], value: ColumnFilter['value'], valueTo?: number | string) => ({
  operator,
  value,
  valueTo,
})

describe('cumpleFiltro con números y dinero', () => {
  test.each([
    ['equals', 500, true],
    ['equals', 501, false],
    ['notEquals', 501, true],
    ['gt', 499, true],
    ['gt', 500, false],
    ['gte', 500, true],
    ['lt', 501, true],
    ['lt', 500, false],
    ['lte', 500, true],
  ] as const)('500 %s %i → %s', (operator, objetivo, esperado) => {
    expect(cumpleFiltro(500, f(operator, objetivo), 'money')).toBe(esperado)
    expect(cumpleFiltro(500, f(operator, objetivo), 'number')).toBe(esperado)
  })

  test('between incluye los dos extremos', () => {
    expect(cumpleFiltro(100, f('between', 100, 200), 'money')).toBe(true)
    expect(cumpleFiltro(200, f('between', 100, 200), 'money')).toBe(true)
    expect(cumpleFiltro(201, f('between', 100, 200), 'money')).toBe(false)
  })

  test('between sin "hasta" es igualdad', () => {
    expect(cumpleFiltro(100, f('between', 100), 'number')).toBe(true)
    expect(cumpleFiltro(101, f('between', 100), 'number')).toBe(false)
  })

  test('un valor de texto numérico se compara como número', () => {
    expect(cumpleFiltro('500', f('equals', 500), 'number')).toBe(true)
  })

  test('lo que no es un número no filtra (no esconde filas por un dato raro)', () => {
    expect(cumpleFiltro('abc', f('equals', 1), 'number')).toBe(true)
    expect(cumpleFiltro(1, f('equals', 'x'), 'number')).toBe(true)
  })

  test('un operador de texto en una columna numérica no esconde nada', () => {
    expect(cumpleFiltro(1, f('contains', 5), 'number')).toBe(true)
  })
})

describe('cumpleFiltro con texto, fechas y enums', () => {
  test.each([
    ['contains', 'merca', true],
    ['contains', 'xyz', false],
    ['notContains', 'xyz', true],
    ['equals', 'MERCADONA', true],
    ['notEquals', 'mercadona', false],
    ['startsWith', 'Mer', true],
    ['endsWith', 'dona', true],
    ['endsWith', 'Mer', false],
  ] as const)('"Mercadona" %s "%s" → %s (sin distinguir mayúsculas)', (operator, objetivo, esperado) => {
    expect(cumpleFiltro('Mercadona', f(operator, objetivo), 'string')).toBe(esperado)
  })

  test('las fechas civiles se comparan como texto: desde, hasta y entre', () => {
    expect(cumpleFiltro('2026-03-15', f('gte', '2026-03-01'), 'date')).toBe(true)
    expect(cumpleFiltro('2026-03-15', f('lte', '2026-03-01'), 'date')).toBe(false)
    expect(cumpleFiltro('2026-03-15', f('between', '2026-03-01', '2026-03-31'), 'date')).toBe(true)
    expect(cumpleFiltro('2026-04-01', f('between', '2026-03-01', '2026-03-31'), 'date')).toBe(false)
    expect(cumpleFiltro('2026-03-01', f('between', '2026-03-01'), 'date')).toBe(true)
  })

  test('un valor vacío o nulo de la fila cuenta como texto vacío', () => {
    expect(cumpleFiltro(null, f('equals', 'x'), 'enum')).toBe(false)
    expect(cumpleFiltro(undefined, f('notEquals', 'x'), 'enum')).toBe(true)
  })

  test('un operador numérico en una columna de texto no esconde nada', () => {
    expect(cumpleFiltro('a', f('gt', 'b'), 'string')).toBe(true)
  })

  test('un filtro sin valor deja pasar todo', () => {
    expect(cumpleFiltro('x', f('equals', ''), 'string')).toBe(true)
    expect(cumpleFiltro(1, f('equals', null), 'number')).toBe(true)
  })
})

describe('comparar', () => {
  test.each([
    [1, 2, -1],
    [2, 1, 1],
    [null, 1, -1],
    [1, undefined, 1],
    [false, true, -1],
    ['b', 'a', 1],
    // Numérico dentro del texto: "F2" antes que "F10".
    ['F2', 'F10', -1],
    ['2026-01-31', '2026-02-01', -1],
  ])('comparar(%s, %s) tiene signo %i', (a, b, signo) => {
    expect(Math.sign(comparar(a, b))).toBe(signo)
  })

  test('iguales dan 0', () => {
    expect(comparar('a', 'a')).toBe(0)
    expect(comparar(null, null)).toBe(0)
  })
})

describe('textoDe: el texto de una celda para buscar y exportar', () => {
  type Fila = Record<string, unknown>
  const col = (c: Partial<AppTableColumn<Fila>>) => ({ accessor: 'v', ...c }) as AppTableColumn<Fila>

  test.each([
    [col({ type: 'boolean' }), { v: true }, 'Sí'],
    [col({ type: 'boolean' }), { v: false }, 'No'],
    [col({ type: 'date' }), { v: '2026-03-05' }, '05/03/2026'],
    [col({ type: 'string' }), { v: 7 }, '7'],
    [col({}), { v: null }, ''],
    [col({}), {}, ''],
  ])('%#', (c, fila, esperado) => {
    expect(textoDe(fila, c)).toBe(esperado)
  })

  test('el dinero se busca como se ve, en euros', () => {
    expect(textoDe({ v: 1234567 }, col({ type: 'money' }))).toMatch(/^12\.345,67\s€$/)
  })
})

describe('divisaDe', () => {
  type Fila = { importe: number; moneda?: string }
  const col: AppTableColumn<Fila> = { accessor: 'importe', type: 'money', divisaAccessor: 'moneda' }

  test('sin divisaAccessor, la de la aplicación', () => {
    expect(divisaDe({ importe: 1 }, { accessor: 'importe', type: 'money' })).toBe('EUR')
  })

  test('con divisaAccessor, la de la fila', () => {
    expect(divisaDe({ importe: 1, moneda: 'USD' }, col)).toBe('USD')
  })

  test('una divisa inválida en la fila es un bug: avisa y cae a la de la aplicación', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(divisaDe({ importe: 1, moneda: 'XXX' }, col)).toBe('EUR')
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('divisaAccessor'))
  })
})

describe('tonoBadge', () => {
  const base = { accessor: 'v' } as AppTableColumn<unknown>

  test('manda el color del propio dato si es una clave válida', () => {
    const col = { ...base, badgeColorAccessor: 'color', badgeColor: 'neutral' }
    expect(tonoBadge(col, 'x', { color: 'cat-4' })).toBe('cat-4')
    // Una clave inválida no se pinta: sigue al siguiente criterio.
    expect(tonoBadge(col, 'x', { color: '#ff0000' })).toBe('neutral')
  })

  test('luego el tono por valor, luego el fijo de la columna', () => {
    const col = { ...base, badgeColors: { expense: 'expense' }, badgeColor: 'neutral' }
    expect(tonoBadge(col, 'expense', {})).toBe('expense')
    expect(tonoBadge(col, 'income', {})).toBe('neutral')
  })

  test('sin nada, uno de la paleta y siempre el mismo para el mismo valor', () => {
    const tono = tonoBadge(base, 'Supermercado', {})
    expect(CLAVES_COLOR).toContain(tono)
    expect(tonoBadge(base, 'Supermercado', {})).toBe(tono)
  })
})
