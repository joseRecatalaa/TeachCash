/**
 * `/presentacion`: la presentación del proyecto (el TFM), hecha con las piezas
 * del juego. Pública para que se abra sin cuenta, y sin el marco de las demás
 * páginas públicas: cada pantalla ocupa la ventana entera (`app/layout.tsx`).
 *
 * No se indexa: es una charla, no una página para buscar. Por eso no va ni en
 * el `allow` de `robots.ts` ni en el sitemap.
 *
 * Con `?imprimir` salen todas las pantallas seguidas, una por página: es lo
 * que convierte en PDF `scripts/exportar-presentacion.mts`.
 */

import type { Metadata } from 'next'
import { RUTA_PRESENTACION } from '@/lib/seo'
import { catalogoPublico } from '@/src/infrastructure/heroe/catalogo'
import { crearDiapositivas } from '@/src/presentation/components/Presentacion/diapositivas'
import { Presentacion } from '@/src/presentation/components/Presentacion/Presentacion'

export const metadata: Metadata = {
  title: 'Presentación',
  description: 'TeachCash en diecisiete pantallas: educación financiera con forma de videojuego a píxel.',
  alternates: { canonical: RUTA_PRESENTACION },
  robots: { index: false, follow: false },
}

export default async function PaginaPresentacion({ searchParams }: PageProps<'/presentacion'>) {
  const { imprimir } = await searchParams
  const mundos = await catalogoPublico()
  return <Presentacion diapositivas={crearDiapositivas(mundos)} imprimir={imprimir !== undefined} />
}
