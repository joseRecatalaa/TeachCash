'use client'

/*
 * La pantalla final de un nivel: estrellas, aciertos y qué hacer ahora.
 *
 * Todo lo que dice sale del servidor (`ResultadoNivelDto`): las estrellas y el
 * superado los calcula él, y el repaso usa SU corrección, no la del cliente.
 * Si se ha repetido el nivel, dice también la mejor marca, que no baja.
 */

import { IconArrowRight, IconMap2, IconRefresh } from '@tabler/icons-react'
import type { Route } from 'next'
import type { Pregunta, ResultadoNivelDto } from '@/src/types/heroe.types'
import { PixelSprite } from '../../Pixel/PixelSprite'
import pixel from '../../Pixel/pixel.module.css'
import { ESTRELLA, PALETA_CAMINO, PALETA_ESTRELLA_VACIA } from '../../Pixel/sprites'
import { SketchButton, StatusBadge } from '../../ui'
import { rutaNivel } from '../FichaNivel'
import { HeroeCamino } from '../HeroeCamino'
import { solucion } from './respuestas'
import { Marcado } from './Marcado'
import styles from './reproductor.module.css'

function Escena({ estrellas, celebra }: { estrellas: number; celebra: boolean }) {
  return (
    <svg className={styles.escenaResultado} viewBox="0 0 92 62" shapeRendering="crispEdges" aria-hidden="true">
      {/* Diez píxeles más abajo: el billete en alto de `celebra` asoma por
          encima de la caja del héroe y se cortaría. Y a 11 del borde: el escudo
          y las alas salen de su caja por la izquierda. Va antes que las
          estrellas para que un ala quede detrás de ellas, no encima. */}
      <g transform="translate(11 14)">
        <HeroeCamino pose={celebra ? 'celebra' : 'quieto'} />
      </g>
      <g className={pixel.paletaCamino}>
        {[0, 1, 2].map((k) => (
          <g key={k} transform={`translate(${42 + k * 16} ${k === 1 ? 22 : 28}) scale(2)`}>
            <PixelSprite sprite={ESTRELLA} paleta={k < estrellas ? PALETA_CAMINO : PALETA_ESTRELLA_VACIA} />
          </g>
        ))}
      </g>
    </svg>
  )
}

export function Resultado({
  resultado,
  preguntas,
  aprobado,
  repaso,
  rutaCamino,
  alRepetir,
}: {
  resultado: ResultadoNivelDto
  preguntas: Pregunta[]
  /** El porcentaje para superarlo, para decir cuánto faltó. */
  aprobado: number
  /** Enseñar pregunta a pregunta qué falló (minitest y jefe, que no tenían feedback). */
  repaso: boolean
  rutaCamino: Route
  alRepetir: () => void
}) {
  const { aciertos, total, estrellas, mejorEstrellas, superado, correccion, siguiente } = resultado
  const fallos = preguntas.filter((_, k) => !correccion[k])

  return (
    <section className={styles.resultado} aria-labelledby="titulo-resultado">
      <Escena estrellas={estrellas} celebra={superado} />
      <h2 id="titulo-resultado" className={styles.tituloResultado}>
        {superado ? '¡Nivel superado!' : 'Esta vez no ha podido ser'}
      </h2>
      <p className={styles.cifras}>
        {aciertos} de {total} aciertos · {estrellas} de 3 estrellas
      </p>
      {!superado && <p>Necesitas acertar al menos un {aprobado} % para superarlo. Repasa y vuelve a intentarlo.</p>}
      {mejorEstrellas > estrellas && <p>Tu mejor marca sigue siendo de {mejorEstrellas} estrellas.</p>}

      {repaso && fallos.length > 0 && (
        <div className={styles.repaso}>
          <h3 className={styles.repasoTitulo}>Lo que conviene repasar</h3>
          <ul>
            {fallos.map((p) => (
              <li key={p.id} className={styles.repasoItem}>
                <StatusBadge tone="danger" size="sm">
                  Fallada
                </StatusBadge>
                <p className={styles.repasoPregunta}>
                  <Marcado texto={p.enunciado} />
                </p>
                <p className={styles.solucion}>
                  La respuesta: <strong>{solucion(p)}</strong>
                </p>
                <p className={styles.explicacion}>
                  <Marcado texto={p.explicacion} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.acciones}>
        {siguiente && superado && (
          <SketchButton href={rutaNivel(siguiente)} rightSection={<IconArrowRight size={16} aria-hidden />}>
            Siguiente nivel
          </SketchButton>
        )}
        <SketchButton variant="secondary" onClick={alRepetir} leftSection={<IconRefresh size={16} aria-hidden />}>
          Repetir
        </SketchButton>
        <SketchButton variant="ghost" href={rutaCamino} leftSection={<IconMap2 size={16} aria-hidden />}>
          Volver al camino
        </SketchButton>
      </div>
    </section>
  )
}
