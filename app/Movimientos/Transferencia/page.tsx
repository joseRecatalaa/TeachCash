import { Container, Stack } from '@mantine/core'
import { TransferenciaFormRefine } from '@/src/presentation/components/Forms/EntityForms/movimiento/TransferenciaFormRefine'

/**
 * Alta de transferencia.
 *
 * No cuelga de `Movimientos/Create` porque no es un movimiento: escribe dos
 * filas en una transacción. Ver `TransferenciaFormRefine`.
 */
export default function TransferenciaPage() {
  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <TransferenciaFormRefine />
      </Stack>
    </Container>
  )
}
