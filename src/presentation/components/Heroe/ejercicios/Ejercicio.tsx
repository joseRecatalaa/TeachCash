'use client'

/* Elige el componente de cada tipo de pregunta. */

import type { Pregunta } from '@/src/types/heroe.types'
import type { Respuesta } from '../reproductor/respuestas'
import { Calcula } from './Calcula'
import { Emparejar } from './Emparejar'
import { Hueco } from './Hueco'
import { Opcion } from './Opcion'
import { Ordenar } from './Ordenar'
import { VerdaderoFalso } from './VerdaderoFalso'

export function Ejercicio({
  pregunta,
  ...resto
}: {
  pregunta: Pregunta
  valor: Respuesta
  alCambiar: (valor: Respuesta) => void
  bloqueado: boolean
}) {
  switch (pregunta.tipo) {
    case 'opcion':
      return <Opcion pregunta={pregunta} {...resto} />
    case 'verdaderoFalso':
      return <VerdaderoFalso pregunta={pregunta} {...resto} />
    case 'hueco':
      return <Hueco pregunta={pregunta} {...resto} />
    case 'ordenar':
      return <Ordenar pregunta={pregunta} {...resto} />
    case 'emparejar':
      return <Emparejar pregunta={pregunta} {...resto} />
    case 'calcula':
      return <Calcula pregunta={pregunta} {...resto} />
  }
}
