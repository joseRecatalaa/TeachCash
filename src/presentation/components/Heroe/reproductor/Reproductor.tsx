'use client'

/*
 * El reproductor de un nivel: decide qué pantallas tiene según su tipo y
 * manda las respuestas al servidor al acabar.
 *
 *   lectura:      páginas → minitest → resultado
 *   interactivo:  ejercicios (con feedback inmediato) → resultado
 *   jefe:         presentación del monstruo → preguntas → resultado
 *
 * Repetir vuelve a montar el reproductor entero (una `key` nueva desde la
 * página): así no queda nada de la partida anterior, ni las respuestas ni
 * el orden barajado de los ejercicios.
 */

import { useState } from 'react'
import type { Route } from 'next'
import { IconSword } from '@tabler/icons-react'
import { useEnviarNivel } from '@/src/application/hooks/useHeroe'
import { APROBADO_POR_DEFECTO } from '@/lib/heroe'
import type { Nivel, Pregunta, ResultadoNivelDto } from '@/src/types/heroe.types'
import { PixelHero } from '../../Pixel/PixelHero'
import { PixelSprite } from '../../Pixel/PixelSprite'
import pixel from '../../Pixel/pixel.module.css'
import { MONSTRUO, PALETA_CAMINO } from '../../Pixel/sprites'
import { SketchButton } from '../../ui'
import { Cargando } from '../PaginaHeroe'
import { Lectura } from './Lectura'
import { Resultado } from './Resultado'
import { Secuencia } from './Secuencia'
import type { Respuesta } from './respuestas'
import styles from './reproductor.module.css'

type Fase = 'intro' | 'lectura' | 'preguntas' | 'resultado'

const preguntasDe = (nivel: Nivel): Pregunta[] => {
  if (nivel.tipo === 'lectura') return nivel.minitest
  if (nivel.tipo === 'interactivo') return nivel.ejercicios
  return nivel.preguntas
}

const faseInicial = (nivel: Nivel): Fase => {
  if (nivel.tipo === 'jefe') return 'intro'
  if (nivel.tipo === 'lectura') return 'lectura'
  return 'preguntas'
}

/** El jefe se presenta antes de pelear: el héroe frente a su monstruo. */
function PresentacionJefe({ nivel, alEmpezar }: { nivel: Extract<Nivel, { tipo: 'jefe' }>; alEmpezar: () => void }) {
  return (
    <section className={styles.presentacion} aria-labelledby="titulo-jefe">
      <svg className={styles.escenaJefe} viewBox="0 0 96 48" shapeRendering="crispEdges" aria-hidden="true">
        <g transform="translate(4 2)">
          <PixelHero pose="quieto" />
        </g>
        <g className={pixel.paletaCamino} transform="translate(50 8) scale(2)">
          <PixelSprite sprite={MONSTRUO} paleta={PALETA_CAMINO} />
        </g>
      </svg>
      <h2 id="titulo-jefe" className={styles.tituloResultado}>
        {nivel.titulo}
      </h2>
      <p>{nivel.descripcion}</p>
      <p className={styles.cifras}>
        {nivel.preguntas.length} preguntas · necesitas un {nivel.aprobado} % para vencerlo
      </p>
      <div className={styles.acciones}>
        <SketchButton onClick={alEmpezar} leftSection={<IconSword size={16} aria-hidden />}>
          ¡A por él!
        </SketchButton>
      </div>
    </section>
  )
}

export function Reproductor({
  nivel,
  rutaCamino,
  alRepetir,
}: {
  nivel: Nivel
  rutaCamino: Route
  alRepetir: () => void
}) {
  const [fase, setFase] = useState<Fase>(() => faseInicial(nivel))
  const [respuestas, setRespuestas] = useState<Respuesta[] | null>(null)
  const [resultado, setResultado] = useState<ResultadoNivelDto | null>(null)
  const enviar = useEnviarNivel()
  const preguntas = preguntasDe(nivel)

  const mandar = (lista: Respuesta[]) => {
    setRespuestas(lista)
    enviar.mutate(
      { levelId: nivel.id, respuestas: lista },
      {
        onSuccess: (r) => {
          setResultado(r)
          setFase('resultado')
        },
      },
    )
  }

  if (fase === 'intro' && nivel.tipo === 'jefe') {
    return <PresentacionJefe nivel={nivel} alEmpezar={() => setFase('preguntas')} />
  }
  if (fase === 'lectura' && nivel.tipo === 'lectura') {
    return <Lectura paginas={nivel.paginas} alTerminar={() => setFase('preguntas')} />
  }
  if (fase === 'resultado' && resultado) {
    return (
      <Resultado
        resultado={resultado}
        preguntas={preguntas}
        aprobado={nivel.tipo === 'jefe' ? nivel.aprobado : APROBADO_POR_DEFECTO}
        repaso={nivel.tipo !== 'interactivo'}
        rutaCamino={rutaCamino}
        alRepetir={alRepetir}
      />
    )
  }

  if (enviar.isPending) return <Cargando />
  if (enviar.isError && respuestas) {
    return (
      <div className={styles.error} role="alert">
        <p>No se ha podido guardar la partida: {enviar.error.message}</p>
        <SketchButton onClick={() => mandar(respuestas)}>Reintentar</SketchButton>
      </div>
    )
  }

  return (
    <Secuencia
      preguntas={preguntas}
      feedback={nivel.tipo === 'interactivo' ? 'inmediato' : 'final'}
      alTerminar={mandar}
    />
  )
}
