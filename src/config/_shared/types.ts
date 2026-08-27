/**
 * Alias comunes de la capa de configuración.
 *
 * `src/config/` describe las vistas; `src/presentation/` las pinta. Estos alias
 * evitan que cada `sections.ts` y cada `columns.ts` importe la ruta larga de
 * presentation, que es lo que hace que se acabe colando un import de un
 * componente y con él el JSX que estos ficheros no pueden tener.
 */

export type {
  FieldDefinition,
  FormContext,
  Option,
  SectionDefinition,
  VisiblePredicate,
} from '@/src/presentation/components/Forms/GenericForm/types'

export type { AppTableColumn } from '@/src/presentation/components/AppTable/AppTable'

/**
 * Tonos por tipo de movimiento, para los badges.
 *
 * Son CLAVES del sistema de diseño, no colores: el color lo pone
 * `AppTable.module.css` desde los tokens `--income` / `--expense`, que son los
 * únicos validados para daltonismo (ver el bloque 5 de `app/globals.css`).
 *
 * Se declaran una vez y se usan en todas las tablas: si el gasto es rojo en
 * Movimientos y naranja en Categorías, la persona tiene que releer la leyenda
 * cada vez que cambia de pantalla.
 *
 * El color NO es la única señal: los importes llevan siempre su signo delante
 * (`formatMoneySigned`), porque rojo/verde es justo el par que no distingue la
 * deuteranopía.
 */
export const COLOR_POR_SENTIDO: Record<string, string> = {
  income: 'income',
  expense: 'expense',
}
