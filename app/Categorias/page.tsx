'use client'

/**
 * Listado de Categorías. Modo cliente: son decenas de filas.
 */

import { useMemo, useState } from 'react'
import { IconTags } from '@tabler/icons-react'
import { usePaginacion } from '@/src/application/hooks/usePaginacion'
import { useCategorias, type CategoriasFilters } from '@/src/application/hooks/useCategorias'
import { categoriaColumns } from '@/src/config/categorias/columns'
import { CatalogoPredefinidasModal } from '@/src/presentation/components/Forms/EntityForms/categoria/CatalogoPredefinidasModal'
import { EntityListPage } from '@/src/presentation/components/EntityListPage'
import { SketchButton } from '@/src/presentation/components/ui'
import type { CategoriaListDto } from '@/src/types/categoria.types'

export default function CategoriasPage() {
  const [catalogoAbierto, setCatalogoAbierto] = useState(false)

  // La tabla principal solo enseña las categorías ACTIVAS: las ocultas viven
  // en el catálogo de predefinidas, no mezcladas aquí.
  const { data, query, tableProps } = usePaginacion<CategoriasFilters, CategoriaListDto>(
    useCategorias,
    {
      server: false,
      baseFilter: { oculta: 'false' },
      initialSort: { sortBy: 'nombre', sortDir: 'asc' },
    },
  )

  const columns = useMemo(() => categoriaColumns(), [])

  return (
    <>
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
        noRecordsText="Todavía no hay ninguna categoría activa"
        create={{ label: 'Nueva categoría', href: '/Categorias/Create' }}
        extraToolbarActions={
          <SketchButton variant="secondary" onClick={() => setCatalogoAbierto(true)}>
            Categorías predefinidas
          </SketchButton>
        }
        {...tableProps}
      />
      {catalogoAbierto && (
        <CatalogoPredefinidasModal onClose={() => setCatalogoAbierto(false)} />
      )}
    </>
  )
}
