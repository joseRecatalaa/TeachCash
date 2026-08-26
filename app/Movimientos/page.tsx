'use client'

/**
 * Listado de Movimientos.
 *
 * Única lista en MODO SERVIDOR: es la tabla que crece sin techo. El repositorio
 * pagina, ordena y filtra; la tabla solo dice lo que se ha pedido.
 */

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, Group, Switch } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { IconArrowsExchange, IconArrowsLeftRight } from '@tabler/icons-react'
import { usePaginacion } from '@/src/application/hooks/usePaginacion'
import { useCatalogos } from '@/src/application/hooks/useCatalogos'
import {
  useMovimientos,
  useRestaurarMovimiento,
  type MovimientosFilters,
} from '@/src/application/hooks/useMovimientos'
import { movimientoColumns } from '@/src/config/movimientos/columns'
import { EntityListPage } from '@/src/presentation/components/EntityListPage'
import { currentPeriod, monthRange } from '@/lib/dates'
import type { MovimientoListDto } from '@/src/types/movimiento.types'

function MovimientosContenido() {
  // Por defecto, el mes en curso. Sin rango, la primera carga de una base con
  // años de histórico traería la página 1 de miles de filas y no diría nada.
  const [rango, setRango] = useState<[string | null, string | null]>(() => {
    const { from, to } = monthRange(currentPeriod())
    return [from, to]
  })

  // La papelera se enseña APARTE, no mezclada con los vivos: una lista donde
  // conviven movimientos borrados y no borrados tiene totales que no cuadran.
  const [verBorrados, setVerBorrados] = useState(false)

  const { cuentasOptions, categoriasPorTipo } = useCatalogos()
  const { restaurar } = useRestaurarMovimiento()

  const baseFilter = useMemo<MovimientosFilters>(
    () => ({
      desde: rango[0] ?? undefined,
      hasta: rango[1] ?? undefined,
      borrados: verBorrados ? '1' : undefined,
    }),
    [rango, verBorrados],
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
    () => movimientoColumns({ cuentasOptions, categoriasOptions, verBorrados, onRestaurar: restaurar }),
    [cuentasOptions, categoriasOptions, verBorrados, restaurar],
  )

  return (
    <EntityListPage<MovimientoListDto>
      header={{
        title: verBorrados ? 'Movimientos borrados' : 'Movimientos',
        icon: IconArrowsLeftRight,
        color: verBorrados ? 'gray' : 'blue',
      }}
      columns={columns}
      data={data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage="No se han podido cargar los movimientos"
      resource="Movimientos"
      exportExcel="MOVIMIENTOS"
      searchPlaceholder="Buscar por descripción..."
      noRecordsText={
        verBorrados ? 'No hay movimientos borrados' : 'No hay movimientos en este periodo'
      }
      create={
        verBorrados
          ? undefined
          : { label: 'Nuevo movimiento', href: '/Movimientos/Create' }
      }
      extraToolbarActions={
        <Group gap="sm">
          <Switch
            label="Ver borrados"
            checked={verBorrados}
            onChange={(e) => setVerBorrados(e.currentTarget.checked)}
          />
          <DatePickerInput
            type="range"
            value={rango}
            onChange={setRango}
            valueFormat="DD/MM/YYYY"
            placeholder="Periodo"
            clearable
            w={240}
          />
          <Button
            variant="default"
            component={Link}
            href="/Movimientos/Transferencia"
            leftSection={<IconArrowsExchange size={16} />}
          >
            Transferencia
          </Button>
        </Group>
      }
      {...tableProps}
    />
  )
}

export default function MovimientosPage() {
  return (
    <Suspense fallback={null}>
      <MovimientosContenido />
    </Suspense>
  )
}
