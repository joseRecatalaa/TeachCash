'use client'

/**
 * Catálogos del usuario: sus cuentas y sus categorías.
 *
 * Van aparte del metadata a propósito, y la distinción importa: el metadata son
 * ENUMERACIONES cerradas que no cambian hasta el próximo despliegue (los tipos
 * de cuenta, las divisas), y por eso se cachean para siempre. Esto son DATOS del
 * usuario, que cambian en cuanto crea una cuenta, y por eso se invalidan con
 * cada mutación de Cuentas o Categorías.
 *
 * Los dos se piden en una sola llamada porque el formulario de movimiento
 * necesita ambos: pedirlos por separado son dos peticiones en cascada para
 * pintar un formulario.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCatalogos, type CatalogoCategoria, type CatalogoCuenta } from '@/src/application/actions/entity.actions'
import type { Option } from '@/src/presentation/components/Forms/GenericForm/types'

const VACIO = { cuentas: [] as CatalogoCuenta[], categorias: [] as CatalogoCategoria[] }

export function useCatalogos() {
  const query = useQuery({
    queryKey: ['catalogos'],
    // 5 minutos: cambian poco dentro de una sesión, pero no son inmutables.
    // La invalidación real la dispara cada mutación de Cuentas o Categorías.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const result = await fetchCatalogos()
      if (!result.ok) throw new Error(result.error)
      return result.data
    },
  })

  const data = query.data ?? VACIO

  const cuentasOptions = useMemo<Option[]>(
    () =>
      data.cuentas.map((c) => ({
        value: c.id,
        // La divisa va en la etiqueta: sin ella, dos cuentas "Ahorro" en euros y
        // en dólares son indistinguibles en el desplegable.
        label: `${c.nombre} (${c.divisa})`,
      })),
    [data.cuentas],
  )

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

  /** `id → divisa`. Lo necesita el campo de importe para su escala. */
  const divisaDeCuenta = useMemo(
    () => new Map(data.cuentas.map((c) => [c.id, c.divisa])),
    [data.cuentas],
  )

  return {
    cuentas: data.cuentas,
    categorias: data.categorias,
    cuentasOptions,
    categoriasPorTipo,
    categoriasRaizOptions,
    divisaDeCuenta,
    isLoadingCatalogos: query.isLoading,
  }
}
