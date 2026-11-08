'use client'

/*
 * El marco común de las pantallas del Camino del héroe: el título de toda la
 * aplicación (`SketchTitle`) con su descripción al lado, la vuelta atrás, el aviso de que es contenido educativo y los
 * estados de carga y de error.
 *
 * El aviso va en TODAS las pantallas del módulo y no se puede cerrar: el
 * contenido habla de dinero, y tiene que quedar claro que enseña conceptos y
 * no recomienda nada a nadie.
 */

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { Container, Loader } from '@mantine/core'
import { IconArrowLeft, IconInfoCircle } from '@tabler/icons-react'
import { EmptyState, SketchButton, SketchTitle } from '../ui'
import { FiltroPixel } from './reproductor/Marcado'
import styles from './PaginaHeroe.module.css'

export function PaginaHeroe({
  titulo,
  subtitulo,
  volver,
  heroeEncima = false,
  children,
}: {
  titulo: string
  subtitulo?: string
  volver?: { href: Route; texto: string }
  /** Hay un héroe de pie sobre la tarjeta (`ProgresoNivel`): la cabecera le deja sitio. */
  heroeEncima?: boolean
  children: ReactNode
}) {
  return (
    <Container fluid px="xl" py={heroeEncima ? 'md' : 'xl'}>
      <FiltroPixel />
      <div className={styles.pagina}>
        <header className={styles.cabecera}>
          {volver && (
            <Link href={volver.href} className={styles.volver}>
              <IconArrowLeft size={16} aria-hidden />
              {volver.texto}
            </Link>
          )}
          <div className={styles.lineaTitulo} data-heroe-encima={heroeEncima || undefined}>
            <SketchTitle>{titulo}</SketchTitle>
            {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
          </div>
        </header>
        {children}
        <p className={styles.aviso} role="note">
          <IconInfoCircle size={15} aria-hidden />
          Contenido educativo, no asesoramiento financiero.
        </p>
      </div>
    </Container>
  )
}

export function Cargando() {
  return (
    <div className={styles.cargando}>
      <Loader aria-label="Cargando" />
    </div>
  )
}

/** Un error de carga. "No encontrado" incluye el nivel bloqueado, a propósito. */
export function ErrorHeroe({ mensaje, volver }: { mensaje: string; volver: { href: Route; texto: string } }) {
  return (
    <EmptyState
      titulo={mensaje === 'No encontrado' ? 'Aquí no hay nada (todavía)' : 'No se ha podido cargar'}
      descripcion={
        mensaje === 'No encontrado'
          ? 'Este nivel no existe o aún está bloqueado: supera los anteriores para abrirlo.'
          : mensaje
      }
      accion={
        <SketchButton href={volver.href} variant="secondary">
          {volver.texto}
        </SketchButton>
      }
    />
  )
}
