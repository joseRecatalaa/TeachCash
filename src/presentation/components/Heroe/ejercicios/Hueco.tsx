'use client'

/*
 * Elegir la palabra que falta. La frase se repite con el hueco ya relleno con
 * lo elegido: leída entera se nota enseguida si encaja o no.
 */

import { Group, Radio } from '@mantine/core'
import type { PropsEjercicio } from './tipos'
import { Marcado } from '../reproductor/Marcado'
import styles from './ejercicios.module.css'

/** El hueco vacío ocupa sitio: sin nada dentro, la línea se quedaría en un punto. */
const VACIO = ' '.repeat(8)

export function Hueco({ pregunta, valor, alCambiar, bloqueado }: PropsEjercicio<'hueco'>) {
  const [antes, despues] = pregunta.enunciado.split('___')
  const elegida = typeof valor === 'number' ? pregunta.opciones[valor] : null
  return (
    <div className={styles.columna}>
      <p className={styles.frase}>
        <Marcado texto={antes} />
        <span className={styles.hueco} data-relleno={elegida !== null}>
          {elegida ?? VACIO}
        </span>
        <Marcado texto={despues} />
      </p>
      <Radio.Group
        aria-label="La palabra que falta"
        value={typeof valor === 'number' ? String(valor) : null}
        onChange={(v) => alCambiar(Number(v))}
      >
        <Group gap="lg">
          {pregunta.opciones.map((opcion, i) => (
            <Radio key={opcion} value={String(i)} label={opcion} disabled={bloqueado} />
          ))}
        </Group>
      </Radio.Group>
    </div>
  )
}
