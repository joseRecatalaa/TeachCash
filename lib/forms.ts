/**
 * Estado de las Server Actions y utilidades de formulario.
 *
 * Los errores esperados se DEVUELVEN, no se lanzan: una excepción en producción
 * es un mensaje genérico de Next y ningún detalle para quien está rellenando el
 * formulario. → skill `server-action-safety`
 */

export type FieldErrors = Record<string, string[] | undefined>

export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  | { status: 'error'; error?: string; fieldErrors?: FieldErrors }

/**
 * Estado inicial de `useActionState`. Es 'idle' y no 'success' a propósito: con
 * dos estados, el formulario aparecería diciendo "guardado" antes de que nadie
 * haya guardado nada.
 */
export const idleState: ActionState = { status: 'idle' }

export const fail = (error: string): ActionState => ({ status: 'error', error })

export const invalid = (fieldErrors: FieldErrors): ActionState => ({
  status: 'error',
  fieldErrors,
})

export const ok = (message?: string): ActionState => ({ status: 'success', message })

/**
 * Mensaje único para "no existe" y "no es tuyo". Distinguirlos le dice a quien
 * prueba IDs al azar cuáles existen.
 */
export const NOT_FOUND = 'No encontrado'

/** Lee un campo de texto de un FormData, ya recortado. */
export const field = (data: FormData, name: string): string => {
  const value = data.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

/** Lee un campo opcional: cadena vacía se trata como ausente. */
export const optionalField = (data: FormData, name: string): string | null =>
  field(data, name) || null
