'use client'

/**
 * Página de listado genérica.
 *
 * Encapsula lo que TODA página de lista repite: cabecera con icono, estado de
 * error, botón de crear y `AppTable` con su toolbar. Una página de entidad solo
 * define sus columnas y su configuración.
 *
 * @example
 * <EntityListPage<CuentaListDto>
 *   header={{ title: 'Cuentas', icon: IconWallet, color: 'blue' }}
 *   columns={columns}
 *   data={data}
 *   isLoading={query.isLoading}
 *   isError={query.isError}
 *   create={{ label: 'Nueva cuenta', href: '/Cuentas/Create' }}
 *   {...tableProps}
 * />
 */

import type { ComponentType, ReactNode } from 'react'
import Link from 'next/link'
import { Alert, Button, Container, Group, Paper, Stack, Title } from '@mantine/core'
import { IconAlertTriangle, IconPlus } from '@tabler/icons-react'
import { useFormMetadata } from '@/src/application/hooks/useFormMetadata'
import {
  AppTable,
  type AppTableColumn,
  type AppTableManualProps,
} from './AppTable/AppTable'

export interface HeaderConfig {
  title: string
  icon?: ComponentType<{ size?: number | string }>
  /** Color de Mantine para el icono y el borde. */
  color?: string
  description?: string
}

export interface CreateConfig {
  label: string
  href: string
}

export interface EntityListPageProps<T> extends AppTableManualProps<T> {
  header: HeaderConfig
  columns: AppTableColumn<T>[]
  data: T[]
  isLoading: boolean
  isError?: boolean
  errorMessage?: string
  /** Nombre del fichero Excel, sin extensión. Si se omite, no hay botón. */
  exportExcel?: string
  searchPlaceholder?: string
  noRecordsText?: string
  create?: CreateConfig
  idAccessor?: string
  defaultSort?: { columnAccessor: keyof T & string; direction: 'asc' | 'desc' }
  /**
   * Clave de `REPOSITORIES`. Si se pasa, las columnas `type: "enum"` muestran el
   * `label` del metadata en lugar de la clave cruda del DTO.
   */
  resource?: string
  /** Contenido extra por encima del panel (tarjetas de resumen, avisos). */
  beforePanel?: ReactNode
  /** Contenido extra dentro del panel, antes de la tabla (gráficos, filtros). */
  beforeTable?: ReactNode
  afterTable?: ReactNode
  /** Acciones extra en la barra, además del botón de crear. */
  extraToolbarActions?: ReactNode
  onRowClick?: (record: T) => void
}

export function EntityListPage<T extends object>({
  header,
  columns,
  data,
  isLoading,
  isError = false,
  errorMessage = 'No se han podido cargar los datos',
  exportExcel,
  searchPlaceholder,
  noRecordsText,
  create,
  idAccessor,
  defaultSort,
  resource,
  beforePanel,
  beforeTable,
  afterTable,
  extraToolbarActions,
  onRowClick,
  ...manualProps
}: EntityListPageProps<T>) {
  // Se pide siempre que haya `resource`: sin metadata, una columna de enum
  // enseñaría la clave cruda ("checking") en vez de su etiqueta.
  const { metadata } = useFormMetadata(resource)
  const Icono = header.icon

  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        {beforePanel}

        <Paper p="lg" withBorder shadow="xs" radius="md">
          <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
            <Group gap="xs">
              {Icono && <Icono size={24} />}
              <Title order={2} c={header.color}>
                {header.title}
              </Title>
            </Group>
            {create && (
              <Button component={Link} href={create.href} leftSection={<IconPlus size={16} />}>
                {create.label}
              </Button>
            )}
          </Group>

          {isError ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Error">
              {errorMessage}
            </Alert>
          ) : (
            <>
              {beforeTable}
              <AppTable<T>
                data={data}
                columns={columns}
                isLoading={isLoading}
                idAccessor={idAccessor}
                exportExcel={exportExcel}
                searchPlaceholder={searchPlaceholder}
                noRecordsText={noRecordsText}
                defaultSort={defaultSort}
                enumMetadata={metadata.enumFields}
                toolbarActions={extraToolbarActions}
                onRowClick={onRowClick}
                {...manualProps}
              />
              {afterTable}
            </>
          )}
        </Paper>
      </Stack>
    </Container>
  )
}
