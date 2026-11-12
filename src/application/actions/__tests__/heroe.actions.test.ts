/**
 * Server Actions del Camino del héroe: la frontera.
 *
 * Sin sesión no se lee ni se escribe nada, un id con otra forma es "No
 * encontrado" sin llegar al repositorio, y el progreso es el del usuario de la
 * sesión. El orden y la corrección los prueba `heroe.repository.test.ts`.
 */

import { fileURLToPath } from 'node:url'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/lib/auth', async () => (await import('@/test/mocks/auth')).authMock())
vi.mock('@/src/infrastructure/heroe/contenido', async (original) => {
  const real = await original<typeof import('@/src/infrastructure/heroe/contenido')>()
  const raiz = fileURLToPath(
    new URL('../../../infrastructure/repositories/__tests__/fixtures/heroe', import.meta.url),
  )
  return { ...real, contenido: () => real.cargarContenido(raiz) }
})

import { harness, usarBaseDeTest } from '@/test/harness'
import { heroProgress } from '@/db/schema'
import { USER_A, USER_B } from '@/src/infrastructure/repositories/__tests__/helpers'
import { revelar } from '@/lib/ocultar'
import { enviarNivel, fetchMapa, fetchMundo, fetchNivel } from '../heroe.actions'

const base = usarBaseDeTest()

const LECTURA = 'prueba/01-lectura'
const BIEN = [1, true, 0, 0, 1]

describe('sesión', () => {
  test.each([
    ['fetchMapa', () => fetchMapa()],
    ['fetchMundo', () => fetchMundo('prueba')],
    ['fetchNivel', () => fetchNivel(LECTURA)],
    ['enviarNivel', () => enviarNivel(LECTURA, BIEN)],
  ])('%s sin sesión no hace nada', async (_nombre, llamar) => {
    harness.userId = null
    expect(await llamar()).toEqual({ ok: false, error: 'No autorizado' })
    expect(await base().db.select().from(heroProgress)).toEqual([])
  })
})

describe('ids en la frontera', () => {
  test.each([
    ['sin mundo', 'prueba'],
    ['con mayúsculas', 'Prueba/01-lectura'],
    ['con un tramo de más', 'prueba/01/lectura'],
    ['que sube de carpeta', '../prueba/01-lectura'],
    ['que no es un texto', { id: LECTURA }],
    ['larguísimo', `prueba/${'a'.repeat(500)}`],
  ])('un id de nivel %s es "No encontrado"', async (_caso, id) => {
    expect(await fetchNivel(id as string)).toEqual({ ok: false, error: 'No encontrado' })
    expect(await enviarNivel(id as string, BIEN)).toEqual({ ok: false, error: 'No encontrado' })
  })

  test.each([
    ['con barra', 'prueba/01'],
    ['vacío', ''],
    ['que no es un texto', 7],
  ])('un id de mundo %s es "No encontrado"', async (_caso, id) => {
    expect(await fetchMundo(id as string)).toEqual({ ok: false, error: 'No encontrado' })
  })
})

describe('el progreso es el de la sesión', () => {
  test('enviar guarda en el usuario de la sesión', async () => {
    harness.userId = USER_B
    expect(await enviarNivel(LECTURA, BIEN)).toMatchObject({
      ok: true,
      data: { estrellas: 3, superado: true },
    })
    expect(await fetchMapa()).toMatchObject({
      ok: true,
      data: { mundos: [{ id: 'prueba', hechos: 1 }, { id: 'otro', hechos: 0 }, { id: 'vacio', proximamente: true }] },
    })

    harness.userId = USER_A
    expect(await fetchMundo('prueba')).toMatchObject({ ok: true, data: { siguiente: LECTURA } })
  })

  test('las respuestas mal formadas vuelven como error del campo', async () => {
    expect(await enviarNivel(LECTURA, 'todas bien')).toEqual({
      ok: false,
      error: 'Respuestas no válidas',
      fieldErrors: { respuestas: expect.any(String) },
    })
  })

  test('fetchNivel trae el contenido del nivel abierto, oculto', async () => {
    const r = await fetchNivel(LECTURA)
    if (!r.ok) throw new Error(r.error)
    expect(revelar(r.data.nivel, r.data.clave)).toMatchObject({ id: LECTURA, tipo: 'lectura' })
  })
})
