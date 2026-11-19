import type { MetadataRoute } from 'next'
import { RUTA_CURSOS, URL_SITIO, rutaCurso } from '@/lib/seo'
import { catalogoPublico } from '@/src/infrastructure/heroe/catalogo'

/**
 * Las páginas públicas, para que Google no tenga que descubrirlas solo: la
 * portada, el índice de cursos y un curso por mundo publicado. Sin
 * `lastModified`: una fecha inventada (la del build) le diría a Google que todo
 * cambió en cada despliegue.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const mundos = await catalogoPublico()
  return [
    { url: URL_SITIO, changeFrequency: 'weekly', priority: 1 },
    { url: `${URL_SITIO}${RUTA_CURSOS}`, changeFrequency: 'weekly', priority: 0.9 },
    ...mundos.map((m) => ({
      url: `${URL_SITIO}${rutaCurso(m.id)}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
