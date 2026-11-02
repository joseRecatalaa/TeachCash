'use client'

/* Una respuesta entre varias. El enunciado lo pinta el reproductor encima. */

import { Radio, Stack } from '@mantine/core'
import { sinMarcas } from '@/lib/marcas'
import type { PropsEjercicio } from './tipos'

export function Opcion({ pregunta, valor, alCambiar, bloqueado }: PropsEjercicio<'opcion'>) {
  return (
    <Radio.Group
      aria-label={sinMarcas(pregunta.enunciado)}
      value={typeof valor === 'number' ? String(valor) : null}
      onChange={(v) => alCambiar(Number(v))}
    >
      <Stack gap="sm">
        {pregunta.opciones.map((opcion, i) => (
          <Radio key={opcion} value={String(i)} label={opcion} disabled={bloqueado} />
        ))}
      </Stack>
    </Radio.Group>
  )
}
