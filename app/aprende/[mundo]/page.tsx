/**
 * `/aprende/<mundo>`: la página pública de un curso. Un id que no es un mundo
 * publicado es un 404 de verdad (no una página vacía que Google indexaría).
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { rutaCurso } from '@/lib/seo'
import { catalogoPublico, mundoPublico } from '@/src/infrastructure/heroe/catalogo'
import { CursoMundo } from '@/src/presentation/components/Publico/Cursos'
import { DatosEstructurados } from '@/src/presentation/components/Publico/DatosEstructurados'
import { esquemaCurso } from '@/src/presentation/components/Publico/esquemas'

export async function generateMetadata({ params }: PageProps<'/aprende/[mundo]'>): Promise<Metadata> {
  const mundo = await mundoPublico((await params).mundo)
  if (!mundo) return {}
  const { titulo, descripcion } = mundo.seo
  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: rutaCurso(mundo.id) },
    robots: { index: true, follow: true },
    openGraph: { title: titulo, description: descripcion, url: rutaCurso(mundo.id), type: 'website', locale: 'es_ES' },
  }
}

export default async function PaginaCurso({ params }: PageProps<'/aprende/[mundo]'>) {
  const { mundo: id } = await params
  const mundos = await catalogoPublico()
  const mundo = mundos.find((m) => m.id === id)
  if (!mundo) notFound()

  return (
    <>
      <DatosEstructurados datos={esquemaCurso(mundo)} />
      <CursoMundo mundo={mundo} otros={mundos.filter((m) => m.id !== mundo.id)} />
    </>
  )
}
