'use client'

/**
 * Listado de Movimientos.
 *
 * Única lista en MODO SERVIDOR: es la tabla que crece sin techo. El repositorio
 * pagina, ordena y filtra; la tabla solo dice lo que se ha pedido.
 */

import { Suspense, useMemo, useState } from 'react'
import { Group } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconArrowsLeftRight } from '@tabler/icons-react'
import { usePaginacion } from '@/src/application/hooks/usePaginacion'
import { useCatalogos } from '@/src/application/hooks/useCatalogos'
import { useMovimientos, type MovimientosFilters } from '@/src/application/hooks/useMovimientos'
import { movimientoColumns } from '@/src/config/movimientos/columns'
import { EntityListPage } from '@/src/presentation/components/EntityListPage'
import { NuevoMovimientoModal } from '@/src/presentation/components/Forms/EntityForms/movimiento/NuevoMovimientoModal'
import { currentPeriod, monthRange } from '@/lib/dates'
import type { MovimientoListDto } from '@/src/types/movimiento.types'

function MovimientosContenido() {
  // Por defecto, el mes en curso. Sin rango, la primera carga de una base con
  // años de histórico traería la página 1 de miles de filas y no diría nada.
  const [rango, setRango] = useState<[string | null, string | null]>(() => {
    const { from, to } = monthRange(currentPeriod())
    return [from, to]
  })

  // "Nuevo movimiento" abre un modal en vez de navegar a /Movimientos/Create:
  // anotar un gasto es la acción más frecuente de la aplicación y no debería
  // costar un cambio de página.
  const [modalAbierto, setModalAbierto] = useState(false)

  const { categoriasPorTipo } = useCatalogos()

  const baseFilter = useMemo<MovimientosFilters>(
    () => ({
      desde: rango[0] ?? undefined,
      hasta: rango[1] ?? undefined,
    }),
    [rango],
  )

  const { data, query, tableProps } = usePaginacion<MovimientosFilters, MovimientoListDto>(
    useMovimientos,
    { baseFilter, initialSort: { sortBy: 'fecha', sortDir: 'desc' } },
  )

  // Las dos listas de categorías juntas: el filtro de la tabla no distingue
  // ingreso de gasto, a diferencia del selector del formulario.
  const categoriasOptions = useMemo(
    () => [...(categoriasPorTipo.expense ?? []), ...(categoriasPorTipo.income ?? [])],
    [categoriasPorTipo],
  )

  const columns = useMemo(
    () => movimientoColumns({ categoriasOptions }),
    [categoriasOptions],
  )

  return (
    <>
      <EntityListPage<MovimientoListDto>
        header={{ title: 'Movimientos', icon: IconArrowsLeftRight }}
        columns={columns}
        data={data}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage="No se han podido cargar los movimientos"
        resource="Movimientos"
        exportExcel="MOVIMIENTOS"
        searchPlaceholder="Buscar por descripción..."
        noRecordsText="No hay movimientos en este periodo"
        create={{ label: 'Nuevo movimiento', onClick: () => setModalAbierto(true) }}
        extraToolbarActions={
          <Group gap="sm">
            <DatePickerInput
              type="range"
              value={rango}
              onChange={setRango}
              valueFormat="DD/MM/YYYY"
              placeholder="Periodo"
              clearable
              w={240}
            />
          </Group>
        }
        {...tableProps}
      />
      {modalAbierto && <NuevoMovimientoModal onClose={() => setModalAbierto(false)} />}
    </>
  )
}

export default function MovimientosPage() {
  return (
    <Suspense fallback={null}>
      <MovimientosContenido />
    </Suspense>
  )
}
