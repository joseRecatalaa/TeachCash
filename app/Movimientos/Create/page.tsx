import { Container, Stack } from '@mantine/core'
import { MovimientoFormRefine } from '@/src/presentation/components/Forms/EntityForms/movimiento/MovimientoFormRefine'

export default function CreateMovimientoPage() {
  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <MovimientoFormRefine mode="create" />
      </Stack>
    </Container>
  )
}
