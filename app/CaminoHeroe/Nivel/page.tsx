'use client'

/**
 * Camino del héroe: un nivel (`?id=<mundo>/<nivel>`).
 *
 * El servidor solo lo sirve si está abierto para este usuario: un nivel
 * bloqueado llega como "No encontrado".
 */

import { Suspense } from 'react'
import type { Route } from 'next'
import { useNivelHeroe } from '@/src/application/hooks/useHeroe'
import { Cargando, ErrorHeroe, PaginaHeroe } from '@/src/presentation/components/Heroe/PaginaHeroe'
import { useEntityId } from '@/src/presentation/components/useEntityId'

function Contenido() {
  const id = useEntityId()
  const nivel = useNivelHeroe(id || null)
  const mundoId = id.split('/')[0]
  const alCamino = {
    href: `/CaminoHeroe/Mundo?id=${encodeURIComponent(mundoId)}` as Route,
    texto: 'Volver al camino',
  }

  if (nivel.error) {
    return (
      <PaginaHeroe titulo="Camino del héroe" volver={alCamino}>
        <ErrorHeroe mensaje={nivel.error.message} volver={alCamino} />
      </PaginaHeroe>
    )
  }
  if (!nivel.data) {
    return (
      <PaginaHeroe titulo="Camino del héroe" volver={alCamino}>
        <Cargando />
      </PaginaHeroe>
    )
  }
  return (
    <PaginaHeroe titulo={nivel.data.nivel.titulo} subtitulo={nivel.data.nivel.descripcion} volver={alCamino}>
      <p>El reproductor de niveles llega en la próxima fase.</p>
    </PaginaHeroe>
  )
}

/** `useSearchParams` obliga a un `<Suspense>` por encima, o el build avisa. */
export default function NivelHeroePage() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  )
}
