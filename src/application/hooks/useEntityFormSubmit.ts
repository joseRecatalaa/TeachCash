'use client'

/**
 * Hook genérico de submit para formularios.
 *
 * El `FormRefine` de cada entidad lo cablea y no escribe mutaciones a mano: así
 * el alta y la edición se comportan igual en toda la aplicación, incluidos los
 * mensajes de éxito y de error.
 *
 * Devuelve `handleSubmit`, `isSubmitting` y `fieldErrors`. Este último es el que
 * permite pintar el error EN EL CAMPO y no solo en la notificación: en un
 * formulario de quince campos, un aviso arriba no dice cuál está mal. Los
 * errores llegan tipados desde el Zod del repositorio, indexados por el mismo
 * nombre de campo que usa el formulario.
 */

import { useCallback, useState } from 'react'
import { useCreate, useUpdate, type BaseRecord, type HttpError } from '@refinedev/core'
import { notifications } from '@mantine/notifications'
import { DataProviderError } from '@/src/application/providers/refine-data-provider'
import { useInvalidarDerivados } from './useInformes'

interface UseEntityFormSubmitConfig {
  /** Clave de `REPOSITORIES`. Debe coincidir exactamente. */
  resource: string
  /** Nombre en singular para los mensajes: "Categoría creada correctamente". */
  entityName: string
  mode: 'create' | 'edit'
  id?: string
  /** Género gramatical para el mensaje. Por defecto femenino ("creada"). */
  genero?: 'm' | 'f'
}

/**
 * Extrae el mensaje más útil posible de un fallo de la capa de datos.
 *
 * Devuelve siempre un string no vacío; nunca propaga un objeto ni el interior
 * de la base de datos — de eso ya se encarga `entity.actions.ts`, que solo deja
 * pasar mensajes escritos para una persona.
 */
export function extractActionError(err: unknown): string {
  if (err instanceof DataProviderError) return err.message
  if (err instanceof Error && err.message) return err.message
  return 'Se ha producido un error inesperado'
}

/** Los errores por campo, si el fallo los trae. */
export function extractFieldErrors(err: unknown): Record<string, string> {
  return err instanceof DataProviderError ? (err.fieldErrors ?? {}) : {}
}

export function useEntityFormSubmit<TSave>({
  resource,
  entityName,
  mode,
  id,
  genero = 'f',
}: UseEntityFormSubmitConfig) {
  const createMutation = useCreate<BaseRecord, HttpError, TSave>()
  const updateMutation = useUpdate<BaseRecord, HttpError, TSave>()
  // Refine invalida su propio cache del recurso, pero el saldo y los gráficos
  // viven en otro árbol de queries y no se enteran. Sin esto, se anota un gasto
  // y la portada sigue enseñando la cifra de antes.
  const invalidarDerivados = useInvalidarDerivados()

  /**
   * Errores por campo del último intento. Se guardan en estado en vez de leerse
   * de la mutación porque el formulario los inyecta en Mantine con
   * `form.setErrors` y necesita un valor estable entre renders.
   */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = useCallback(
    async (values: TSave): Promise<BaseRecord | undefined> => {
      setFieldErrors({})
      const participio = genero === 'm' ? 'creado' : 'creada'
      const participioEdit = genero === 'm' ? 'actualizado' : 'actualizada'

      try {
        if (mode === 'create') {
          const res = await createMutation.mutateAsync({ resource, values })
          await invalidarDerivados()
          notifications.show({
            title: 'Hecho',
            message: `${entityName} ${participio} correctamente`,
            color: 'teal',
          })
          return res.data
        }

        if (!id) {
          // Llegar aquí es un bug de cableado del formulario, no un error de la
          // persona: sin id no hay nada que actualizar.
          throw new Error('Falta el identificador del registro a editar')
        }

        const res = await updateMutation.mutateAsync({ resource, id, values })
        await invalidarDerivados()
        notifications.show({
          title: 'Hecho',
          message: `${entityName} ${participioEdit} correctamente`,
          color: 'teal',
        })
        return res.data
      } catch (err) {
        const campos = extractFieldErrors(err)
        setFieldErrors(campos)
        notifications.show({
          title: 'No se ha podido guardar',
          message: extractActionError(err),
          color: 'red',
        })
        return undefined
      }
    },
    [createMutation, updateMutation, invalidarDerivados, resource, entityName, mode, id, genero],
  )

  return {
    handleSubmit,
    isSubmitting: createMutation.mutation.isPending || updateMutation.mutation.isPending,
    fieldErrors,
  }
}
