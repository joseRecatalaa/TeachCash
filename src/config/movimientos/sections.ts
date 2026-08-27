/**
 * Formulario de Movimiento. `.ts` sin JSX.
 *
 * Es el formulario donde se ven dos reglas duras de golpe:
 *   - el importe es `type: 'money'`, nunca `'number'`;
 *   - la fecha es `type: 'date'`, que en este proyecto significa cadena
 *     'YYYY-MM-DD' sin hora ni huso.
 */

import { IconCash, IconNotes } from '@tabler/icons-react'
import type { Option, SectionDefinition } from '@/src/config/_shared/types'

export function movimientoSections({
  categoriasPorTipo,
}: {
  /** `{ income: [...], expense: [...] }`. Ver `useCatalogos`. */
  categoriasPorTipo: Record<string, Option[]>
}): SectionDefinition[] {
  return [
    {
      title: 'Movimiento',
      icon: IconCash,
      fields: [
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
          span: 12,
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
