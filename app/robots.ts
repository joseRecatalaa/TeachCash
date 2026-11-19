import type { MetadataRoute } from 'next'
import { RUTA_CURSOS, URL_SITIO } from '@/lib/seo'

/**
 * Qué pueden rastrear los buscadores: la portada y los cursos, y nada más.
 *
 * El resto de rutas es la aplicación. Sin sesión solo enseñan "Preparando tu
 * espacio…", y un rastreador que ejecuta JavaScript intentaría crear un
 * invitado en cada una. `/$` es SOLO la portada (`/?mes=…` ya no casa). Google
 * se queda con la regla más larga, y `Allow: /$` gana a `Disallow: /`.
 *
 * `/_next/` va permitido porque Google pinta la página con su CSS para juzgar
 * cómo se ve en el móvil. Sin él, la daría por rota.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/$', RUTA_CURSOS, '/_next/', '/opengraph-image', '/icon.svg', '/manifest.webmanifest'],
      disallow: '/',
    },
    sitemap: `${URL_SITIO}/sitemap.xml`,
    host: URL_SITIO,
  }
}
