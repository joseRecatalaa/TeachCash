'use client'

/**
 * Cableado del formulario de Movimiento.
 *
 * El reparto es el de siempre: `src/config/movimientos/sections.ts` DESCRIBE los
 * campos (sin JSX) y este fichero los conecta con los catálogos y el submit.
 */

import { useMemo, useState } from 'react'
import { movimientoSections } from '@/src/config/movimientos/sections'
import { useCatalogos } from '@/src/application/hooks/useCatalogos'
import { useEntityFormSubmit } from '@/src/application/hooks/useEntityFormSubmit'
import { useMovimiento } from '@/src/application/hooks/useMovimientos'
import { today } from '@/lib/dates'
import { uuid } from '@/lib/ids'
import type { MovimientoSaveDto } from '@/src/types/movimiento.types'
import { GenericForm } from '../../GenericForm'

interface MovimientoFormProps {
  id?: string
  mode: 'create' | 'edit'
}

const validate = {
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

export function MovimientoFormRefine({ id, mode }: MovimientoFormProps) {
  const { query, result } = useMovimiento(id ?? '')
  const { categoriasPorTipo, isLoadingCatalogos } = useCatalogos()

  const { handleSubmit, isSubmitting, fieldErrors } = useEntityFormSubmit<MovimientoSaveDto>({
    resource: 'Movimientos',
    entityName: 'Movimiento',
    mode,
    id,
    genero: 'm',
  })

  const sections = useMemo(
    () => movimientoSections({ categoriasPorTipo }),
    [categoriasPorTipo],
  )

  /**
   * Una clave por formulario ABIERTO, no por envío.
   *
   * Es lo que hace que el doble clic en Guardar —o el reintento tras un error de
   * red que sí llegó— no cree dos movimientos iguales. `useState` con
   * inicializador perezoso: si se generara en el cuerpo del componente, cada
   * repintado daría una clave nueva y no serviría de nada.
   *
   * `uuid()` y NO `crypto.randomUUID()`: esto corre en el navegador, y ahí
   * `randomUUID` solo existe en contexto seguro (HTTPS o localhost). Abriendo la
   * aplicación por la IP de la red —que este proyecto soporta a propósito— la
   * función no existe y el formulario revienta al montarse. Ver `lib/ids.ts`.
   */
  const [idempotencyKey] = useState(() => uuid())

  return (
    <GenericForm<MovimientoSaveDto>
      title={{ create: 'Nuevo movimiento', edit: 'Editar movimiento' }}
      sections={sections}
      mode={mode}
      resource="Movimientos"
      validate={validate}
      initialValues={{
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
