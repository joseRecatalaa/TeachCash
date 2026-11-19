import type { MetadataRoute } from 'next'
import { DESCRIPCION_SITIO, NOMBRE_SITIO, TITULO_SITIO } from '@/lib/seo'

/**
 * Para "Añadir a la pantalla de inicio" en el móvil. Los dos colores son el
 * papel y el verde bosque de `app/globals.css` (`--verde-*`). Aquí van en
 * hexadecimal porque el manifiesto no lee variables de CSS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: TITULO_SITIO,
    short_name: NOMBRE_SITIO,
    description: DESCRIPCION_SITIO,
    lang: 'es',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2d6a4f',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
