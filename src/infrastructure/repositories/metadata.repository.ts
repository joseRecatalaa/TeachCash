/**
 * Las opciones de los campos `select` de los formularios.
 *
 * SOLO SERVIDOR.
 *
 * **Las opciones no se declaran en la vista.** Un `select` de `sections.ts` se
 * escribe SIN `options` y el `FieldRenderer` las resuelve desde aquí usando el
 * `name` del campo como clave. Así, el día que se añade un tipo de cuenta se
 * toca un sitio y no cinco.
 *
 * Aquí solo viven las ENUMERACIONES DE VERDAD: conjuntos cerrados que se conocen
 * en tiempo de compilación (tipo de cuenta, divisa, sentido del movimiento). Los
 * CATÁLOGOS —las cuentas del usuario, sus categorías— NO salen de aquí: cambian
 * con los datos, se piden con `useCatalogos` y se pasan como `options`
 * explícitas. La diferencia importa porque esto se cachea para siempre.
 */

import { ACCOUNT_TYPES, CATEGORY_KINDS } from '@/db/schema'
import { CURRENCIES } from '@/lib/money'
import type { EnumValueDto, FormMetadata } from '@/src/types/formMetadata.types'
import { SENTIDOS } from './movimientos.repository'

const opciones = <T extends string>(
  valores: readonly T[],
  etiquetas: Record<T, string>,
): EnumValueDto[] => valores.map((key) => ({ key, label: etiquetas[key] }))

export const TIPO_CUENTA_LABELS: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  checking: 'Cuenta corriente',
  savings: 'Ahorro',
  card: 'Tarjeta de crédito',
  cash: 'Efectivo',
  investment: 'Inversión',
}

export const TIPO_CATEGORIA_LABELS: Record<(typeof CATEGORY_KINDS)[number], string> = {
  income: 'Ingreso',
  expense: 'Gasto',
}

export const SENTIDO_LABELS: Record<(typeof SENTIDOS)[number], string> = {
  expense: 'Gasto',
  income: 'Ingreso',
}

/** El símbolo va en la etiqueta: un `<Select>` de tres letras no dice nada. */
export const DIVISA_LABELS: Record<(typeof CURRENCIES)[number], string> = {
  EUR: 'Euro (€)',
  USD: 'Dólar ($)',
  GBP: 'Libra (£)',
}

const METADATA: Record<string, FormMetadata> = {
  Cuentas: {
    readOnlyFields: [],
    enumFields: {
      tipo: opciones(ACCOUNT_TYPES, TIPO_CUENTA_LABELS),
      divisa: opciones(CURRENCIES, DIVISA_LABELS),
    },
  },
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
  return METADATA[resource] ?? VACIO
}
