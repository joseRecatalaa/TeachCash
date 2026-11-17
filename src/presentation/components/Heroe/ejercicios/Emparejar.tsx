'use client'

/*
 * Emparejar cada concepto con su definición: un desplegable por concepto.
 *
 * Las definiciones salen barajadas (si no, la primera del desplegable sería
 * siempre la buena) y una definición ya elegida se deshabilita en los demás:
 * el servidor espera cada una una sola vez.
 */

import { useState } from 'react'
import { Select } from '@mantine/core'
import { barajar } from '../reproductor/respuestas'
import type { PropsEjercicio } from './tipos'
import styles from './ejercicios.module.css'

export function Emparejar({ pregunta, valor, alCambiar, bloqueado }: PropsEjercicio<'emparejar'>) {
  const [orden] = useState(() => barajar(pregunta.pares.length))
  const elegidas = Array.isArray(valor) ? valor : pregunta.pares.map(() => null)

  const elegir = (concepto: number, definicion: string | null) => {
    const nuevo = [...elegidas]
    nuevo[concepto] = definicion === null ? null : Number(definicion)
    alCambiar(nuevo)
  }

  return (
    <div className={styles.columna}>
      {pregunta.pares.map((par, i) => (
        <Select
          key={par.concepto}
          label={par.concepto}
          placeholder="Elige la definición"
          disabled={bloqueado}
          value={elegidas[i] === null ? null : String(elegidas[i])}
          onChange={(v) => elegir(i, v)}
          clearable
          data={orden.map((d) => ({
            value: String(d),
            label: pregunta.pares[d].definicion,
            disabled: elegidas.some((e, k) => e === d && k !== i),
          }))}
        />
      ))}
    </div>
  )
}
