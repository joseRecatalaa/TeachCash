import type { Pregunta } from '@/src/types/heroe.types'
import type { Respuesta } from '../reproductor/respuestas'

/** Lo que recibe cada ejercicio. `bloqueado`: ya se ha comprobado y no se puede cambiar. */
export interface PropsEjercicio<T extends Pregunta['tipo']> {
  pregunta: Extract<Pregunta, { tipo: T }>
  valor: Respuesta
  alCambiar: (valor: Respuesta) => void
  bloqueado: boolean
}
