'use client'

/**
 * La Tienda: lo que se compra con las estrellas de los cursos. El precio y si hay
 * estrellas los decide el servidor; esta página solo manda el id del objeto.
 */

import { Container, Loader } from '@mantine/core'
import { useTienda } from '@/src/application/hooks/useCuadro'
import { Tienda } from '@/src/presentation/components/Tienda/Tienda'
import { EmptyState, SketchButton, SketchTitle } from '@/src/presentation/components/ui'
import styles from '../page.module.css'

export default function TiendaPage() {
  const tienda = useTienda()

  return (
    <Container fluid px="xl" py="xl">
      <div className={styles.page}>
        <SketchTitle>Tienda</SketchTitle>
        {tienda.isPending && (
          <div className={styles.cargando}>
            <Loader aria-label="Cargando la tienda" />
          </div>
        )}
        {tienda.error && (
          <EmptyState
            titulo="No se ha podido cargar"
            descripcion={tienda.error.message}
            accion={<SketchButton onClick={() => void tienda.refetch()}>Reintentar</SketchButton>}
          />
        )}
        {tienda.data && <Tienda tienda={tienda.data} />}
      </div>
    </Container>
  )
}
