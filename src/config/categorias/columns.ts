/**
 * Listado de Categorías. `.ts` sin JSX y sin argumentos.
 */

import {
  actionsColumn,
  enumColumn,
  textColumn,
} from '@/src/presentation/components/ActionsColumn'
import { COLOR_POR_SENTIDO, type AppTableColumn } from '@/src/config/_shared/types'
import type { CategoriaListDto } from '@/src/types/categoria.types'

export function categoriaColumns(): AppTableColumn<CategoriaListDto>[] {
  return [
    {
      accessor: 'icono',
      title: '',
      type: 'string',
      width: 50,
      sortable: false,
      textAlign: 'center',
    },
    textColumn<CategoriaListDto>('nombre', 'Nombre'),
    // Los colores se declaran, no se dejan a la paleta automática: esa asigna
    // por POSICIÓN del valor, y aquí "gasto" tiene que ser rojo siempre.
    enumColumn<CategoriaListDto>('tipo', 'Tipo', { badgeColors: COLOR_POR_SENTIDO }),
    textColumn<CategoriaListDto>('padreNombre', 'Padre', { searchable: false }),
    {
      accessor: 'usos',
      title: 'Movimientos',
      type: 'number',
      sortable: true,
      filterable: true,
      width: 120,
    },
    actionsColumn<CategoriaListDto>({
      editPath: '/Categorias',
      remove: { resource: 'Categorias', entityName: 'la categoría' },
    }),
  ]
}
