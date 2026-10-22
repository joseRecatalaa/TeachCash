/**
 * El mes de Inicio sale de la URL, y la URL la escribe cualquiera: lo que se
 * comprueba es que nada de lo que llegue saca la portada de
 * `[INICIO_MES_MINIMO, mes actual]`, y que el mes actual va sin parámetro.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMesDeInicio } from '../useMesDeInicio'

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => nav.params,
}))

const conMes = (mes: string | null) => {
  nav.params = new URLSearchParams(mes === null ? '' : { mes })
  return renderHook(() => useMesDeInicio()).result.current
}

beforeEach(() => {
  // Solo el reloj: el "mes actual" tiene que ser fijo para poder probar el tope.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-20T10:00:00Z'))
  nav.replace.mockClear()
})

afterEach(() => vi.useRealTimers())

describe('qué mes enseña', () => {
  test('sin parámetro, el actual', () => {
    expect(conMes(null)).toMatchObject({
      periodo: '2026-10',
      actual: '2026-10',
      esActual: true,
      anterior: '2026-09',
      siguiente: null,
    })
  })

  test('un mes pasado dentro del rango, ese', () => {
    expect(conMes('2026-03')).toMatchObject({
      periodo: '2026-03',
      esActual: false,
      anterior: '2026-02',
      siguiente: '2026-04',
    })
  })

  test('en el tope por abajo no hay mes anterior', () => {
    expect(conMes('2026-01')).toMatchObject({ periodo: '2026-01', anterior: null })
  })

  test.each([
    ['anterior al mínimo', '2025-06', '2026-01'],
    ['futuro', '2027-02', '2026-10'],
    ['mal formado', '2026-13', '2026-10'],
    ['que no es un mes', 'hola', '2026-10'],
  ])('uno %s se acota', (_caso, pedido, esperado) => {
    expect(conMes(pedido).periodo).toBe(esperado)
  })
})

describe('ir a otro mes', () => {
  test('un mes pasado va en la URL', () => {
    conMes(null).ir('2026-04')
    expect(nav.replace).toHaveBeenCalledWith('/?mes=2026-04', { scroll: false })
  })

  test('el actual, sin parámetro: `/` sigue siendo "hoy"', () => {
    conMes('2026-04').ir('2026-10')
    expect(nav.replace).toHaveBeenCalledWith('/', { scroll: false })
  })
})
