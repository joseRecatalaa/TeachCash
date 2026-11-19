'use client'

/**
 * Camino del héroe: un nivel (`/CaminoHeroe/<mundo>/<nivel>`).
 *
 * El id del nivel es `<mundo>/<nivel>`, y se recompone con los dos segmentos
 * (`rutaNivel`, `Heroe/rutas.ts`). El servidor solo lo sirve si está abierto
 * para este usuario: un nivel bloqueado llega como "No encontrado". Lo juega
 * `Reproductor`; "Repetir" cambia su `key` para que la partida nueva empiece
 * de cero.
 */

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useNivelHeroe } from '@/src/application/hooks/useHeroe'
import { Cargando, ErrorHeroe, PaginaHeroe } from '@/src/presentation/components/Heroe/PaginaHeroe'
import { Reproductor } from '@/src/presentation/components/Heroe/reproductor/Reproductor'
import { rutaMundo, segmento } from '@/src/presentation/components/Heroe/rutas'

export default function NivelHeroePage() {
  const params = useParams<{ mundo: string; nivel: string }>()
  const mundoId = segmento(params.mundo)
  const nivelId = segmento(params.nivel)
  const id = mundoId && nivelId ? `${mundoId}/${nivelId}` : ''
  const nivel = useNivelHeroe(id || null)
  const [partida, setPartida] = useState(0)
  const alCamino = { href: rutaMundo(mundoId), texto: 'Volver al camino' }
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
  // Solo se juega el nivel que pide la URL. "Siguiente nivel" llega a esta
  // misma página con otra ruta; si en ese paso se pintara aún el nivel de
  // antes, el reproductor nacería con su fase y sus respuestas, y luego le
  // llegaría el nivel nuevo sin volver a montarse: la lectura saltaba directa
  // al minitest y el servidor rechazaba las respuestas (eran tantas como
  // ejercicios tenía el nivel anterior).
  const datos = nivel.data?.nivel.id === id ? nivel.data : null
  if (!datos) {
    return (
      <PaginaHeroe titulo="Camino del héroe" volver={cabecera}>
        <Cargando />
      </PaginaHeroe>
    )
  }
  return (
    <PaginaHeroe titulo={datos.nivel.titulo} subtitulo={datos.nivel.descripcion} volver={cabecera} heroeEncima>
      <Reproductor
        // La `key` es la del nivel que se PINTA, no la de la URL: así su
        // estado no puede pasar nunca de un nivel a otro.
        key={`${datos.nivel.id}#${partida}`}
        nivel={datos.nivel}
        rutaCamino={alCamino.href}
        alRepetir={() => setPartida((n) => n + 1)}
      />
    </PaginaHeroe>
  )
}
