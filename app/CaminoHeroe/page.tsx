'use client'

/**
 * Camino del héroe: el mapa de mundos.
 *
 * Segundo módulo de la aplicación (el plan, en docs/CAMINO_HEROE.md). Como el
 * resto, es una página de cliente: el progreso lo trae `useMapaHeroe` por una
 * Server Action, y el contenido de los niveles no viaja hasta que se abre uno.
 */

import { useMapaHeroe } from '@/src/application/hooks/useHeroe'
import { MapaMundos } from '@/src/presentation/components/Heroe/MapaMundos'
import { Cargando, ErrorHeroe, PaginaHeroe } from '@/src/presentation/components/Heroe/PaginaHeroe'

export default function CaminoHeroePage() {
  const mapa = useMapaHeroe()

  return (
    <PaginaHeroe
      titulo="Camino del héroe"
      subtitulo="Aprende a manejar tu dinero mundo a mundo. Cada mundo es un tema, supera sus niveles hasta llegar al jefe."
    >
      {mapa.isPending && <Cargando />}
      {mapa.error && <ErrorHeroe mensaje={mapa.error.message} volver={{ href: '/', texto: 'Volver al inicio' }} />}
      {mapa.data && <MapaMundos mapa={mapa.data} />}
    </PaginaHeroe>
  )
}
