/**
 * Listado de Categorías. `.ts` sin JSX y sin argumentos.
 */

import {
  actionsColumn,
  enumColumn,
  moneyColumn,
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
    {
      accessor: 'nombre',
      title: 'Nombre',
      type: 'string',
      sortable: true,
      filterable: true,
      badge: true,
      // El nombre en su propio color: es la vista donde se elige el color, así
      // que es donde tiene que verse el resultado. Sin color asignado cae al
      // tono por hash, que al menos es estable.
      badgeColorAccessor: 'color',
    },
    // Los colores se declaran, no se dejan a la paleta automática: esa asigna
    // por POSICIÓN del valor, y aquí "gasto" tiene que ser rojo siempre.
    enumColumn<CategoriaListDto>('tipo', 'Tipo', { badgeColors: COLOR_POR_SENTIDO }),
    moneyColumn<CategoriaListDto>('presupuesto', 'Presupuesto', { filterable: false }),
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
