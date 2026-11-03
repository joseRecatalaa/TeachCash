'use client'

/**
 * Camino del héroe: un nivel (`?id=<mundo>/<nivel>`).
 *
 * El servidor solo lo sirve si está abierto para este usuario: un nivel
 * bloqueado llega como "No encontrado". Lo juega `Reproductor`; "Repetir"
 * cambia su `key` para que la partida nueva empiece de cero.
 */

import { Suspense, useState } from 'react'
import type { Route } from 'next'
import { useNivelHeroe } from '@/src/application/hooks/useHeroe'
import { Cargando, ErrorHeroe, PaginaHeroe } from '@/src/presentation/components/Heroe/PaginaHeroe'
import { Reproductor } from '@/src/presentation/components/Heroe/reproductor/Reproductor'
import { useEntityId } from '@/src/presentation/components/useEntityId'

function Contenido() {
  const id = useEntityId()
  const nivel = useNivelHeroe(id || null)
  const [partida, setPartida] = useState(0)
  const mundoId = id.split('/')[0]
  const alCamino = {
    href: `/CaminoHeroe/Mundo?id=${encodeURIComponent(mundoId)}` as Route,
    texto: 'Volver al camino',
  }
  // En la cabecera, el nombre del mundo: "Volver al camino" ya es el botón
  // del resultado, y dos enlaces con el mismo nombre confunden a quien navega
  // con lector de pantalla.
  const cabecera = { ...alCamino, texto: nivel.data?.mundo.titulo ?? 'Camino' }

  if (nivel.error) {
    return (
      <PaginaHeroe titulo="Camino del héroe" volver={cabecera}>
        <ErrorHeroe mensaje={nivel.error.message} volver={alCamino} />
      </PaginaHeroe>
    )
  }
  if (!nivel.data) {
    return (
      <PaginaHeroe titulo="Camino del héroe" volver={cabecera}>
        <Cargando />
      </PaginaHeroe>
    )
  }
  return (
    <PaginaHeroe titulo={nivel.data.nivel.titulo} subtitulo={nivel.data.nivel.descripcion} volver={cabecera}>
      <Reproductor
        key={`${id}#${partida}`}
        nivel={nivel.data.nivel}
        rutaCamino={alCamino.href}
        alRepetir={() => setPartida((n) => n + 1)}
      />
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
