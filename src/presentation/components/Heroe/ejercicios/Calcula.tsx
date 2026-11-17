'use client'

/*
 * Una cuenta. La respuesta viaja como ENTERO en la unidad mínima, igual que
 * la solución del contenido (regla dura 1):
 *  - euros: céntimos, con el `MoneyInput` de los formularios;
 *  - porcentaje: centésimas de punto ("5,25" → 525), con el mismo parser;
 *  - número: un entero.
 * Mientras el texto no es un número, la respuesta es `null` y no se puede
 * comprobar: nunca se manda el último número bueno mientras se ve otro.
 */

import { useState } from 'react'
import { TextInput } from '@mantine/core'
import { parseMoney } from '@/lib/format'
import { DIVISA_APP } from '@/lib/money'
import { MoneyInput } from '../../Forms/GenericForm/MoneyInput'
import type { PropsEjercicio } from './tipos'
import styles from './ejercicios.module.css'

/** "5,25" → 525. Reutiliza el parser del dinero, que ya trabaja con dos decimales en enteros. */
export const aCentesimas = (texto: string): number | null => parseMoney(texto, 'EUR')?.amount ?? null

/** "1.200" → 1200. Sin decimales: es un número de años, meses o veces. */
export const aEntero = (texto: string): number | null => {
  const limpio = texto.trim().replaceAll('.', '')
  return /^-?\d{1,10}$/.test(limpio) ? Number(limpio) : null
}

export function Calcula({ pregunta, valor, alCambiar, bloqueado }: PropsEjercicio<'calcula'>) {
  const [texto, setTexto] = useState('')

  if (pregunta.unidad === 'euros') {
    return (
      <MoneyInput
        className={styles.cifra}
        label="Tu respuesta"
        divisa={DIVISA_APP}
        value={typeof valor === 'number' ? valor : null}
        onChange={alCambiar}
        disabled={bloqueado}
      />
    )
  }

  const porcentaje = pregunta.unidad === 'porcentaje'
  return (
    <TextInput
      className={styles.cifra}
      label="Tu respuesta"
      inputMode="decimal"
      rightSection={porcentaje ? '%' : undefined}
      value={texto}
      disabled={bloqueado}
      onChange={(e) => {
        const escrito = e.currentTarget.value
        setTexto(escrito)
        alCambiar(porcentaje ? aCentesimas(escrito) : aEntero(escrito))
      }}
    />
  )
}
