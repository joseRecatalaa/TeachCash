/**
 * DTOs de Categoría.
 *
 * La convención del proyecto son tres por entidad: `ListDto` (lo que ve una
 * tabla), `SaveDto` (lo que manda un formulario) y `FormDto` (lo que rellena un
 * formulario de edición: el `SaveDto` más el id).
 */

export interface CategoriaListDto {
  id: string
  nombre: string
  /** income | expense. Enum como string: las opciones vienen del metadata. */
  tipo: string
  /** Jerarquía de un solo nivel. Cadena vacía = categoría raíz. */
  padreId: string
  padreNombre: string | null
  icono: string | null
  /**
   * CLAVE de la paleta ('cat-1'…'cat-8'), no un color. Cadena vacía = sin
   * asignar. Ver `lib/colores.ts`: guardar la clave y no el hexadecimal es lo
   * que hace que el modo oscuro y un cambio de tono no toquen los datos.
   */
  color: string
  /**
   * Céntimos, positivo. `null` en una categoría de ingreso, o en una de gasto
   * que todavía no lo tiene fijado (categorías anteriores a esta funcionalidad).
   */
  presupuesto: number | null
  /** Oculta = no se ofrece en Movimientos ni aparece en Planificación mensual. */
  oculta: boolean
  /** Nº de movimientos que la usan. Decide si se puede borrar. */
  usos: number
}

export interface CategoriaSaveDto {
  nombre: string
  tipo: string
  /**
   * Cadena vacía = raíz, no `null`. Un `<Select>` de Mantine con valor `null`
   * es "sin tocar"; con cadena vacía es "elegida la opción raíz". La conversión
   * a NULL de base la hace el repositorio, que es donde vive esa semántica.
   */
  padreId: string
  icono: string
  color: string
  /** Obligatorio si `tipo === 'expense'`; el repositorio lo ignora en ingreso. */
  presupuesto: number | null
}

export interface CategoriaFormDto extends CategoriaSaveDto {
  id: string
}
