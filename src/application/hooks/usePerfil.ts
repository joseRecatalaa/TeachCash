'use client'

/**
 * Hooks del perfil: el patrimonio inicial.
 *
 * Escritos a mano, como los de informes: no es un CRUD de Refine. Su query
 * cuelga de `['informes']` a propósito —el patrimonio que enseña la portada lo
 * suma—, así que `queryClient.clear()` al cambiar de usuario y
 * `useInvalidarDerivados` lo cubren sin tener que acordarse de él.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import {
  fetchPatrimonioInicial,
  guardarPatrimonioInicial,
} from '@/src/application/actions/perfil.actions'
import { useInvalidarDerivados } from './useInformes'

/** `data === null`: aún no lo ha elegido. `undefined`: todavía no se sabe. */
export function usePatrimonioInicial() {
  return useQuery({
    queryKey: ['informes', 'patrimonioInicial'],
    queryFn: async () => {
      const r = await fetchPatrimonioInicial()
      if (!r.ok) throw new Error(r.error)
      return r.data
    },
  })
}

/**
 * Guarda el patrimonio inicial e invalida todo lo derivado: cambia el saldo y
 * la serie entera, y sin invalidar la portada seguiría enseñando la cifra vieja.
 */
export function useGuardarPatrimonioInicial() {
  const invalidarDerivados = useInvalidarDerivados()
  return useMutation({
    mutationFn: async (patrimonioInicial: number) => {
      const r = await guardarPatrimonioInicial({ patrimonioInicial })
      // El error del campo dice qué corregir; el general solo que algo falló.
      if (!r.ok) throw new Error(r.fieldErrors?.patrimonioInicial ?? r.error)
      return r.data
    },
    onSuccess: () => invalidarDerivados(),
  })
}
