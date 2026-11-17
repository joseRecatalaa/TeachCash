'use client'

/**
 * Saca de la caché las listas de un recurso que NO están en pantalla.
 *
 * Refine, al borrar, solo las marca como caducadas y confía en que se vuelvan a
 * pedir al montarse. En la práctica la lista de "Últimos movimientos" de Inicio
 * seguía enseñando el movimiento borrado hasta recargar con F5: un dato que ya no
 * existe y que no parece un error. Quitándolas, la página que vuelva a montarlas
 * no tiene nada viejo que pintar y está obligada a ir al servidor.
 *
 * Las listas activas (la tabla desde la que se borra) no se tocan: esas ya las
 * refresca Refine, y quitarlas haría parpadear la tabla.
 */

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { keys } from '@refinedev/core'

export function useOlvidarListas() {
  const queryClient = useQueryClient()
  return useCallback(
    (resource: string) =>
      queryClient.removeQueries({
        // La misma clave que construye `useList` de Refine con el data provider
        // por defecto: ['data', 'default', <recurso>, 'list', …].
        queryKey: keys().data('default').resource(resource).action('list').get(),
        type: 'inactive',
      }),
    [queryClient],
  )
}
