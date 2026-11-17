'use client'

/**
 * Alta de categoría: dos caminos, uno de los dos.
 *
 * O se elige una de las predefinidas (las de siempre, ya con su emoji y
 * ocultas hasta que alguien las activa) o se define una completamente nueva
 * con el formulario de siempre. No son dos pantallas distintas: es la misma
 * página con un interruptor arriba, porque es la misma decisión — "cómo nace
 * esta categoría" — solo que resuelta de dos formas.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, SegmentedControl, Stack, Text } from '@mantine/core'
import { CategoriaFormRefine } from '@/src/presentation/components/Forms/EntityForms/categoria/CategoriaFormRefine'
import { SeleccionarPredefinida } from '@/src/presentation/components/Forms/EntityForms/categoria/SeleccionarPredefinida'

export default function CreateCategoriaPage() {
  const router = useRouter()
  const [modo, setModo] = useState<'predefinida' | 'personalizada'>('predefinida')

  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Text fw={600} size="sm" mb="xs">
            ¿Cómo quieres añadir la categoría?
          </Text>
          <SegmentedControl
            value={modo}
            onChange={(v) => setModo(v as 'predefinida' | 'personalizada')}
            data={[
              { label: 'Elegir una predefinida', value: 'predefinida' },
              { label: 'Crear una nueva', value: 'personalizada' },
            ]}
          />
        </div>

        {modo === 'predefinida' ? (
          <SeleccionarPredefinida onActivada={() => router.push('/Categorias')} />
        ) : (
          <CategoriaFormRefine mode="create" />
        )}
      </Stack>
    </Container>
  )
}
