'use client'

/**
 * Listado de Categorías. Modo cliente: son decenas de filas.
 */

import { useMemo } from 'react'
import { IconTags } from '@tabler/icons-react'
import { usePaginacion } from '@/src/application/hooks/usePaginacion'
import { useCategorias, type CategoriasFilters } from '@/src/application/hooks/useCategorias'
import { categoriaColumns } from '@/src/config/categorias/columns'
import { EntityListPage } from '@/src/presentation/components/EntityListPage'
import type { CategoriaListDto } from '@/src/types/categoria.types'

export default function CategoriasPage() {
  const { data, query, tableProps } = usePaginacion<CategoriasFilters, CategoriaListDto>(
    useCategorias,
    { server: false, initialSort: { sortBy: 'nombre', sortDir: 'asc' } },
  )

  const columns = useMemo(() => categoriaColumns(), [])

  return (
    <EntityListPage<CategoriaListDto>
      header={{ title: 'Categorías', icon: IconTags }}
      columns={columns}
      data={data}
      isLoading={query.isLoading}
      isError={query.isError}
      errorMessage="No se han podido cargar las categorías"
      resource="Categorias"
      exportExcel="CATEGORIAS"
      searchPlaceholder="Buscar por nombre..."
      noRecordsText="Todavía no hay ninguna categoría"
      create={{ label: 'Nueva categoría', href: '/Categorias/Create' }}
      {...tableProps}
    />
  )
}
