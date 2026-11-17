'use client'

/*
 * Poner pasos en orden. Con botones de subir y bajar y no arrastrando: el
 * arrastre no se puede hacer con teclado ni se lee con lector de pantalla, y
 * en un móvil compite con el desplazamiento de la página. Los botones sirven
 * para todo el mundo.
 *
 * El valor es la lista de índices ORIGINALES en el orden en que están ahora;
 * arranca barajada (`valorInicial`).
 */

import { ActionIcon } from '@mantine/core'
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react'
import { sinMarcas } from '@/lib/marcas'
import type { PropsEjercicio } from './tipos'
import styles from './ejercicios.module.css'

export function Ordenar({ pregunta, valor, alCambiar, bloqueado }: PropsEjercicio<'ordenar'>) {
  const orden = Array.isArray(valor) ? (valor as number[]) : pregunta.pasos.map((_, i) => i)

  const mover = (desde: number, hacia: number) => {
    const nuevo = [...orden]
    ;[nuevo[desde], nuevo[hacia]] = [nuevo[hacia], nuevo[desde]]
    alCambiar(nuevo)
  }

  return (
    <ol className={styles.pasos} aria-label={sinMarcas(pregunta.enunciado)}>
      {orden.map((indice, posicion) => {
        const paso = pregunta.pasos[indice]
        return (
          <li key={paso} className={styles.paso}>
            <span className={styles.numero} aria-hidden>
              {posicion + 1}
            </span>
            <span className={styles.textoPaso}>{paso}</span>
            <ActionIcon
              variant="default"
              aria-label={`Subir: ${paso}`}
              disabled={bloqueado || posicion === 0}
              onClick={() => mover(posicion, posicion - 1)}
            >
              <IconArrowUp size={16} />
            </ActionIcon>
            <ActionIcon
              variant="default"
              aria-label={`Bajar: ${paso}`}
              disabled={bloqueado || posicion === orden.length - 1}
              onClick={() => mover(posicion, posicion + 1)}
            >
              <IconArrowDown size={16} />
            </ActionIcon>
          </li>
        )
      })}
    </ol>
  )
}
