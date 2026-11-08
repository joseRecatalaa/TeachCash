/**
 * El perfil: el patrimonio.
 *
 * Lo que importa aquí: que lo que se escribe es el TOTAL de hoy (movimientos
 * incluidos) y el saldo queda en esa cifra exacta; que el primer patrimonio no
 * cambia al editar; la diferencia entre `null` y `0` (sin fila, la portada
 * pregunta; con un cero guardado, ya no); y que cada usuario lea y escriba
 * SOLO su fila, porque el upsert va por una clave que es el propio usuario.
 */

import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())

import { usarBaseDeTest } from '@/test/harness'
import { profiles } from '@/db/schema'
import { IMPORTE_MAXIMO } from '@/src/types/limites.types'
import { getBasePatrimonio, getPatrimonioInicial, guardarPatrimonio } from '../perfiles.repository'
import { getSaldoActual } from '../informes.repository'
import { esperarErrorDeCampo, seedMovimiento, USER_A, USER_B } from './helpers'

const base = usarBaseDeTest()

describe('leer', () => {
  test('sin elegir todavía, es null y no cero', async () => {
    expect(await getPatrimonioInicial(USER_A)).toBeNull()
  })

  test('un cero guardado es una respuesta, no la pregunta', async () => {
    await guardarPatrimonio(USER_A, { patrimonio: 0 })
    expect(await getPatrimonioInicial(USER_A)).toBe(0)
  })
})

describe('guardar', () => {
  test('guarda y devuelve el importe en céntimos', async () => {
    expect(await guardarPatrimonio(USER_A, { patrimonio: 125_000 })).toBe(125_000)
    expect(await getPatrimonioInicial(USER_A)).toBe(125_000)
  })

  test('se puede empezar debiendo dinero', async () => {
    await guardarPatrimonio(USER_A, { patrimonio: -50_000 })
    expect(await getPatrimonioInicial(USER_A)).toBe(-50_000)
  })

  test('cambiarlo sustituye la fila, no añade otra', async () => {
    await guardarPatrimonio(USER_A, { patrimonio: 1000 })
    await guardarPatrimonio(USER_A, { patrimonio: 2000 })

    expect(await getSaldoActual(USER_A)).toBe(2000)
    expect(await base().db.select().from(profiles)).toHaveLength(1)
  })

  test('acepta los dos topes, incluidos', async () => {
    await guardarPatrimonio(USER_A, { patrimonio: IMPORTE_MAXIMO })
    expect(await getSaldoActual(USER_A)).toBe(IMPORTE_MAXIMO)
    await guardarPatrimonio(USER_A, { patrimonio: -IMPORTE_MAXIMO })
    expect(await getSaldoActual(USER_A)).toBe(-IMPORTE_MAXIMO)
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
      guardarPatrimonio(USER_A, { patrimonio: valor }),
      'patrimonio',
    )
    expect(await getPatrimonioInicial(USER_A)).toBeNull()
  })

  test('sin objeto de valores, también es un error del campo', async () => {
    await esperarErrorDeCampo(guardarPatrimonio(USER_A, null), 'patrimonio')
  })
})

describe('lo que se escribe es el total de hoy', () => {
  test('con movimientos anotados, el patrimonio queda en la cifra escrita', async () => {
    await guardarPatrimonio(USER_A, { patrimonio: 1_020_000 })
    await seedMovimiento(base().db, 'a', USER_A, { amount: 128_500 })
    expect(await getSaldoActual(USER_A)).toBe(1_148_500)

    // Editar a 1.200.000 deja el patrimonio en 1.200.000, no en 1.200.000 más
    // lo anotado: la base absorbe la diferencia.
    await guardarPatrimonio(USER_A, { patrimonio: 1_200_000 })
    expect(await getSaldoActual(USER_A)).toBe(1_200_000)
    expect(await getBasePatrimonio(USER_A)).toBe(1_200_000 - 128_500)
  })

  test('lo anotado después se suma al total escrito', async () => {
    await seedMovimiento(base().db, 'a', USER_A, { amount: -3000 })
    await guardarPatrimonio(USER_A, { patrimonio: 50_000 })
    await seedMovimiento(base().db, 'b', USER_A, { amount: 1000 })
    expect(await getSaldoActual(USER_A)).toBe(51_000)
  })

  test('la primera vez, con movimientos ya anotados, también es el total', async () => {
    await seedMovimiento(base().db, 'a', USER_A, { amount: -3000 })
    await guardarPatrimonio(USER_A, { patrimonio: 50_000 })

    expect(await getSaldoActual(USER_A)).toBe(50_000)
    expect(await getPatrimonioInicial(USER_A)).toBe(50_000)
  })

  test('el primer patrimonio no cambia al editar', async () => {
    await guardarPatrimonio(USER_A, { patrimonio: 1000 })
    await guardarPatrimonio(USER_A, { patrimonio: 2000 })
    await guardarPatrimonio(USER_A, { patrimonio: -500 })
    expect(await getPatrimonioInicial(USER_A)).toBe(1000)
  })

  test('una base que no cabe en la columna es un error del campo, sin escribir nada', async () => {
    // Movimientos muy por encima del tope de un importe: el total escrito es
    // válido, pero total - movimientos se sale de un `integer`.
    for (const id of ['a', 'b', 'c']) {
      await seedMovimiento(base().db, id, USER_A, { amount: IMPORTE_MAXIMO })
    }
    await esperarErrorDeCampo(
      guardarPatrimonio(USER_A, { patrimonio: -IMPORTE_MAXIMO }),
      'patrimonio',
    )
    expect(await getPatrimonioInicial(USER_A)).toBeNull()
  })
})

describe('aislamiento', () => {
  test('el de un usuario no es el de otro', async () => {
    await guardarPatrimonio(USER_A, { patrimonio: 1000 })
    expect(await getPatrimonioInicial(USER_B)).toBeNull()
    expect(await getBasePatrimonio(USER_B)).toBeNull()

    // Y que B guarde el suyo no pisa el de A: la clave del upsert es el usuario.
    await guardarPatrimonio(USER_B, { patrimonio: 9999 })
    expect(await getPatrimonioInicial(USER_A)).toBe(1000)
  })
})
