'use client'

import { Container, Stack } from '@mantine/core'
import { useEntityId } from '@/src/presentation/components/useEntityId'
import { MovimientoFormRefine } from '@/src/presentation/components/Forms/EntityForms/movimiento/MovimientoFormRefine'

/** `/Movimientos/Edit/<id>`: el id va en la ruta (`useEntityId`), no en `?id=`. */
export default function EditMovimientoPage() {
  const id = useEntityId()
  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <MovimientoFormRefine mode="edit" id={id} />
      </Stack>
    </Container>
  )
}
