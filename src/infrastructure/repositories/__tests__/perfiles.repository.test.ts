/**
 * El perfil: el patrimonio inicial.
 *
 * Lo que importa aquí es la diferencia entre `null` y `0`: sin fila, la portada
 * pregunta; con un cero guardado, ya no. Y que cada usuario lea y escriba SOLO
 * su fila, porque el upsert va por una clave que es el propio usuario.
 */

import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())

import { usarBaseDeTest } from '@/test/harness'
import { profiles } from '@/db/schema'
import { IMPORTE_MAXIMO } from '@/src/types/limites.types'
import { getPatrimonioInicial, guardarPatrimonioInicial } from '../perfiles.repository'
import { esperarErrorDeCampo, USER_A, USER_B } from './helpers'

const base = usarBaseDeTest()

describe('leer', () => {
  test('sin elegir todavía, es null y no cero', async () => {
    expect(await getPatrimonioInicial(USER_A)).toBeNull()
  })

  test('un cero guardado es una respuesta, no la pregunta', async () => {
    await guardarPatrimonioInicial(USER_A, { patrimonioInicial: 0 })
    expect(await getPatrimonioInicial(USER_A)).toBe(0)
  })
})

describe('guardar', () => {
  test('guarda y devuelve el importe en céntimos', async () => {
    expect(await guardarPatrimonioInicial(USER_A, { patrimonioInicial: 125_000 })).toBe(125_000)
    expect(await getPatrimonioInicial(USER_A)).toBe(125_000)
  })

  test('se puede empezar debiendo dinero', async () => {
    await guardarPatrimonioInicial(USER_A, { patrimonioInicial: -50_000 })
    expect(await getPatrimonioInicial(USER_A)).toBe(-50_000)
  })

  test('cambiarlo sustituye la fila, no añade otra', async () => {
    await guardarPatrimonioInicial(USER_A, { patrimonioInicial: 1000 })
    await guardarPatrimonioInicial(USER_A, { patrimonioInicial: 2000 })

    expect(await getPatrimonioInicial(USER_A)).toBe(2000)
    expect(await base().db.select().from(profiles)).toHaveLength(1)
  })

  test('acepta los dos topes, incluidos', async () => {
    await guardarPatrimonioInicial(USER_A, { patrimonioInicial: IMPORTE_MAXIMO })
    expect(await getPatrimonioInicial(USER_A)).toBe(IMPORTE_MAXIMO)
    await guardarPatrimonioInicial(USER_A, { patrimonioInicial: -IMPORTE_MAXIMO })
    expect(await getPatrimonioInicial(USER_A)).toBe(-IMPORTE_MAXIMO)
  })

  test.each([
    ['un decimal', 12.5],
    ['un texto', '1000'],
    ['nada', undefined],
    ['por encima del tope', IMPORTE_MAXIMO + 1],
    ['por debajo del tope', -IMPORTE_MAXIMO - 1],
    ['un número que no es un importe', Number.NaN],
  ])('rechaza %s en el campo, sin escribir nada', async (_caso, valor) => {
    await esperarErrorDeCampo(
      guardarPatrimonioInicial(USER_A, { patrimonioInicial: valor }),
      'patrimonioInicial',
    )
    expect(await getPatrimonioInicial(USER_A)).toBeNull()
  })

  test('sin objeto de valores, también es un error del campo', async () => {
    await esperarErrorDeCampo(guardarPatrimonioInicial(USER_A, null), 'patrimonioInicial')
  })
})

describe('aislamiento', () => {
  test('el de un usuario no es el de otro', async () => {
    await guardarPatrimonioInicial(USER_A, { patrimonioInicial: 1000 })
    expect(await getPatrimonioInicial(USER_B)).toBeNull()

    // Y que B guarde el suyo no pisa el de A: la clave del upsert es el usuario.
    await guardarPatrimonioInicial(USER_B, { patrimonioInicial: 9999 })
    expect(await getPatrimonioInicial(USER_A)).toBe(1000)
  })
})
