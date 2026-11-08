import { describe, expect, test } from 'vitest'
import {
  CATALOGO,
  conObjetoPuesto,
  HUECOS,
  idsDelHueco,
  MAXIMO_EQUIPABLE,
  objetoPorId,
  precioDeEquipo,
} from '../tienda'

/** 4 mundos x 9 niveles x 3 estrellas. Si crece el contenido, se puede revisar. */
const ESTRELLAS_QUE_EXISTEN = 108

describe('el catálogo', () => {
  test('los ids no se repiten', () => {
    expect(new Set(CATALOGO.map((o) => o.id)).size).toBe(CATALOGO.length)
  })

  test('todos los huecos tienen algo que ponerse', () => {
    for (const hueco of HUECOS) expect(idsDelHueco(hueco).length).toBeGreaterThan(0)
  })

  test('la espada y el martillo comparten hueco', () => {
    expect(objetoPorId('espada-alta')?.hueco).toBe(objetoPorId('martillo-alta')?.hueco)
  })

  test('ir entero de lo mejor se puede, pero no da para comprarlo todo', () => {
    const todo = CATALOGO.reduce((suma, o) => suma + o.precio, 0)
    expect(MAXIMO_EQUIPABLE).toBe(75)
    expect(MAXIMO_EQUIPABLE).toBeLessThanOrEqual(ESTRELLAS_QUE_EXISTEN)
    expect(todo).toBeGreaterThan(ESTRELLAS_QUE_EXISTEN)
  })

  test('dice el material según el tipo: no hay espadas de cuero', () => {
    expect(objetoPorId('espada-basica')?.nombre).toBe('Espada de madera')
    expect(objetoPorId('casco-basica')?.nombre).toBe('Casco de cuero')
    expect(objetoPorId('alas-basica')?.nombre).toBe('Alas de plumas')
  })

  test('un id que no está en el catálogo no es un objeto', () => {
    expect(objetoPorId('casco-de-diamante')).toBeUndefined()
  })
})

describe('el precio del equipo', () => {
  test('suma lo que hay puesto', () => {
    expect(precioDeEquipo(['casco-basica', 'alas-alta'])).toBe(18)
  })

  test('lo que ya no está en el catálogo no suma', () => {
    expect(precioDeEquipo(['casco-basica', 'retirado'])).toBe(3)
  })
})

describe('probarse un objeto', () => {
  test('sustituye a lo que hubiera en su hueco', () => {
    expect(conObjetoPuesto(['casco-basica', 'alas-alta'], 'casco-alta')).toEqual(['alas-alta', 'casco-alta'])
  })

  test('el martillo sustituye a la espada', () => {
    expect(conObjetoPuesto(['espada-alta'], 'martillo-basica')).toEqual(['martillo-basica'])
  })

  test('un id desconocido deja el equipo como estaba', () => {
    expect(conObjetoPuesto(['casco-basica'], 'nada')).toEqual(['casco-basica'])
  })
})
