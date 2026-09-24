'use client'

/**
 * Alta rápida de un movimiento desde el listado de Movimientos.
 *
 * A diferencia de `MovimientoRapidoModal` (que fija categoría y sentido desde
 * la ficha en la que se ha clicado, en Planificación), aquí la persona elige
 * sentido y categoría en el propio modal: son los tres datos que hacen falta
 * para anotar un movimiento con rapidez, sin pasar por la página completa.
 *
 * `fecha` es siempre la de hoy y `descripcion` se rellena con el nombre de la
 * categoría elegida — exponer esos dos campos aquí solo añadiría fricción a
 * lo que se supone que es más rápido que el formulario completo. Quien
 * necesite otra fecha o una descripción propia sigue teniendo el formulario
 * de siempre en `/Movimientos/Create`.
 */

import { useMemo, useState } from 'react'
import { Modal } from '@mantine/core'
import { movimientoModalSections } from '@/src/config/movimientos/sections'
import { useCatalogos } from '@/src/application/hooks/useCatalogos'
import { useEntityFormSubmit } from '@/src/application/hooks/useEntityFormSubmit'
import { formatDateLong } from '@/lib/format'
import { today } from '@/lib/dates'
import { uuid } from '@/lib/ids'
import type { MovimientoSaveDto } from '@/src/types/movimiento.types'
import { GenericForm } from '../../GenericForm'
import styles from './NuevoMovimientoModal.module.css'

interface NuevoMovimientoModalProps {
  onClose: () => void
}

const validate = {
  sentido: (value: unknown) => (!value ? 'Elige si es ingreso o gasto' : null),
  categoriaId: (value: unknown) => (!value ? 'Elige una categoría' : null),
  importe: (value: unknown) => {
    if (value === null || value === undefined || value === '') return 'El importe es obligatorio'
    if (!Number.isInteger(value)) return 'Importe no válido'
    if ((value as number) <= 0) return 'El importe debe ser mayor que cero'
    return null
  },
}

export function NuevoMovimientoModal({ onClose }: NuevoMovimientoModalProps) {
  const { categoriasPorTipo, isLoadingCatalogos } = useCatalogos()

  const { handleSubmit, isSubmitting, fieldErrors } = useEntityFormSubmit<MovimientoSaveDto>({
    resource: 'Movimientos',
    entityName: 'Movimiento',
    mode: 'create',
    genero: 'm',
  })

  const sections = useMemo(
    () => movimientoModalSections({ categoriasPorTipo }),
    [categoriasPorTipo],
  )

  // Una clave por apertura del modal, no por envío: ver la nota gemela en
  // `MovimientoFormRefine.tsx`.
  const [idempotencyKey] = useState(() => uuid())

  const titulo = (
    <span className={styles.titulo}>
      <span className={styles.tituloTexto}>Nuevo Movimiento</span>
      <span className={styles.fecha}>{formatDateLong(today())}</span>
    </span>
  )

  return (
    <Modal opened onClose={onClose} title={titulo} centered size="md">
      <GenericForm<MovimientoSaveDto>
        title={{ create: 'Nuevo movimiento', edit: 'Nuevo movimiento' }}
        hideTitle
        sections={sections}
        mode="create"
        resource="Movimientos"
        validate={validate}
        initialValues={{ sentido: 'expense', categoriaId: '', importe: null }}
        isLoadingData={isLoadingCatalogos}
        isSubmitting={isSubmitting}
        fieldErrors={fieldErrors}
        onSubmit={(values) => {
          const sentido = String(values.sentido ?? '')
          const categoriaId = String(values.categoriaId ?? '')
          const categoria = categoriasPorTipo[sentido]?.find((c) => c.value === categoriaId)
          return handleSubmit({
            ...values,
            fecha: today(),
            descripcion: categoria?.label ?? 'Movimiento',
            notas: '',
            idempotencyKey,
          })
        }}
        onSuccess={onClose}
      />
    </Modal>
  )
}
