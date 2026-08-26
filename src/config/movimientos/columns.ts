/**
 * Listado de Movimientos. `.ts` sin JSX.
 *
 * Lleva parámetro (uno de los tres casos en que sí se pasa): las opciones de
 * los filtros de cuenta y categoría son un CATÁLOGO del usuario, y en modo
 * servidor la tabla solo tiene la página visible. Sin `filterOptions`, el
 * desplegable de filtro solo ofrecería las cuentas que aparecen en esas veinte
 * filas.
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
  cuentasOptions,
  categoriasOptions,
  verBorrados = false,
  onRestaurar,
}: {
  cuentasOptions: Option[]
  categoriasOptions: Option[]
  /** La vista está enseñando la papelera: se ofrece restaurar, no editar. */
  verBorrados?: boolean
  onRestaurar?: (id: string) => void
}): AppTableColumn<MovimientoListDto>[] {
  return [
    dateColumn<MovimientoListDto>('fecha', 'Fecha'),
    textColumn<MovimientoListDto>('descripcion', 'Descripción'),
    {
      accessor: 'cuentaNombre',
      title: 'Cuenta',
      type: 'enum',
      sortable: false,
      filterable: true,
      // El filtro va por id, no por nombre: dos cuentas pueden llamarse igual.
      enumKey: 'cuentaId',
      filterOptions: cuentasOptions,
    },
    {
      accessor: 'categoriaNombre',
      title: 'Categoría',
      type: 'enum',
      sortable: false,
      filterable: true,
      enumKey: 'categoriaId',
      filterOptions: categoriasOptions,
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
      // Una pata de transferencia no se edita suelta: cambiarle el importe a una
      // sola descuadra las dos cuentas entre sí. Se borra la transferencia
      // entera (el borrado sí se ofrece, y arrastra la otra pata) y se rehace.
      // En la papelera no se edita nada: primero se restaura.
      canEdit: (row) => !verBorrados && !row.transferenciaId,
      restore: onRestaurar
        ? { onRestore: onRestaurar, canRestore: () => verBorrados }
        : undefined,
    }),
  ]
}
