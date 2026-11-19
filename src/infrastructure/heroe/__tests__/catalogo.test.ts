/**
 * Lo que se publica de los cursos: el catálogo que ven Google y quien no ha
 * entrado. Con el contenido DE VERDAD (`content/heroe/`), porque es ese el que
 * sale en la portada.
 */

import { describe, expect, test } from 'vitest'
import { catalogoDe, catalogoPublico, mundoPublico } from '../catalogo'
import { cargarContenido } from '../contenido'

const CAMPOS_NIVEL = ['descripcion', 'id', 'minutos', 'tipo', 'titulo']

describe('catalogoDe', () => {
  test('cada nivel lleva solo su ficha: ni páginas, ni preguntas, ni soluciones', async () => {
    const catalogo = catalogoDe(await cargarContenido())
    expect(catalogo.length).toBeGreaterThan(0)
    for (const nivel of catalogo.flatMap((m) => m.niveles)) {
      expect(Object.keys(nivel).sort()).toEqual(CAMPOS_NIVEL)
    }
  })

  test('los mundos salen en el orden del mapa, con sus niveles en el orden de juego y el jefe al final', async () => {
    const c = await cargarContenido()
    const catalogo = catalogoDe(c)
    const conNiveles = c.mundos.filter((m) => m.niveles.length > 0)
    expect(catalogo.map((m) => m.id)).toEqual(conNiveles.map((m) => m.id))
    for (const [i, mundo] of catalogo.entries()) {
      expect(mundo.niveles.map((n) => n.id)).toEqual(conNiveles[i].niveles.map((n) => `${mundo.id}/${n}`))
      expect(mundo.niveles.at(-1)?.tipo).toBe('jefe')
      expect(mundo.minutos).toBe(mundo.niveles.reduce((t, n) => t + n.minutos, 0))
    }
  })

  test('todo mundo publicado tiene su título y descripción para Google', async () => {
    const c = await cargarContenido()
    for (const mundo of c.mundos.filter((m) => m.niveles.length > 0)) {
      expect(mundo.seo, `${mundo.id} sin "seo" en mundo.json`).toBeDefined()
    }
  })

  test('un mundo sin "seo" usa su título y su descripción; uno sin niveles no se publica', async () => {
    const c = await cargarContenido()
    const [primero] = c.mundos
    const sinSeo = { ...primero, seo: undefined }
    const vacio = { ...primero, id: 'vacio', niveles: [] }
    const catalogo = catalogoDe({ mundos: [sinSeo, vacio], niveles: c.niveles })
    expect(catalogo.map((m) => m.id)).toEqual([primero.id])
    expect(catalogo[0].seo).toEqual({ titulo: primero.titulo, descripcion: primero.descripcion })
  })
})

describe('mundoPublico', () => {
  test('encuentra un mundo por su id y no inventa uno que no existe', async () => {
    const [primero] = await catalogoPublico()
    expect((await mundoPublico(primero.id))?.titulo).toBe(primero.titulo)
    expect(await mundoPublico('no-existe')).toBeUndefined()
  })
})
