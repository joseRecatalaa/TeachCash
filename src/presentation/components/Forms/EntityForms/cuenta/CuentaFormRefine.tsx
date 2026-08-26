'use client'

/**
 * Cableado del formulario de Cuenta: hooks, submit y `<GenericForm>`.
 *
 * Lo que hace un `FormRefine` y lo que no:
 *   - **Sí**: traer los datos, montar el submit, dar los valores iniciales y la
 *     validación de cliente.
 *   - **No**: declarar los campos. Eso vive en `src/config/cuentas/sections.ts`.
 */

import { useMemo } from 'react'
import { cuentaSections } from '@/src/config/cuentas/sections'
import { useCuenta } from '@/src/application/hooks/useCuentas'
import { useEntityFormSubmit } from '@/src/application/hooks/useEntityFormSubmit'
import type { Currency } from '@/lib/money'
import type { CuentaSaveDto } from '@/src/types/cuenta.types'
import { GenericForm } from '../../GenericForm'

interface CuentaFormProps {
  id?: string
  mode: 'create' | 'edit'
}

/**
 * Validación de cliente. Es una cortesía, no la defensa: la de verdad es el
 * esquema Zod del repositorio, que corre en el servidor y no se puede saltar.
 * Esta solo evita un viaje de ida y vuelta para decir lo obvio.
 */
const validate = {
  nombre: (value: unknown) => (!String(value ?? '').trim() ? 'El nombre es obligatorio' : null),
  tipo: (value: unknown) => (!value ? 'Elige un tipo de cuenta' : null),
  divisa: (value: unknown) => (!value ? 'Elige una divisa' : null),
  saldoInicial: (value: unknown) =>
    // `null` es "vacío", y vacío aquí significa cero: una cuenta que empieza a
    // cero es lo normal. Lo que no vale es un valor a medio escribir.
    value !== null && !Number.isInteger(value) ? 'Importe no válido' : null,
}

export function CuentaFormRefine({ id, mode }: CuentaFormProps) {
  const { query, result } = useCuenta(id ?? '')
  const { handleSubmit, isSubmitting, fieldErrors } = useEntityFormSubmit<CuentaSaveDto>({
    resource: 'Cuentas',
    entityName: 'Cuenta',
    mode,
    id,
  })

  const sections = useMemo(() => cuentaSections(), [])

  return (
    <GenericForm<CuentaSaveDto>
      title={{ create: 'Nueva cuenta', edit: 'Editar cuenta' }}
      sections={sections}
      mode={mode}
      resource="Cuentas"
      // La divisa del formulario es la que la persona esté eligiendo: con ella
      // cambia cómo se parsea y se pinta el saldo inicial.
      divisaFrom={(values) => (values.divisa as Currency) || 'EUR'}
      validate={validate}
      initialValues={{ tipo: 'checking', divisa: 'EUR', saldoInicial: null }}
      isLoadingData={mode === 'edit' && query.isLoading}
      isSubmitting={isSubmitting}
      fieldErrors={fieldErrors}
      data={result as Partial<CuentaSaveDto> | null}
      onSubmit={(values) =>
        handleSubmit({
          ...values,
          // El campo vacío es cero, no null: el DTO exige un entero.
          saldoInicial: values.saldoInicial ?? 0,
        })
      }
      exitTo="/Cuentas"
    />
  )
}
