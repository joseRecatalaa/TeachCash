'use client'

/**
 * Cableado del formulario de Movimiento.
 *
 * Es el que más trabajo hace de los tres, por una razón concreta: la divisa del
 * importe no está en el formulario, se hereda de la cuenta elegida. Ver
 * `divisaFrom` más abajo.
 */

import { useMemo, useState } from 'react'
import { movimientoSections } from '@/src/config/movimientos/sections'
import { useCatalogos } from '@/src/application/hooks/useCatalogos'
import { useEntityFormSubmit } from '@/src/application/hooks/useEntityFormSubmit'
import { useMovimiento } from '@/src/application/hooks/useMovimientos'
import { today } from '@/lib/dates'
import { asCurrency, isCurrency, type Currency } from '@/lib/money'
import type { MovimientoSaveDto } from '@/src/types/movimiento.types'
import { GenericForm } from '../../GenericForm'

interface MovimientoFormProps {
  id?: string
  mode: 'create' | 'edit'
  /** Cuenta preseleccionada, al crear desde la ficha de una cuenta. */
  cuentaId?: string
}

const validate = {
  cuentaId: (value: unknown) => (!value ? 'Elige una cuenta' : null),
  sentido: (value: unknown) => (!value ? 'Elige si es ingreso o gasto' : null),
  fecha: (value: unknown) => (!value ? 'La fecha es obligatoria' : null),
  descripcion: (value: unknown) =>
    !String(value ?? '').trim() ? 'Pon una descripción' : null,
  importe: (value: unknown) => {
    if (value === null || value === undefined || value === '') return 'El importe es obligatorio'
    if (!Number.isInteger(value)) return 'Importe no válido'
    if ((value as number) <= 0) return 'El importe debe ser mayor que cero'
    return null
  },
}

export function MovimientoFormRefine({ id, mode, cuentaId }: MovimientoFormProps) {
  const { query, result } = useMovimiento(id ?? '')
  const { cuentasOptions, categoriasPorTipo, divisaDeCuenta, isLoadingCatalogos } =
    useCatalogos()

  const { handleSubmit, isSubmitting, fieldErrors } = useEntityFormSubmit<MovimientoSaveDto>({
    resource: 'Movimientos',
    entityName: 'Movimiento',
    mode,
    id,
    genero: 'm',
  })

  const sections = useMemo(
    () => movimientoSections({ cuentasOptions, categoriasPorTipo }),
    [cuentasOptions, categoriasPorTipo],
  )

  /**
   * Una clave por formulario ABIERTO, no por envío.
   *
   * Es lo que hace que el doble clic en Guardar —o el reintento tras un error de
   * red que sí llegó— no cree dos movimientos iguales. `useState` con
   * inicializador perezoso: si se generara en el cuerpo del componente, cada
   * repintado daría una clave nueva y no serviría de nada.
   */
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  /**
   * La divisa sale de la cuenta elegida, no de un campo del formulario.
   *
   * Es la regla dura 2 puesta en la interfaz: el importe no significa nada hasta
   * que se sabe en qué está, y aquí eso lo decide la cuenta. Mientras no haya
   * cuenta se cae a EUR — hay que formatear algo — pero el campo de importe está
   * vacío de todas formas, así que no se le enseña una cifra en la divisa
   * equivocada a nadie.
   */
  const divisaFrom = useMemo(
    () => (values: Record<string, unknown>): Currency => {
      const bruto = divisaDeCuenta.get(String(values.cuentaId ?? ''))
      return bruto && isCurrency(bruto) ? asCurrency(bruto) : 'EUR'
    },
    [divisaDeCuenta],
  )

  return (
    <GenericForm<MovimientoSaveDto>
      title={{ create: 'Nuevo movimiento', edit: 'Editar movimiento' }}
      sections={sections}
      mode={mode}
      resource="Movimientos"
      divisaFrom={divisaFrom}
      validate={validate}
      initialValues={{
        cuentaId: cuentaId ?? '',
        sentido: 'expense',
        categoriaId: '',
        // Hoy en el huso del usuario. `today()` es el único punto del proyecto
        // que mira el reloj; el resto son fechas civiles ya resueltas.
        fecha: today(),
        importe: null,
        notas: '',
      }}
      isLoadingData={(mode === 'edit' && query.isLoading) || isLoadingCatalogos}
      isSubmitting={isSubmitting}
      fieldErrors={fieldErrors}
      data={result as Partial<MovimientoSaveDto> | null}
      onSubmit={(values) =>
        handleSubmit({
          ...values,
          importe: values.importe ?? 0,
          categoriaId: values.categoriaId ?? '',
          notas: values.notas ?? '',
          // Solo en el alta: reeditar dos veces sí es una operación legítima.
          ...(mode === 'create' ? { idempotencyKey } : {}),
        })
      }
      exitTo="/Movimientos"
    />
  )
}
