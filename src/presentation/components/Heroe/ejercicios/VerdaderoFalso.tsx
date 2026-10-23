'use client'

import { Group, Radio } from '@mantine/core'
import type { PropsEjercicio } from './tipos'

export function VerdaderoFalso({ pregunta, valor, alCambiar, bloqueado }: PropsEjercicio<'verdaderoFalso'>) {
  return (
    <Radio.Group
      aria-label={pregunta.enunciado}
      value={typeof valor === 'boolean' ? String(valor) : null}
      onChange={(v) => alCambiar(v === 'true')}
    >
      <Group gap="xl">
        <Radio value="true" label="Verdadero" disabled={bloqueado} />
        <Radio value="false" label="Falso" disabled={bloqueado} />
      </Group>
    </Radio.Group>
  )
}
