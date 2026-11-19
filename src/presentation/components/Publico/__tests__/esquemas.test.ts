import { describe, expect, test } from 'vitest'
import type { MundoPublicoDto } from '@/src/types/heroe.types'
import { esquemaCurso, esquemaIndice, esquemaPortada } from '../esquemas'
import { PREGUNTAS } from '../preguntas'

const MUNDO: MundoPublicoDto = {
  id: 'ahorro',
  titulo: 'Ahorro',
  descripcion: 'Apartar dinero.',
  decorado: 'hucha',
  seo: { titulo: 'Curso gratis para aprender a ahorrar', descripcion: 'Fondo de emergencia y TAE.' },
  niveles: [
    { id: 'ahorro/01', titulo: 'El fondo de emergencia', descripcion: 'Por qué.', tipo: 'lectura', minutos: 3 },
    { id: 'ahorro/02', titulo: 'El jefe', descripcion: 'El monstruo.', tipo: 'jefe', minutos: 8 },
  ],
  minutos: 11,
}

const tipos = (esquema: { '@graph': { '@type': unknown }[] }) => esquema['@graph'].map((n) => n['@type'])

describe('esquemaPortada', () => {
  test('dice que es gratis y lleva las MISMAS preguntas que enseña la página', () => {
    const esquema = esquemaPortada([MUNDO])
    expect(tipos(esquema)).toEqual(['Organization', 'WebSite', ['WebApplication', 'VideoGame'], 'FAQPage'])
    const [, , app, faq] = esquema['@graph'] as Record<string, unknown>[]
    expect(app.isAccessibleForFree).toBe(true)
    expect(app.offers).toMatchObject({ price: 0, priceCurrency: 'EUR' })
    expect((faq.mainEntity as { name: string }[]).map((q) => q.name)).toEqual(PREGUNTAS.map((p) => p.pregunta))
  })
})

describe('esquemaCurso', () => {
  test('un curso gratis, online, con su duración y el camino de migas', () => {
    const [, curso, migas] = esquemaCurso(MUNDO)['@graph'] as Record<string, unknown>[]
    expect(curso).toMatchObject({
      '@type': 'Course',
      name: MUNDO.seo.titulo,
      url: 'https://www.teachcash.es/aprende/ahorro',
      hasCourseInstance: { courseMode: 'Online', courseWorkload: 'PT11M' },
    })
    expect(curso.syllabusSections).toHaveLength(2)
    expect(migas['@type']).toBe('BreadcrumbList')
  })
})

test('esquemaIndice lista un curso por mundo, en orden', () => {
  const [, lista] = esquemaIndice([MUNDO, { ...MUNDO, id: 'deuda' }])['@graph'] as Record<string, unknown>[]
  const elementos = lista.itemListElement as { position: number; item: { url: string } }[]
  expect(elementos.map((e) => [e.position, e.item.url])).toEqual([
    [1, 'https://www.teachcash.es/aprende/ahorro'],
    [2, 'https://www.teachcash.es/aprende/deuda'],
  ])
})
