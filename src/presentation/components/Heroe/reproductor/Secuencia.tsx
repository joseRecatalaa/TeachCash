'use client'

/*
 * Una serie de preguntas, una detrás de otra. La usan los tres tipos de nivel:
 * el minitest de una lectura, los ejercicios de un interactivo y el jefe.
 *
 * Dos formas de dar la respuesta:
 *  - `inmediato` (interactivo): se comprueba cada una al momento y, si falla,
 *    se enseña la buena con su explicación. Es lo que hace que practicar
 *    enseñe.
 *  - `final` (minitest y jefe): se responde todo y el repaso llega con la
 *    nota. Un examen que te dice cada respuesta según contestas no examina.
 *
 * La corrección de aquí es solo para enseñar. La que cuenta (estrellas,
 * superado) la hace el servidor con las mismas respuestas en bruto.
 */

import { useState } from 'react'
import { IconArrowRight, IconCheck } from '@tabler/icons-react'
import { esCorrecta } from '@/lib/heroe'
import type { Pregunta } from '@/src/types/heroe.types'
import { SketchButton, StatusBadge } from '../../ui'
import { Ejercicio } from '../ejercicios/Ejercicio'
import { completa, solucion, valorInicial, type Respuesta } from './respuestas'
import { Marcado } from './Marcado'
import { ProgresoNivel } from './ProgresoNivel'
import styles from './reproductor.module.css'

export function Secuencia({
  preguntas,
  feedback,
  alTerminar,
}: {
  preguntas: Pregunta[]
  feedback: 'inmediato' | 'final'
  alTerminar: (respuestas: Respuesta[]) => void
}) {
  const [i, setI] = useState(0)
  const [respuestas, setRespuestas] = useState<Respuesta[]>(() => preguntas.map((p) => valorInicial(p)))
  const [comprobada, setComprobada] = useState(false)

  const pregunta = preguntas[i]
  const valor = respuestas[i]
  const ultima = i === preguntas.length - 1
  const lista = completa(pregunta, valor)

  const cambiar = (nuevo: Respuesta) =>
    setRespuestas((todas) => todas.map((v, k) => (k === i ? nuevo : v)))

  const avanzar = () => {
    if (ultima) {
      alTerminar(respuestas)
      return
    }
    setI(i + 1)
    setComprobada(false)
  }

  const acierto = comprobada && esCorrecta(pregunta, valor)
  const textoAvanzar = ultima ? 'Terminar' : 'Siguiente'

  return (
    <section className={styles.secuencia} aria-label={`Pregunta ${i + 1} de ${preguntas.length}`}>
      <ProgresoNivel texto={`Pregunta ${i + 1} de ${preguntas.length}`} valor={(i / preguntas.length) * 100} />

      {/* El hueco lleva la frase dentro del propio ejercicio. */}
      <h2 className={styles.enunciado}>
        {pregunta.tipo === 'hueco' ? 'Completa la frase' : <Marcado texto={pregunta.enunciado} />}
      </h2>

      <Ejercicio
        key={pregunta.id}
        pregunta={pregunta}
        valor={valor}
        alCambiar={cambiar}
        bloqueado={comprobada}
      />

      <div aria-live="polite">
        {comprobada && (
          <div className={styles.feedback} data-acierto={acierto}>
            <StatusBadge tone={acierto ? 'positive' : 'danger'}>
              {acierto ? '¡Correcto!' : 'No es eso'}
            </StatusBadge>
            {!acierto && (
              <p className={styles.solucion}>
                La respuesta: <strong>{solucion(pregunta)}</strong>
              </p>
            )}
            <p className={styles.explicacion}>
              <Marcado texto={pregunta.explicacion} />
            </p>
          </div>
        )}
      </div>

      <div className={styles.acciones}>
        {feedback === 'inmediato' && !comprobada ? (
          <SketchButton
            onClick={() => setComprobada(true)}
            disabled={!lista}
            leftSection={<IconCheck size={16} aria-hidden />}
          >
            Comprobar
          </SketchButton>
        ) : (
          <SketchButton
            onClick={avanzar}
            disabled={!lista}
            rightSection={<IconArrowRight size={16} aria-hidden />}
          >
            {textoAvanzar}
          </SketchButton>
        )}
      </div>
    </section>
  )
}
