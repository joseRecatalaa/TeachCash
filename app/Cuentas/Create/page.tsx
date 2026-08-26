import { Container, Stack } from '@mantine/core'
import { CuentaFormRefine } from '@/src/presentation/components/Forms/EntityForms/cuenta/CuentaFormRefine'

export default function CreateCuentaPage() {
  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <CuentaFormRefine mode="create" />
      </Stack>
    </Container>
  )
}
