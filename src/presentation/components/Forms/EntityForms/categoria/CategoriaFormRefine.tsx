'use client'

/**
 * Cableado del formulario de Categoría.
 *
 * El reparto es el de siempre: `src/config/categorias/sections.ts` DESCRIBE los
 * campos (sin JSX) y este fichero los conecta con los datos y con el submit.
 */

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { categoriaSections } from '@/src/config/categorias/sections'
import { useCategoria, useOcultarCategoria } from '@/src/application/hooks/useCategorias'
import { useEntityFormSubmit } from '@/src/application/hooks/useEntityFormSubmit'
import { SketchButton } from '@/src/presentation/components/ui'
import type { CategoriaSaveDto } from '@/src/types/categoria.types'
import { GenericForm } from '../../GenericForm'

interface CategoriaFormProps {
  id?: string
  mode: 'create' | 'edit'
}

const validate = {
  nombre: (value: unknown) => (!String(value ?? '').trim() ? 'El nombre es obligatorio' : null),
  tipo: (value: unknown) => (!value ? 'Elige si es de ingreso o de gasto' : null),
  presupuesto: (value: unknown, values: Record<string, unknown>) =>
    values.tipo === 'expense' && (value === null || value === undefined || (value as number) <= 0)
      ? 'El presupuesto mensual es obligatorio para una categoría de gasto'
      : null,
}

export function CategoriaFormRefine({ id, mode }: CategoriaFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { query, result } = useCategoria(id ?? '')
  const { handleSubmit, isSubmitting, fieldErrors } = useEntityFormSubmit<CategoriaSaveDto>({
    resource: 'Categorias',
    entityName: 'Categoría',
    mode,
    id,
  })
  const { ocultar, isPending: isOcultando } = useOcultarCategoria()

  // Memoizado: sin esto se construiría un array de secciones nuevo en cada
  // tecla y el memo del `FieldRenderer` no cortaría nada.
  const sections = useMemo(() => categoriaSections(), [])

  return (
    <GenericForm<CategoriaSaveDto>
      title={{ create: 'Nueva categoría', edit: 'Editar categoría' }}
      sections={sections}
      mode={mode}
      resource="Categorias"
      validate={validate}
      initialValues={{ tipo: 'expense', icono: '', color: '', presupuesto: null }}
      isLoadingData={mode === 'edit' && query.isLoading}
      isSubmitting={isSubmitting}
      fieldErrors={fieldErrors}
      data={result as Partial<CategoriaSaveDto> | null}
      onSubmit={async (values) => {
        const resultado = await handleSubmit({
          ...values,
          icono: values.icono ?? '',
          // Cadena vacía = sin color, que es un estado válido.
          color: values.color ?? '',
          presupuesto: values.presupuesto ?? null,
        })
        // El catálogo (`useCatalogos`) alimenta el <Select> de categoría de un
        // movimiento nuevo: sin invalidarlo aquí, una categoría recién creada o
        // renombrada no aparecería hasta recargar.
        if (resultado) await queryClient.invalidateQueries({ queryKey: ['catalogos'] })
        return resultado
      }}
      exitTo="/Categorias"
    >
      {mode === 'edit' && (
        <SketchButton
          type="button"
          variant="ghost"
          loading={isOcultando}
          onClick={async () => {
            if (await ocultar(id ?? '')) router.push('/Categorias')
          }}
        >
          Ocultar esta categoría
        </SketchButton>
      )}
    </GenericForm>
  )
}
