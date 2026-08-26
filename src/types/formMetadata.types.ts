/**
 * Metadata de formulario: las opciones de los campos de tipo `select`.
 *
 * Las sirve la Server Action `fetchFormMetadata`, desde
 * `src/infrastructure/repositories/metadata.repository.ts`, y las consume el
 * hook `useFormMetadata(resource)`.
 *
 * La regla de fondo: **las opciones no se declaran en la vista**. Un `select` de
 * `sections.ts` se escribe SIN `options` y las recibe de aquí, usando el `name`
 * del campo como clave. Así el día que se añade un tipo de cuenta se toca un
 * sitio y no cinco.
 */

/** Una opción: `key` es lo que viaja a la base, `label` lo que lee la persona. */
export interface EnumValueDto {
  key: string
  label: string
}

export interface FormMetadata {
  /** Campos que el formulario pinta deshabilitados (la divisa de una cuenta ya creada). */
  readOnlyFields: string[]
  /** `{ tipo: [...], divisa: [...] }` — indexado por el `name` del campo. */
  enumFields: Record<string, EnumValueDto[]>
}

export const EMPTY_FORM_METADATA: FormMetadata = {
  readOnlyFields: [],
  enumFields: {},
}
