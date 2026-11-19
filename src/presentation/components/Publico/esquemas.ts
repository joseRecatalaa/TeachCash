/**
 * Los datos estructurados (schema.org) de cada página pública, como objetos.
 * Los pinta `DatosEstructurados`.
 *
 * Solo dicen lo que la página ya enseña. Google penaliza unos datos que
 * prometen lo que el texto no dice, y por eso las preguntas salen de la misma
 * lista que la página (`PREGUNTAS`) y las cifras, del contenido.
 */

import { DESCRIPCION_SITIO, LEMA, NOMBRE_SITIO, RUTA_CURSOS, URL_SITIO, rutaCurso } from '@/lib/seo'
import type { MundoPublicoDto } from '@/src/types/heroe.types'
import { PREGUNTAS } from './preguntas'

const ORGANIZACION = `${URL_SITIO}/#organizacion`
const SITIO = `${URL_SITIO}/#sitio`

const gratis = { '@type': 'Offer', price: 0, priceCurrency: 'EUR', category: 'Free' }

const organizacion = {
  '@type': 'Organization',
  '@id': ORGANIZACION,
  name: NOMBRE_SITIO,
  url: URL_SITIO,
  slogan: LEMA,
}

/** Un mundo como curso. `hasCourseInstance` y `offers` los pide Google para el resultado de curso. */
function curso(mundo: MundoPublicoDto) {
  return {
    '@type': 'Course',
    '@id': `${URL_SITIO}${rutaCurso(mundo.id)}#curso`,
    name: mundo.seo.titulo,
    description: mundo.seo.descripcion,
    url: `${URL_SITIO}${rutaCurso(mundo.id)}`,
    inLanguage: 'es-ES',
    isAccessibleForFree: true,
    educationalLevel: 'Principiante',
    provider: { '@id': ORGANIZACION },
    offers: gratis,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      courseWorkload: `PT${mundo.minutos}M`,
    },
    syllabusSections: mundo.niveles.map((n) => ({
      '@type': 'Syllabus',
      name: n.titulo,
      description: n.descripcion,
      timeRequired: `PT${n.minutos}M`,
    })),
  }
}

export function esquemaPortada(mundos: readonly MundoPublicoDto[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizacion,
      {
        '@type': 'WebSite',
        '@id': SITIO,
        name: NOMBRE_SITIO,
        url: URL_SITIO,
        description: DESCRIPCION_SITIO,
        inLanguage: 'es-ES',
        publisher: { '@id': ORGANIZACION },
      },
      {
        '@type': ['WebApplication', 'VideoGame'],
        name: NOMBRE_SITIO,
        url: URL_SITIO,
        description: DESCRIPCION_SITIO,
        applicationCategory: 'EducationalApplication',
        genre: 'Educativo',
        operatingSystem: 'Web',
        inLanguage: 'es-ES',
        isAccessibleForFree: true,
        offers: gratis,
        publisher: { '@id': ORGANIZACION },
        about: mundos.map((m) => ({ '@id': `${URL_SITIO}${rutaCurso(m.id)}#curso` })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: PREGUNTAS.map((p) => ({
          '@type': 'Question',
          name: p.pregunta,
          acceptedAnswer: { '@type': 'Answer', text: p.respuesta },
        })),
      },
    ],
  }
}

export function esquemaIndice(mundos: readonly MundoPublicoDto[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizacion,
      {
        '@type': 'ItemList',
        name: 'Cursos gratis de educación financiera',
        url: `${URL_SITIO}${RUTA_CURSOS}`,
        itemListElement: mundos.map((m, i) => ({ '@type': 'ListItem', position: i + 1, item: curso(m) })),
      },
    ],
  }
}

export function esquemaCurso(mundo: MundoPublicoDto) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizacion,
      curso(mundo),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: URL_SITIO },
          { '@type': 'ListItem', position: 2, name: 'Cursos', item: `${URL_SITIO}${RUTA_CURSOS}` },
          { '@type': 'ListItem', position: 3, name: mundo.titulo, item: `${URL_SITIO}${rutaCurso(mundo.id)}` },
        ],
      },
    ],
  }
}
