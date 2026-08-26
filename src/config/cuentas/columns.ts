/**
 * Listado de Cuentas.
 *
 * `.ts` sin JSX y sin argumentos. Los permisos y el borrado se DECLARAN
 * (`remove: { resource, entityName }`), no se reciben por parámetro.
 *
 * Usa los helpers de `ActionsColumn` en vez de escribir el `render` a mano: son
 * los que mantienen todas las tablas con el mismo aspecto.
 */

import {
  actionsColumn,
  boolColumn,
  enumColumn,
  moneyColumn,
  textColumn,
} from '@/src/presentation/components/ActionsColumn'
import type { AppTableColumn } from '@/src/config/_shared/types'
import type { CuentaListDto } from '@/src/types/cuenta.types'

export function cuentaColumns(): AppTableColumn<CuentaListDto>[] {
  return [
    textColumn<CuentaListDto>('nombre', 'Nombre'),
    enumColumn<CuentaListDto>('tipo', 'Tipo'),
    {
      accessor: 'divisa',
      title: 'Divisa',
      type: 'string',
      sortable: true,
      filterable: true,
      width: 90,
    },
    // `signed: false`: el saldo de una cuenta es una posición, no un flujo. El
    // signo se pinta solo cuando hay descubierto, que es cuando significa algo.
    moneyColumn<CuentaListDto>('saldoInicial', 'Saldo inicial'),
    moneyColumn<CuentaListDto>('saldo', 'Saldo actual'),
    boolColumn<CuentaListDto>('archivada', 'Archivada'),
    actionsColumn<CuentaListDto>({
      editPath: '/Cuentas',
      remove: { resource: 'Cuentas', entityName: 'la cuenta' },
    }),
  ]
}
