'use client'

import { Container, Stack } from '@mantine/core'
import { useEntityId } from '@/src/presentation/components/useEntityId'
import { CategoriaFormRefine } from '@/src/presentation/components/Forms/EntityForms/categoria/CategoriaFormRefine'

/** `/Categorias/Edit/<id>`: el id va en la ruta (`useEntityId`), no en `?id=`. */
export default function EditCategoriaPage() {
  const id = useEntityId()
  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <CategoriaFormRefine mode="edit" id={id} />
      </Stack>
    </Container>
  )
}
