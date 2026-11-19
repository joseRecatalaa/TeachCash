/**
 * `/aprende`: el índice público de los cursos. Página del servidor, sin sesión
 * y sin crear invitado: el layout la monta en el marco público
 * (`esPaginaPublica`). La ruta va en minúsculas, y no en PascalCase como las de
 * la aplicación, porque es una dirección para enlazar y buscar.
 */

import type { Metadata } from 'next'
import { RUTA_CURSOS } from '@/lib/seo'
import { catalogoPublico } from '@/src/infrastructure/heroe/catalogo'
import { IndiceCursos } from '@/src/presentation/components/Publico/Cursos'
import { DatosEstructurados } from '@/src/presentation/components/Publico/DatosEstructurados'
import { esquemaIndice } from '@/src/presentation/components/Publico/esquemas'

const TITULO = 'Cursos gratis de educación financiera'
const DESCRIPCION =
  'Cursos cortos y gratuitos de presupuesto, ahorro, inversión y deudas, con datos oficiales de España. Se juegan como un videojuego a píxel, sin registrarte.'

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: RUTA_CURSOS },
  robots: { index: true, follow: true },
  openGraph: { title: TITULO, description: DESCRIPCION, url: RUTA_CURSOS, type: 'website', locale: 'es_ES' },
}

export default async function PaginaCursos() {
  const mundos = await catalogoPublico()
  return (
    <>
      <DatosEstructurados datos={esquemaIndice(mundos)} />
      <IndiceCursos mundos={mundos} />
    </>
  )
}
