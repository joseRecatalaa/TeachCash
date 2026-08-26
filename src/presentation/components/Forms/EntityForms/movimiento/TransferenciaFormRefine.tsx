'use client'

/**
 * Cableado del formulario de Transferencia.
 *
 * Vive en la carpeta de Movimiento porque es de la misma entidad, pero es un
 * formulario propio: una transferencia escribe DOS filas en una transacción, no
 * es un `create` de movimiento con campos extra.
 *
 * Solo existe en modo alta. Una transferencia no se edita: cambiarle el importe
 * a una de las patas descuadra las dos cuentas entre sí. Se borra y se rehace.
 */

import { useMemo } from 'react'
import { transferenciaSections } from '@/src/config/movimientos/sections'
import { useCatalogos } from '@/src/application/hooks/useCatalogos'
import { useCrearTransferencia } from '@/src/application/hooks/useMovimientos'
import { today } from '@/lib/dates'
import { asCurrency, isCurrency, type Currency } from '@/lib/money'
import type { TransferenciaSaveDto } from '@/src/types/movimiento.types'
import { GenericForm } from '../../GenericForm'

const validate = {
  cuentaOrigenId: (value: unknown) => (!value ? 'Elige la cuenta de origen' : null),
  cuentaDestinoId: (value: unknown, values: Record<string, unknown>) => {
    if (!value) return 'Elige la cuenta de destino'
    if (value === values.cuentaOrigenId) return 'Tiene que ser una cuenta distinta'
    return null
  },
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

export function TransferenciaFormRefine() {
  const { cuentasOptions, divisaDeCuenta, isLoadingCatalogos } = useCatalogos()
  const { crear, isPending } = useCrearTransferencia()

  const sections = useMemo(
    () => transferenciaSections({ cuentasOptions }),
    [cuentasOptions],
  )

  // La divisa la manda la cuenta de ORIGEN. Que la de destino esté en otra la
  // rechaza el repositorio con un mensaje explícito: sin tipos de cambio, una
  // transferencia entre divisas sería inventarse un importe.
  const divisaFrom = useMemo(
    () => (values: Record<string, unknown>): Currency => {
      const bruto = divisaDeCuenta.get(String(values.cuentaOrigenId ?? ''))
      return bruto && isCurrency(bruto) ? asCurrency(bruto) : 'EUR'
    },
    [divisaDeCuenta],
  )

  return (
    <GenericForm<TransferenciaSaveDto>
      title={{ create: 'Nueva transferencia', edit: 'Nueva transferencia' }}
      sections={sections}
      mode="create"
      divisaFrom={divisaFrom}
      validate={validate}
      initialValues={{
        cuentaOrigenId: '',
        cuentaDestinoId: '',
        importe: null,
        fecha: today(),
        notas: '',
      }}
      isLoadingData={isLoadingCatalogos}
      isSubmitting={isPending}
      onSubmit={async (values) => {
        const ok = await crear({
          ...values,
          importe: values.importe ?? 0,
          notas: values.notas ?? '',
        })
        // `undefined` le dice al GenericForm que no navegue: el error ya se ha
        // enseñado y la persona tiene que poder corregir sobre lo que escribió.
        // Cualquier otra cosa y navega él a `exitTo`.
        return ok ? { ok } : undefined
      }}
      exitTo="/Movimientos"
    />
  )
}
