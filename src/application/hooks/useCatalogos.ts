'use client'

/**
 * El catálogo del usuario: sus categorías.
 *
 * Va aparte del metadata a propósito, y la distinción importa: el metadata son
 * ENUMERACIONES cerradas que no cambian hasta el próximo despliegue (el sentido
 * de un movimiento, el tipo de una categoría), y por eso se cachean para
 * siempre. Esto son DATOS del usuario, que cambian en cuanto crea una categoría,
 * y por eso se invalidan con cada mutación de Categorías.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCatalogos, type CatalogoCategoria } from '@/src/application/actions/entity.actions'
import type { Option } from '@/src/presentation/components/Forms/GenericForm/types'

const VACIO = { categorias: [] as CatalogoCategoria[] }

export function useCatalogos() {
  const query = useQuery({
    queryKey: ['catalogos'],
    // 5 minutos: cambian poco dentro de una sesión, pero no son inmutables.
    // La invalidación real la dispara cada mutación de Categorías.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const result = await fetchCatalogos()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })

  const data = query.data ?? VACIO

  /**
   * Las categorías, partidas por tipo. Un movimiento de gasto solo puede
   * clasificarse con una categoría de gasto — el repositorio lo rechaza — así
   * que el desplegable no debe ofrecer las otras.
   */
  const categoriasPorTipo = useMemo<Record<string, Option[]>>(() => {
    const nombrePorId = new Map(data.categorias.map((c) => [c.id, c.nombre]))
    const porTipo: Record<string, Option[]> = { income: [], expense: [] }

    for (const c of data.categorias) {
      // La subcategoría se muestra con su padre delante: "Casa › Luz". Sin eso,
      // tres "Otros" colgando de padres distintos son el mismo texto.
      const padre = c.padreId ? nombrePorId.get(c.padreId) : undefined
      const option: Option = {
        value: c.id,
        label: padre ? `${padre} › ${c.nombre}` : c.nombre,
      }
      porTipo[c.tipo]?.push(option)
    }

    for (const lista of Object.values(porTipo)) {
      lista.sort((a, b) => a.label.localeCompare(b.label, 'es'))
    }
    return porTipo
  }, [data.categorias])

  /** Categorías raíz, para elegir padre. La jerarquía es de un solo nivel. */
  const categoriasRaizOptions = useMemo<Option[]>(
    () =>
      data.categorias
        .filter((c) => c.padreId === null)
        .map((c) => ({ value: c.id, label: c.nombre }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [data.categorias],
  )

  /**
   * `id → clave de color`. Lo usa el badge de categoría de la tabla de
   * movimientos: el listado trae el color de la fila, pero el filtro y las
   * vistas que solo tienen el id lo necesitan aparte.
   */
  const colorDeCategoria = useMemo(
    () => new Map(data.categorias.map((c) => [c.id, c.color ?? ''])),
    [data.categorias],
  )

  return {
    categorias: data.categorias,
    categoriasPorTipo,
    categoriasRaizOptions,
    colorDeCategoria,
    isLoadingCatalogos: query.isLoading,
  }
}
