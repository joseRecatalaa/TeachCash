/**
 * El progreso del Camino del héroe.
 *
 * Lo que importa: el orden (un nivel bloqueado no se lee ni se envía), que la
 * corrección es del servidor (el cliente solo manda respuestas), que la mejor
 * marca no baja al repetir y que cada usuario tiene su propio camino.
 *
 * Con un contenido de prueba FIJO (`fixtures/heroe/`), no con el real: el
 * real crece y cambia, y estos tests no tienen que romperse por un curso
 * nuevo. El mundo "prueba" tiene una lectura (5 preguntas), un interactivo
 * (ordenar, emparejar y calcular) y un jefe de 10 verdadero/falso con un 70 %.
 */

import { fileURLToPath } from 'node:url'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('../../heroe/contenido', async (original) => {
  const real = await original<typeof import('../../heroe/contenido')>()
  const raiz = fileURLToPath(new URL('./fixtures/heroe', import.meta.url))
  return { ...real, contenido: () => real.cargarContenido(raiz) }
})

import { and, eq } from 'drizzle-orm'
import { usarBaseDeTest } from '@/test/harness'
import { heroProgress } from '@/db/schema'
import { completarNivel, evaluables, getMapa, getMundo, getNivel } from '../heroe.repository'
import { esperarErrorDeCampo, USER_A, USER_B } from './helpers'

const base = usarBaseDeTest()

const LECTURA = 'prueba/01-lectura'
const INTERACTIVO = 'prueba/02-interactivo'
const JEFE = 'prueba/03-jefe'

/** Las respuestas buenas de cada nivel de prueba. */
const BIEN = {
  [LECTURA]: [1, true, 0, 0, 1],
  [INTERACTIVO]: [[0, 1, 2], [0, 1, 2], 10_500],
  [JEFE]: Array.from({ length: 10 }, (_, i) => (i + 1) % 2 === 0),
} as const

const superar = (userId: string, levelId: keyof typeof BIEN) =>
  completarNivel(userId, levelId, BIEN[levelId])

const progreso = async (userId: string, levelId: string) => {
  const [fila] = await base()
    .db.select()
    .from(heroProgress)
    .where(and(eq(heroProgress.userId, userId), eq(heroProgress.levelId, levelId)))
  return fila ?? null
}

describe('el orden', () => {
  test('al empezar, solo el primer nivel está abierto', async () => {
    const { niveles, siguiente } = await getMundo(USER_A, 'prueba')
    expect(niveles.map((n) => n.estado)).toEqual(['disponible', 'bloqueado', 'bloqueado'])
    expect(siguiente).toBe(LECTURA)
  })

  test('un nivel bloqueado no se puede leer', async () => {
    await expect(getNivel(USER_A, INTERACTIVO)).rejects.toThrow('No encontrado')
  })

  test('un nivel bloqueado no se puede enviar, y no se escribe nada', async () => {
    await expect(completarNivel(USER_A, JEFE, BIEN[JEFE])).rejects.toThrow('No encontrado')
    expect(await progreso(USER_A, JEFE)).toBeNull()
  })

  test('superar un nivel abre el siguiente', async () => {
    const r = await superar(USER_A, LECTURA)
    expect(r.siguiente).toBe(INTERACTIVO)

    const { niveles, siguiente } = await getMundo(USER_A, 'prueba')
    expect(niveles.map((n) => n.estado)).toEqual(['hecho', 'disponible', 'bloqueado'])
    expect(siguiente).toBe(INTERACTIVO)
    await expect(getNivel(USER_A, INTERACTIVO)).resolves.toMatchObject({ nivel: { id: INTERACTIVO } })
  })

  test('jugarlo sin superarlo NO abre el siguiente', async () => {
    const r = await completarNivel(USER_A, LECTURA, [0, false, 1, 1, 0])
    expect(r).toMatchObject({ superado: false, estrellas: 0, siguiente: null })
    expect((await getMundo(USER_A, 'prueba')).niveles[1].estado).toBe('bloqueado')
  })

  test('el último nivel no tiene siguiente', async () => {
    await superar(USER_A, LECTURA)
    await superar(USER_A, INTERACTIVO)
    const r = await superar(USER_A, JEFE)
    expect(r).toMatchObject({ superado: true, siguiente: null })
    expect((await getMundo(USER_A, 'prueba')).siguiente).toBeNull()
  })

  test('un nivel o un mundo que no existen dan "No encontrado"', async () => {
    await expect(getNivel(USER_A, 'prueba/99-nada')).rejects.toThrow('No encontrado')
    await expect(getNivel(USER_A, 'nada/01-lectura')).rejects.toThrow('No encontrado')
    await expect(getMundo(USER_A, 'nada')).rejects.toThrow('No encontrado')
  })
})

describe('la corrección es del servidor', () => {
  test('todo bien: tres estrellas', async () => {
    expect(await superar(USER_A, LECTURA)).toEqual({
      aciertos: 5,
      total: 5,
      estrellas: 3,
      mejorEstrellas: 3,
      superado: true,
      correccion: [true, true, true, true, true],
      siguiente: INTERACTIVO,
    })
  })

  test('4 de 5 (80 %): dos estrellas', async () => {
    const r = await completarNivel(USER_A, LECTURA, [1, true, 0, 0, 0])
    expect(r).toMatchObject({ aciertos: 4, estrellas: 2, superado: true })
    expect(r.correccion).toEqual([true, true, true, true, false])
  })

  test('3 de 5 (60 %): una estrella y superado', async () => {
    const r = await completarNivel(USER_A, LECTURA, [1, true, 0, 1, 0])
    expect(r).toMatchObject({ aciertos: 3, estrellas: 1, superado: true })
  })

  test('lo que el cliente diga de sus aciertos no cuenta', async () => {
    // Un cliente tramposo puede mandar lo que quiera junto a las respuestas;
    // el servidor solo mira las respuestas.
    const r = await completarNivel(USER_A, LECTURA, [0, false, 1, 1, 0])
    expect(r.aciertos).toBe(0)
    await expect(
      completarNivel(USER_A, LECTURA, { respuestas: BIEN[LECTURA], aciertos: 5, estrellas: 3 }),
    ).rejects.toThrow('Respuestas no válidas')
  })

  test('ordenar y emparejar: solo vale el orden bueno; calcular: con su tolerancia', async () => {
    await superar(USER_A, LECTURA)
    const r = await completarNivel(USER_A, INTERACTIVO, [[1, 0, 2], [0, 1, 2], 10_600])
    expect(r.correccion).toEqual([false, true, true])

    const fuera = await completarNivel(USER_A, INTERACTIVO, [[0, 1, 2], [2, 1, 0], 10_601])
    expect(fuera.correccion).toEqual([true, false, false])
  })

  test('el jefe usa SU aprobado (70 %), no el de por defecto', async () => {
    await superar(USER_A, LECTURA)
    await superar(USER_A, INTERACTIVO)
    const seisDeDiez = BIEN[JEFE].map((v, i) => (i < 4 ? !v : v))
    expect(await completarNivel(USER_A, JEFE, seisDeDiez)).toMatchObject({
      aciertos: 6,
      superado: false,
      estrellas: 0,
    })
    const sieteDeDiez = BIEN[JEFE].map((v, i) => (i < 3 ? !v : v))
    expect(await completarNivel(USER_A, JEFE, sieteDeDiez)).toMatchObject({
      aciertos: 7,
      superado: true,
      estrellas: 1,
    })
  })
})

describe('respuestas basura', () => {
  test.each([
    ['nada', undefined],
    ['un objeto', { a: 1 }],
    ['de menos', [1, true, 0, 0]],
    ['de más', [1, true, 0, 0, 1, 1]],
    ['un índice fuera de las opciones', [7, true, 0, 0, 1]],
    ['un texto donde va un verdadero/falso', [1, 'sí', 0, 0, 1]],
    ['un decimal', [1.5, true, 0, 0, 1]],
  ])('%s: error del campo y nada escrito', async (_caso, respuestas) => {
    await esperarErrorDeCampo(completarNivel(USER_A, LECTURA, respuestas), 'respuestas')
    expect(await progreso(USER_A, LECTURA)).toBeNull()
  })

  test.each([
    ['un orden con repetidos', [[0, 0, 2], [0, 1, 2], 10_500]],
    ['un orden corto', [[0, 1], [0, 1, 2], 10_500]],
    ['un importe con decimales', [[0, 1, 2], [0, 1, 2], 105.5]],
  ])('interactivo con %s: error del campo', async (_caso, respuestas) => {
    await superar(USER_A, LECTURA)
    await esperarErrorDeCampo(completarNivel(USER_A, INTERACTIVO, respuestas), 'respuestas')
    expect(await progreso(USER_A, INTERACTIVO)).toBeNull()
  })
})

describe('la mejor marca', () => {
  test('repetir peor no baja las estrellas ni quita el superado', async () => {
    await superar(USER_A, LECTURA)
    const r = await completarNivel(USER_A, LECTURA, [0, false, 1, 1, 0])

    expect(r).toMatchObject({ estrellas: 0, mejorEstrellas: 3, superado: false, siguiente: INTERACTIVO })
    expect(await progreso(USER_A, LECTURA)).toMatchObject({ stars: 3, bestScore: 5, attempts: 2 })
    expect((await getMundo(USER_A, 'prueba')).niveles[0]).toMatchObject({ estado: 'hecho', estrellas: 3 })
  })

  test('repetir mejor sí las sube', async () => {
    await completarNivel(USER_A, LECTURA, [1, true, 0, 1, 0])
    const r = await superar(USER_A, LECTURA)
    expect(r.mejorEstrellas).toBe(3)
    expect(await progreso(USER_A, LECTURA)).toMatchObject({ stars: 3, attempts: 2 })
  })

  test('la fecha de superado es la primera', async () => {
    await superar(USER_A, LECTURA)
    const primera = (await progreso(USER_A, LECTURA))?.completedAt
    await superar(USER_A, LECTURA)
    expect((await progreso(USER_A, LECTURA))?.completedAt).toEqual(primera)
  })
})

describe('el mapa', () => {
  test('los mundos en su orden, con el progreso derivado', async () => {
    await superar(USER_A, LECTURA)
    await completarNivel(USER_A, INTERACTIVO, [[0, 1, 2], [0, 1, 2], 0])

    const mapa = await getMapa(USER_A)
    expect(mapa.mundos.map((m) => m.id)).toEqual(['prueba', 'otro'])
    expect(mapa.mundos[0]).toMatchObject({ hechos: 2, total: 3, estrellas: 3 + 1, estrellasMax: 9 })
    expect(mapa.mundos[1]).toMatchObject({ hechos: 0, total: 1, estrellas: 0, estrellasMax: 3 })
  })

  test('el héroe espera en el mundo del último nivel jugado', async () => {
    expect((await getMapa(USER_A)).ultimoMundo).toBeNull()
    await superar(USER_A, LECTURA)
    await completarNivel(USER_A, 'otro/01-jefe', Array(8).fill(false))
    expect((await getMapa(USER_A)).ultimoMundo).toBe('otro')
  })

  test('los mundos son libres: se puede empezar por cualquiera', async () => {
    await expect(getNivel(USER_A, 'otro/01-jefe')).resolves.toMatchObject({ mundo: { id: 'otro' } })
  })

  test('una fila de un nivel que ya no existe no rompe nada', async () => {
    await base().db.insert(heroProgress).values({ userId: USER_A, levelId: 'prueba/00-retirado', stars: 3 })
    const mapa = await getMapa(USER_A)
    expect(mapa.mundos[0].estrellas).toBe(0)
    expect(mapa.ultimoMundo).toBeNull()
  })
})

describe('aislamiento', () => {
  test('el progreso de un usuario no abre nada a otro', async () => {
    await superar(USER_A, LECTURA)
    await expect(getNivel(USER_B, INTERACTIVO)).rejects.toThrow('No encontrado')
    expect((await getMapa(USER_B)).mundos[0].hechos).toBe(0)
    expect(await progreso(USER_B, LECTURA)).toBeNull()
  })

  test('cada usuario tiene su propia mejor marca del mismo nivel', async () => {
    await superar(USER_A, LECTURA)
    await completarNivel(USER_B, LECTURA, [1, true, 0, 1, 0])
    expect(await progreso(USER_A, LECTURA)).toMatchObject({ stars: 3 })
    expect(await progreso(USER_B, LECTURA)).toMatchObject({ stars: 1 })
  })
})

describe('getNivel', () => {
  test('trae el contenido, su mundo y la mejor marca', async () => {
    await completarNivel(USER_A, LECTURA, [1, true, 0, 0, 0])
    const r = await getNivel(USER_A, LECTURA)
    expect(r.mundo).toEqual({ id: 'prueba', titulo: 'Mundo de prueba', decorado: 'hucha' })
    expect(r.estrellas).toBe(2)
    expect(evaluables(r.nivel)).toHaveLength(5)
  })
})
