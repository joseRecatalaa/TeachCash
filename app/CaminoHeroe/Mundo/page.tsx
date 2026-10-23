'use client'

/**
 * Camino del héroe: el camino de un mundo (`?id=<mundo>`).
 *
 * Al entrar, el héroe camina hasta el primer nivel abierto. Al volver de
 * jugar uno, la consulta ya está invalidada (`useEnviarNivel`) y camina hasta
 * el siguiente.
 */

import { Suspense } from 'react'
import { useMundoHeroe } from '@/src/application/hooks/useHeroe'
import { CaminoMundo } from '@/src/presentation/components/Heroe/CaminoMundo'
import { Cargando, ErrorHeroe, PaginaHeroe } from '@/src/presentation/components/Heroe/PaginaHeroe'
import { useEntityId } from '@/src/presentation/components/useEntityId'

const AL_MAPA = { href: '/CaminoHeroe', texto: 'Mundos' } as const

function Contenido() {
  const mundo = useMundoHeroe(useEntityId() || null)

  if (mundo.error) {
    return (
      <PaginaHeroe titulo="Camino del héroe" volver={AL_MAPA}>
        <ErrorHeroe mensaje={mundo.error.message} volver={{ ...AL_MAPA, texto: 'Volver a los mundos' }} />
      </PaginaHeroe>
    )
  }
  if (!mundo.data) {
    return (
      <PaginaHeroe titulo="Camino del héroe" volver={AL_MAPA}>
        <Cargando />
      </PaginaHeroe>
    )
  }
  return (
    <PaginaHeroe titulo={mundo.data.mundo.titulo} subtitulo={mundo.data.mundo.descripcion} volver={AL_MAPA}>
      <CaminoMundo datos={mundo.data} />
    </PaginaHeroe>
  )
}

/** `useSearchParams` obliga a un `<Suspense>` por encima, o el build avisa. */
export default function MundoHeroePage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  )
}
