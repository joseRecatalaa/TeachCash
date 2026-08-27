'use client'

/**
 * Cableado del formulario de Categoría.
 *
 * El reparto es el de siempre: `src/config/categorias/sections.ts` DESCRIBE los
 * campos (sin JSX) y este fichero los conecta con los datos y con el submit.
 */

import { useMemo } from 'react'
import { categoriaSections } from '@/src/config/categorias/sections'
import { useCatalogos } from '@/src/application/hooks/useCatalogos'
import { useCategoria } from '@/src/application/hooks/useCategorias'
import { useEntityFormSubmit } from '@/src/application/hooks/useEntityFormSubmit'
import type { CategoriaSaveDto } from '@/src/types/categoria.types'
import { GenericForm } from '../../GenericForm'

interface CategoriaFormProps {
  id?: string
  mode: 'create' | 'edit'
}

const validate = {
  nombre: (value: unknown) => (!String(value ?? '').trim() ? 'El nombre es obligatorio' : null),
  tipo: (value: unknown) => (!value ? 'Elige si es de ingreso o de gasto' : null),
}

export function CategoriaFormRefine({ id, mode }: CategoriaFormProps) {
  const { query, result } = useCategoria(id ?? '')
  const { categoriasRaizOptions, isLoadingCatalogos } = useCatalogos()
  const { handleSubmit, isSubmitting, fieldErrors } = useEntityFormSubmit<CategoriaSaveDto>({
    resource: 'Categorias',
    entityName: 'Categoría',
    mode,
    id,
  })

  // Memoizado sobre las opciones: sin esto se construiría un array de secciones
  // nuevo en cada tecla y el memo del `FieldRenderer` no cortaría nada.
  const sections = useMemo(
    () => categoriaSections({ categoriasRaizOptions }),
    [categoriasRaizOptions],
  )

  return (
    <GenericForm<CategoriaSaveDto>
      title={{ create: 'Nueva categoría', edit: 'Editar categoría' }}
      sections={sections}
      mode={mode}
      resource="Categorias"
      validate={validate}
      initialValues={{ tipo: 'expense', padreId: '', icono: '', color: '' }}
      isLoadingData={(mode === 'edit' && query.isLoading) || isLoadingCatalogos}
      isSubmitting={isSubmitting}
      fieldErrors={fieldErrors}
      data={result as Partial<CategoriaSaveDto> | null}
      onSubmit={(values) =>
        handleSubmit({
          ...values,
          // El `<Select>` limpio devuelve '' y eso es exactamente lo que el DTO
          // llama "raíz". La traducción a NULL de base la hace el repositorio.
          padreId: values.padreId ?? '',
          icono: values.icono ?? '',
          // Cadena vacía = sin color, que es un estado válido.
          color: values.color ?? '',
        })
      }
      exitTo="/Categorias"
    />
  )
}
