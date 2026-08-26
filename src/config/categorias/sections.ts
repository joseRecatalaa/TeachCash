/**
 * Formulario de Categoría. `.ts` sin JSX.
 *
 * Lleva parámetro porque las opciones de "categoría padre" son un CATÁLOGO (los
 * datos del usuario), no una enumeración: no pueden venir del metadata. El
 * `FormRefine` las saca de `useCatalogos` y las pasa aquí, memoizadas.
 */

import { IconTag } from '@tabler/icons-react'
import type { Option, SectionDefinition } from '@/src/config/_shared/types'

export function categoriaSections({
  categoriasRaizOptions,
}: {
  /** Solo las categorías de primer nivel: la jerarquía es de un nivel. */
  categoriasRaizOptions: Option[]
}): SectionDefinition[] {
  return [
    {
      title: 'Datos de la categoría',
      icon: IconTag,
      color: 'grape',
      fields: [
        {
          name: 'nombre',
          label: 'Nombre',
          type: 'text',
          placeholder: 'Comida, Nómina, Luz...',
          required: true,
          span: { base: 12, md: 6 },
        },
        {
          name: 'tipo',
          label: 'Tipo',
          type: 'select',
          required: true,
          span: { base: 12, md: 6 },
          // El tipo tampoco se cambia después: los movimientos ya clasificados
          // con ella dejarían de cuadrar con su sentido y los informes de meses
          // cerrados cambiarían solos.
          disabledWhen: (_values, context) => context.mode === 'edit',
          tooltip:
            'Una categoría es de ingreso o de gasto, nunca las dos. No se puede cambiar después.',
        },
        {
          name: 'padreId',
          label: 'Categoría padre',
          type: 'select',
          clearable: true,
          span: { base: 12, md: 6 },
          // Opciones estáticas y no del metadata: son datos del usuario.
          // `optionsFrom` filtra las que no encajan con el tipo elegido — una
          // subcategoría de gasto colgando de una de ingreso no tiene sentido, y
          // el repositorio la rechaza de todas formas.
          optionsFrom: (values) => {
            const propioId = String(values.id ?? '')
            // Una categoría no puede ser su propia padre.
            return categoriasRaizOptions.filter((o) => o.value !== propioId)
          },
          tooltip: 'Déjala vacía para una categoría de primer nivel.',
        },
        {
          name: 'icono',
          label: 'Icono',
          type: 'text',
          placeholder: '🍽️',
          span: { base: 12, md: 6 },
          tooltip: 'Un emoji corto. Se muestra junto al nombre en las listas.',
        },
      ],
    },
  ]
}
