import { Container, Stack } from '@mantine/core'
import { CategoriaFormRefine } from '@/src/presentation/components/Forms/EntityForms/categoria/CategoriaFormRefine'

export default function CreateCategoriaPage() {
  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <CategoriaFormRefine mode="create" />
      </Stack>
    </Container>
  )
}
