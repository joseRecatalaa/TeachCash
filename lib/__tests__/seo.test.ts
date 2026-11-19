import { describe, expect, test } from 'vitest'
import { DESCRIPCION_SITIO, TITULO_SITIO, esPaginaPublica, rutaCurso } from '../seo'

describe('esPaginaPublica', () => {
  test('la portada es pública sin sesión y el Cuadro de mando con ella', () => {
    expect(esPaginaPublica('/', false)).toBe(true)
    expect(esPaginaPublica('/', true)).toBe(false)
  })

  test.each([true, false])('los cursos son públicos siempre (con sesión: %s)', (conSesion) => {
    expect(esPaginaPublica('/aprende', conSesion)).toBe(true)
    expect(esPaginaPublica(rutaCurso('ahorro'), conSesion)).toBe(true)
  })

  test.each(['/Patrimonio', '/CaminoHeroe', '/Login', '/aprendemos', '/Aprende', ''])(
    '"%s" no es pública',
    (ruta) => expect(esPaginaPublica(ruta, false)).toBe(false),
  )
})

describe('lo que enseña Google', () => {
  test('el título cabe antes de que Google lo corte (60)', () => {
    expect(TITULO_SITIO).toBe('TeachCash: educación financiera al alcance de cualquiera')
    expect(TITULO_SITIO.length).toBeLessThanOrEqual(60)
  })

  test('la descripción está entre 120 y 160 caracteres', () => {
    expect(DESCRIPCION_SITIO.length).toBeGreaterThanOrEqual(120)
    expect(DESCRIPCION_SITIO.length).toBeLessThanOrEqual(160)
  })
})
