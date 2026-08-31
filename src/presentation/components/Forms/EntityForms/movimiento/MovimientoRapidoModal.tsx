'use client'

/**
 * Alta rápida de un movimiento desde Planificación mensual.
 *
 * Se abre al clicar la ficha de una categoría: la categoría y el sentido ya
 * están decididos por la ficha en la que se ha clicado, así que el único dato
 * que hace falta es el importe. Es un `GenericForm` normal por dentro —mismas
 * reglas duras, misma validación de servidor—, solo que vive en un `Modal` y
 * usa `onSuccess` en vez de `exitTo`: al guardar se cierra, no se navega.
 */

import { useState } from 'react'
import { Modal } from '@mantine/core'
import { movimientoRapidoSections } from '@/src/config/movimientos/sections'
import { useEntityFormSubmit } from '@/src/application/hooks/useEntityFormSubmit'
import { today } from '@/lib/dates'
import { uuid } from '@/lib/ids'
import type { MovimientoSaveDto } from '@/src/types/movimiento.types'
import { GenericForm } from '../../GenericForm'

interface MovimientoRapidoModalProps {
  categoria: { id: string; nombre: string }
  onClose: () => void
}

const validate = {
  importe: (value: unknown) => {
    if (value === null || value === undefined || value === '') return 'El importe es obligatorio'
    if (!Number.isInteger(value)) return 'Importe no válido'
    if ((value as number) <= 0) return 'El importe debe ser mayor que cero'
    return null
  },
}

export function MovimientoRapidoModal({ categoria, onClose }: MovimientoRapidoModalProps) {
  const { handleSubmit, isSubmitting, fieldErrors } = useEntityFormSubmit<MovimientoSaveDto>({
    resource: 'Movimientos',
    entityName: 'Movimiento',
    mode: 'create',
    genero: 'm',
  })

  // Una clave por apertura del modal, no por envío: ver la nota gemela en
  // `MovimientoFormRefine.tsx`.
  const [idempotencyKey] = useState(() => uuid())

  return (
    <Modal opened onClose={onClose} title={`Nuevo gasto en ${categoria.nombre}`} centered>
      <GenericForm<MovimientoSaveDto>
        title={{ create: 'Nuevo gasto', edit: 'Nuevo gasto' }}
        sections={movimientoRapidoSections()}
        mode="create"
        resource="Movimientos"
        validate={validate}
        initialValues={{
          sentido: 'expense',
          categoriaId: categoria.id,
          fecha: today(),
          descripcion: categoria.nombre,
          importe: null,
          notas: '',
        }}
        isSubmitting={isSubmitting}
        fieldErrors={fieldErrors}
        onSubmit={(values) =>
          handleSubmit({
            ...values,
            idempotencyKey,
          })
        }
        onSuccess={onClose}
      />
    </Modal>
  )
}
