/**
 * Listado de Movimientos. `.ts` sin JSX.
 *
 * Lleva parámetro (uno de los pocos casos en que sí se pasa): las opciones del
 * filtro de categoría son un CATÁLOGO del usuario, y en modo servidor la tabla
 * solo tiene la página visible. Sin `filterOptions`, el desplegable de filtro
 * solo ofrecería las categorías que aparecen en esas veinte filas.
 */

import {
  actionsColumn,
  dateColumn,
  moneyColumn,
  textColumn,
} from '@/src/presentation/components/ActionsColumn'
import type { AppTableColumn, Option } from '@/src/config/_shared/types'
import type { MovimientoListDto } from '@/src/types/movimiento.types'

export function movimientoColumns({
  categoriasOptions,
}: {
  categoriasOptions: Option[]
}): AppTableColumn<MovimientoListDto>[] {
  return [
    dateColumn<MovimientoListDto>('fecha', 'Fecha'),
    textColumn<MovimientoListDto>('descripcion', 'Descripción'),
    {
      accessor: 'categoriaNombre',
      title: 'Categoría',
      type: 'enum',
      sortable: false,
      filterable: true,
      // El filtro va por id, no por nombre: dos subcategorías de padres
      // distintos pueden llamarse igual.
      enumKey: 'categoriaId',
      filterOptions: categoriasOptions,
      badge: true,
      // El color sale del DATO, no de la columna: cada categoría lleva el suyo.
      // Es lo que hace que la misma categoría se reconozca de un vistazo aquí,
      // en el gráfico de la portada y en su propia lista.
      badgeColorAccessor: 'categoriaColor',
    },
    // `signed: true`: un movimiento es un FLUJO, y aquí el signo es la
    // información principal. Va siempre delante del número, no solo en color.
    moneyColumn<MovimientoListDto>('importe', 'Importe', { signed: true }),
    actionsColumn<MovimientoListDto>({
      editPath: '/Movimientos',
      remove: {
        resource: 'Movimientos',
        entityName: 'el movimiento',
        displayName: 'descripcion',
      },
    }),
  ]
}
