'use client'

/**
 * Cuadro de mando: la portada. Junta el dinero y el juego en una pantalla: el
 * patrimonio, las estrellas, el héroe con lo que ha comprado y sus estadísticas.
 *
 * Todo llega de una vez y ya calculado por `useCuadro`. El detalle del dinero vive
 * en `/Patrimonio` y el de los objetos en `/Tienda`; aquí solo se mira y se salta.
 */

import { Container, Loader, VisuallyHidden } from '@mantine/core'
import { useCuadro } from '@/src/application/hooks/useCuadro'
import { CuadroMando } from '@/src/presentation/components/Cuadro/CuadroMando'
import { EmptyState, SketchButton } from '@/src/presentation/components/ui'
import styles from './page.module.css'

export default function CuadroDeMandoPage() {
  const cuadro = useCuadro()

  return (
    <Container fluid px="xl" py="xl">
      <div className={styles.page}>
        {/* El título solo para el lector de pantalla: arriba van el patrimonio y las
            estadísticas, como el marcador de un juego. */}
        <VisuallyHidden component="h1">Cuadro de mando</VisuallyHidden>
        {cuadro.isPending && (
          <div className={styles.cargando}>
            <Loader aria-label="Cargando el cuadro de mando" />
          </div>
        )}
        {cuadro.error && (
          <EmptyState
            titulo="No se ha podido cargar"
            descripcion={cuadro.error.message}
            accion={<SketchButton onClick={() => void cuadro.refetch()}>Reintentar</SketchButton>}
          />
        )}
        {cuadro.data && <CuadroMando cuadro={cuadro.data} />}
      </div>
    </Container>
  )
}
