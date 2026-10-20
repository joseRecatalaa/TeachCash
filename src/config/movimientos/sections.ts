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
          required: true,
          span: { base: 12, md: 6 },
          // Solo las categorías del sentido elegido. Una categoría de gasto en
          // un ingreso descoloca todos los informes, y el repositorio la
          // rechaza: mejor no ofrecerla.
          optionsFrom: (values) => categoriasPorTipo[String(values.sentido ?? '')] ?? [],
          // `optionsFrom` lee `sentido`, así que necesita `dependsOn` igual que
          // un campo `component`/`render`: sin esto el memo de `FieldRenderer`
          // no repinta el select al cambiar el sentido y las opciones se quedan
          // congeladas con las del primer render.
          dependsOn: ['sentido'],
        },
        {
          name: 'fecha',
          label: 'Fecha',
          type: 'date',
          required: true,
          span: { base: 12, md: 6 },
          tooltip: 'El día del gasto, no el de la anotación.',
          // No se anota lo que aún no ha pasado. Lo impone el repositorio;
          // esto solo evita ofrecer en el calendario días que va a rechazar.
          noFutureDates: true,
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

/**
 * Alta rápida desde el listado de Movimientos: sentido, categoría e importe.
 *
 * `fecha`, `descripcion` y `notas` NO se declaran aquí — a diferencia de
 * `movimientoRapidoSections`, aquí la categoría no se conoce de antemano (la
 * elige la persona en el propio modal), así que el `onSubmit` del modal
 * resuelve `descripcion` a partir de la categoría elegida y fija `fecha` a
 * hoy antes de enviar.
 */
export function movimientoModalSections({
  categoriasPorTipo,
}: {
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
          span: 12,
        },
        {
          name: 'categoriaId',
          label: 'Categoría',
          type: 'select',
          required: true,
          span: 12,
          optionsFrom: (values) => categoriasPorTipo[String(values.sentido ?? '')] ?? [],
          dependsOn: ['sentido'],
        },
        {
          name: 'importe',
          label: 'Importe',
          type: 'money',
          required: true,
          span: 12,
        },
      ],
    },
  ]
}

/**
 * Alta rápida desde Planificación mensual: un único campo.
 *
 * `categoriaId`, `sentido`, `fecha` y `descripcion` NO se declaran aquí — el
 * modal que usa esta sección los fija en `initialValues` del `GenericForm`, y
 * como ningún campo los sobrescribe, viajan igual en el `onSubmit`.
 */
export function movimientoRapidoSections(): SectionDefinition[] {
  return [
    {
      title: 'Nuevo gasto',
      icon: IconCash,
      fields: [
        {
          name: 'importe',
          label: 'Importe',
          type: 'money',
          required: true,
          span: 12,
        },
      ],
    },
  ]
}
