'use client'

/*
 * La ficha de un nivel, al pulsar su nodo en el camino: qué es, cuánto se
 * tarda, la mejor marca y el botón para jugarlo.
 *
 * Un nivel bloqueado también abre su ficha, pero sin botón y diciendo qué
 * falta: un nodo que no responde al pulsarlo parece roto.
 */

import { Modal } from '@mantine/core'
import type { Route } from 'next'
import { IconClock, IconLock, IconPlayerPlayFilled, IconStarFilled } from '@tabler/icons-react'
import type { NivelEnCaminoDto, TipoNivel } from '@/src/types/heroe.types'
import { SketchButton } from '../ui'
import styles from './FichaNivel.module.css'

const QUE_ES: Record<TipoNivel, string> = {
  lectura: 'Lectura con minitest al final',
  interactivo: 'Práctica con ejercicios',
  jefe: 'El test grande del mundo',
}

export const rutaNivel = (id: string) => `/CaminoHeroe/Nivel?id=${encodeURIComponent(id)}` as Route

export function FichaNivel({
  nivel,
  alCerrar,
}: {
  nivel: NivelEnCaminoDto | null
  alCerrar: () => void
}) {
  return (
    <Modal opened={nivel !== null} onClose={alCerrar} title={nivel?.titulo} centered>
      {nivel && (
        <div className={styles.ficha}>
          <p className={styles.datos}>
            <span>{QUE_ES[nivel.tipo]}</span>
            <span className={styles.dato}>
              <IconClock size={15} aria-hidden />
              {nivel.minutos} min
            </span>
          </p>
          <p className={styles.descripcion}>{nivel.descripcion}</p>

          {nivel.estado === 'hecho' && (
            <p className={styles.marca}>
              <IconStarFilled size={15} aria-hidden />
              Tu mejor marca: {nivel.estrellas} de 3 estrellas
            </p>
          )}

          {nivel.estado === 'bloqueado' ? (
            <p className={styles.bloqueado}>
              <IconLock size={16} aria-hidden />
              Supera el nivel anterior para abrir este.
            </p>
          ) : (
            <SketchButton
              href={rutaNivel(nivel.id)}
              fullWidth
              leftSection={<IconPlayerPlayFilled size={16} aria-hidden />}
            >
              {nivel.estado === 'hecho' ? 'Repetir' : 'Empezar'}
            </SketchButton>
          )}
        </div>
      )}
    </Modal>
  )
}
