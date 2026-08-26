'use client'

/**
 * Metadata de formulario: las opciones de los campos `select`.
 *
 * Lo consumen el `GenericForm` (para resolver las opciones de un `select`
 * declarado sin ellas) y el `AppTable` (para enseñar el `label` de un enum en
 * lugar de su clave cruda).
 *
 * `staleTime: Infinity` porque son conjuntos cerrados que no cambian en
 * ejecución: los tipos de cuenta son los que hay hasta el próximo despliegue.
 * Los CATÁLOGOS (cuentas, categorías) sí cambian y van por `useCatalogos`.
 */

import { useQuery } from '@tanstack/react-query'
import { fetchFormMetadata } from '@/src/application/actions/entity.actions'
import { EMPTY_FORM_METADATA, type FormMetadata } from '@/src/types/formMetadata.types'

export function useFormMetadata(resource?: string) {
  const query = useQuery({
    queryKey: ['formMetadata', resource],
    enabled: Boolean(resource),
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<FormMetadata> => {
      const result = await fetchFormMetadata(resource!)
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })

  return {
    // Nunca `undefined`: quien lo consume indexa `enumFields` sin comprobar, y
    // un formulario a medio cargar debe pintarse con selects vacíos, no romper.
    metadata: query.data ?? EMPTY_FORM_METADATA,
    isLoadingMetadata: query.isLoading,
  }
}
