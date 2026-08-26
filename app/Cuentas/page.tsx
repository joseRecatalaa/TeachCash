'use client'

/**
 * Listado de Cuentas.
 *
 * Una página de lista solo declara sus columnas y su configuración. Todo lo
 * demás —cabecera, buscador, filtros, paginación, Excel— lo pone
 * `<EntityListPage>`.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, Group, Switch, Text } from '@mantine/core'
import { IconArrowsExchange, IconWallet } from '@tabler/icons-react'
import { usePaginacion } from '@/src/application/hooks/usePaginacion'
import { useCuentas } from '@/src/application/hooks/useCuentas'
import { usePatrimonio } from '@/src/application/hooks/useInformes'
import { cuentaColumns } from '@/src/config/cuentas/columns'
import { EntityListPage } from '@/src/presentation/components/EntityListPage'
import { formatMoney } from '@/lib/format'
import type { CuentaListDto } from '@/src/types/cuenta.types'

export default function CuentasPage() {
  const [verArchivadas, setVerArchivadas] = useState(false)

  // Modo cliente: son decenas de cuentas, no miles. Traerlas todas permite
  // filtros más ricos y ordenar sin ida y vuelta al servidor.
  const { data, query, tableProps } = usePaginacion<
    { archivadas?: string },
    CuentaListDto
  >(useCuentas, {
    server: false,
    baseFilter: verArchivadas ? { archivadas: '1' } : undefined,
    initialSort: { sortBy: 'nombre', sortDir: 'asc' },
  })

  const { data: patrimonio } = usePatrimonio()
  const columns = useMemo(() => cuentaColumns(), [])

  return (
    <EntityListPage<CuentaListDto>
      header={{ title: 'Cuentas', icon: IconWallet, color: 'teal' }}
      columns={columns}
      data={data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage="No se han podido cargar las cuentas"
      resource="Cuentas"
      exportExcel="CUENTAS"
      searchPlaceholder="Buscar por nombre..."
      noRecordsText="Todavía no hay ninguna cuenta"
      create={{ label: 'Nueva cuenta', href: '/Cuentas/Create' }}
      extraToolbarActions={
        <Group gap="md">
          <Switch
            label="Ver archivadas"
            checked={verArchivadas}
            onChange={(e) => setVerArchivadas(e.currentTarget.checked)}
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
      afterTable={
        patrimonio && patrimonio.length > 0 ? (
          <Group gap="lg" mt="md" justify="flex-end">
            <Text size="sm" c="dimmed">
              Patrimonio total:
            </Text>
            {/* Una cifra POR DIVISA, nunca un total único: sumar euros y dólares
                da un número que no significa nada (regla dura 2). */}
            {patrimonio.map((m) => (
              <Text key={m.currency} fw={600} className="tabular">
                {formatMoney(m)}
              </Text>
            ))}
          </Group>
        ) : null
      }
      {...tableProps}
    />
  )
}
