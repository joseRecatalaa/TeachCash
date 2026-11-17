import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCaminata } from '../useCaminata'

const DESDE = { x: 0, y: 0 }
const HASTA = { x: 140, y: 0 }

describe('useCaminata', () => {
  it('sin indicar nada, espera antes de echar a andar para que se vea dónde estaba', () => {
    const { result } = renderHook(() => useCaminata(DESDE, HASTA))
    expect(result.current.andando).toBe(false)
  })

  it('con espera 0 ya corre en el primer pintado: responde a la mano', () => {
    const { result } = renderHook(() => useCaminata(DESDE, HASTA, { espera: 0 }))
    expect(result.current.andando).toBe(true)
    expect(result.current.mirando).toBe('der')
  })

  it('sin distancia que recorrer no anda, aunque no tenga espera', () => {
    const { result } = renderHook(() => useCaminata(HASTA, HASTA, { espera: 0 }))
    expect(result.current.andando).toBe(false)
    expect(result.current.pos).toEqual(HASTA)
  })
})
