/**
 * Las opciones de los campos `select` de los formularios.
 *
 * SOLO SERVIDOR.
 *
 * **Las opciones no se declaran en la vista.** Un `select` de `sections.ts` se
 * escribe SIN `options` y el `FieldRenderer` las resuelve desde aquí usando el
 * `name` del campo como clave. Así, el día que se añade un valor a una
 * enumeración se toca un sitio y no cinco.
 *
 * Aquí solo viven las ENUMERACIONES DE VERDAD: conjuntos cerrados que se conocen
 * en tiempo de compilación (el tipo de categoría, el sentido del movimiento).
 * Los CATÁLOGOS —las categorías del usuario— NO salen de aquí: cambian con los
 * datos, se piden con `useCatalogos` y se pasan como `options` explícitas. La
 * diferencia importa porque esto se cachea para siempre.
 */

import { CATEGORY_KINDS } from '@/db/schema'
import type { EnumValueDto, FormMetadata } from '@/src/types/formMetadata.types'
import { SENTIDOS } from './movimientos.repository'

const opciones = <T extends string>(
  valores: readonly T[],
  etiquetas: Record<T, string>,
): EnumValueDto[] => valores.map((key) => ({ key, label: etiquetas[key] }))

export const TIPO_CATEGORIA_LABELS: Record<(typeof CATEGORY_KINDS)[number], string> = {
  income: 'Ingreso',
  expense: 'Gasto',
}

export const SENTIDO_LABELS: Record<(typeof SENTIDOS)[number], string> = {
  expense: 'Gasto',
  income: 'Ingreso',
}

const METADATA: Record<string, FormMetadata> = {
  Categorias: {
    readOnlyFields: [],
    enumFields: {
      tipo: opciones(CATEGORY_KINDS, TIPO_CATEGORIA_LABELS),
    },
  },
  Movimientos: {
    readOnlyFields: [],
    enumFields: {
      sentido: opciones(SENTIDOS, SENTIDO_LABELS),
    },
  },
}

const VACIO: FormMetadata = { readOnlyFields: [], enumFields: {} }

/**
 * Un recurso sin metadata no es un error: hay formularios sin ningún `select`.
 * Devolver `{}` deja que el formulario se pinte igual, con sus campos de texto.
 */
export function getFormMetadata(resource: string): FormMetadata {
  // `Object.hasOwn` y no `METADATA[resource] ?? VACIO`: `resource` llega del
  // cliente, y `METADATA['constructor']` es la función `Object`, no `undefined`.
  return Object.hasOwn(METADATA, resource) ? METADATA[resource] : VACIO
}
