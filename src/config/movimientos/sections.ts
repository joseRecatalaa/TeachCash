/**
 * Formulario de Movimiento. `.ts` sin JSX.
 *
 * Es el formulario donde se ven las dos reglas duras de golpe:
 *   - el importe es `type: 'money'` y su divisa sale de la CUENTA elegida;
 *   - la fecha es `type: 'date'`, que en este proyecto significa cadena
 *     'YYYY-MM-DD' sin hora ni huso.
 */

import { IconCalendar, IconCash, IconNotes } from '@tabler/icons-react'
import type { Option, SectionDefinition } from '@/src/config/_shared/types'

export function movimientoSections({
  cuentasOptions,
  categoriasPorTipo,
}: {
  cuentasOptions: Option[]
  /** `{ income: [...], expense: [...] }`. Ver `useCatalogos`. */
  categoriasPorTipo: Record<string, Option[]>
}): SectionDefinition[] {
  return [
    {
      title: 'Movimiento',
      icon: IconCash,
      fields: [
        {
          name: 'cuentaId',
          label: 'Cuenta',
          type: 'select',
          required: true,
          options: cuentasOptions,
          span: { base: 12, md: 6 },
          tooltip: 'La divisa del importe es la de esta cuenta.',
        },
        {
          name: 'sentido',
          label: 'Sentido',
          type: 'select',
          required: true,
          span: { base: 12, md: 6 },
          tooltip:
            'El importe se escribe siempre en positivo; esto decide si suma o resta.',
        },
        {
          name: 'importe',
          label: 'Importe',
          type: 'money',
          required: true,
          span: { base: 12, md: 6 },
          // El campo se reformatea cuando cambia la cuenta porque con ella
          // cambia la divisa, y con la divisa cambia la escala (EUR tiene dos
          // decimales; otra podría no tenerlos). Sin este `dependsOn` el memo
          // del FieldRenderer se lo saltaría y seguiría pintando la escala vieja.
          dependsOn: ['cuentaId'],
        },
        {
          name: 'categoriaId',
          label: 'Categoría',
          type: 'select',
          clearable: true,
          span: { base: 12, md: 6 },
          // Solo las categorías del sentido elegido. Una categoría de gasto en
          // un ingreso descoloca todos los informes, y el repositorio la
          // rechaza: mejor no ofrecerla.
          optionsFrom: (values) => categoriasPorTipo[String(values.sentido ?? '')] ?? [],
          tooltip: 'Opcional. Un movimiento sin clasificar es válido.',
        },
        {
          name: 'fecha',
          label: 'Fecha',
          type: 'date',
          required: true,
          span: { base: 12, md: 6 },
          tooltip: 'El día del gasto, no el de la anotación.',
        },
        {
          name: 'descripcion',
          label: 'Descripción',
          type: 'text',
          placeholder: 'Compra semanal, Nómina de agosto...',
          required: true,
          span: { base: 12, md: 6 },
        },
      ],
    },
    {
      title: 'Notas',
      icon: IconNotes,
      fields: [
        {
          name: 'notas',
          label: 'Notas',
          type: 'textarea',
          rows: 3,
          span: 12,
        },
      ],
    },
  ]
}

/**
 * Formulario de transferencia.
 *
 * Va aparte del de movimiento porque una transferencia NO es un movimiento: son
 * dos, atadas por `transferId`, escritas en la misma transacción de base de
 * datos. Mezclarlas en un solo formulario con campos que aparecen y desaparecen
 * acaba en una pata guardada sin la otra.
 */
export function transferenciaSections({
  cuentasOptions,
}: {
  cuentasOptions: Option[]
}): SectionDefinition[] {
  return [
    {
      title: 'Transferencia',
      icon: IconCalendar,
      description:
        'Mueve dinero entre dos cuentas tuyas. No cuenta como ingreso ni como gasto, así que no aparece en los informes — pero sí cambia el saldo de las dos cuentas.',
      fields: [
        {
          name: 'cuentaOrigenId',
          label: 'Cuenta de origen',
          type: 'select',
          required: true,
          options: cuentasOptions,
          span: { base: 12, md: 6 },
        },
        {
          name: 'cuentaDestinoId',
          label: 'Cuenta de destino',
          type: 'select',
          required: true,
          // No se ofrece la cuenta ya elegida como origen: transferir a uno
          // mismo no es nada, y el repositorio lo rechaza.
          optionsFrom: (values) =>
            cuentasOptions.filter((o) => o.value !== String(values.cuentaOrigenId ?? '')),
          span: { base: 12, md: 6 },
        },
        {
          name: 'importe',
          label: 'Importe',
          type: 'money',
          required: true,
          span: { base: 12, md: 6 },
          dependsOn: ['cuentaOrigenId'],
          tooltip:
            'Las dos cuentas tienen que estar en la misma divisa: todavía no hay tipos de cambio.',
        },
        {
          name: 'fecha',
          label: 'Fecha',
          type: 'date',
          required: true,
          span: { base: 12, md: 6 },
        },
        {
          name: 'descripcion',
          label: 'Descripción',
          type: 'text',
          placeholder: 'Traspaso al ahorro',
          required: true,
          span: 12,
        },
        {
          name: 'notas',
          label: 'Notas',
          type: 'textarea',
          rows: 2,
          span: 12,
        },
      ],
    },
  ]
}
