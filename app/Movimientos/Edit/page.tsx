'use client'

import { Suspense } from 'react'
import { Container, LoadingOverlay, Paper, Stack } from '@mantine/core'
import { useEntityId } from '@/src/presentation/components/useEntityId'
import { MovimientoFormRefine } from '@/src/presentation/components/Forms/EntityForms/movimiento/MovimientoFormRefine'

function Contenido() {
  const id = useEntityId()

  if (!id) {
    return (
      <Paper p="xl">Falta el identificador en la URL.</Paper>
    )
  }

  return <MovimientoFormRefine mode="edit" id={id} />
}

/**
 * `useSearchParams` obliga a un `<Suspense>` por encima: sin él, Next no puede
 * prerenderizar nada de esta rama y avisa en el build.
 */
export default function EditMovimientoPage() {
  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <Suspense
          fallback={
            <Paper p="xl" pos="relative" style={{ minHeight: 200 }}>
              <LoadingOverlay visible />
            </Paper>
          }
        >
          <Contenido />
        </Suspense>
      </Stack>
    </Container>
  )
}
