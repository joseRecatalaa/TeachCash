/**
 * DTOs de Categoría. Ver `cuenta.types.ts` para la convención de los tres DTOs.
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
}

export interface CategoriaFormDto extends CategoriaSaveDto {
  id: string
}
