/**
 * Registro de errores del servidor, sin los datos de la persona.
 *
 * Un error de Drizzle trae en el mensaje los PARÁMETROS de la consulta
 * ("Failed query: insert … \nparams: -4590,Farmacia,…"): importes,
 * descripciones y notas. Y el error de Postgres que lleva dentro trae en
 * `detail` la fila entera ("Failing row contains (…)"). Un log se guarda más
 * tiempo que el dato, lo lee más gente y acaba en servicios de terceros, así
 * que nada de eso entra: se registra QUÉ falló y DÓNDE, no CON QUÉ.
 *
 * Todo `catch` que registre un error en el servidor pasa por aquí, no por
 * `console.error` a pelo.
 */

export type ErrorDescrito = {
  nombre: string
  mensaje: string
  /** SQLSTATE de Postgres o código de Supabase Auth, si lo hay. */
  codigo?: string
  /** Solo las líneas `at …`: la primera de la pila repite el mensaje entero. */
  pila?: string[]
  causa?: ErrorDescrito
}

const LINEAS_DE_PILA = 5
const NIVELES_DE_CAUSA = 3

/** El mensaje sin la parte `params:` que añade Drizzle. */
const sinParametros = (mensaje: string): string => mensaje.split(/\n?params:/)[0].trim()

/**
 * Lo que se puede registrar de un error. `detail`, `params`, `query` como
 * propiedad y cualquier otro campo se quedan fuera A PROPÓSITO: no se copia el
 * objeto y se borra lo peligroso, se copia solo lo que se sabe inocuo.
 */
export function describirError(err: unknown, nivel = 0): ErrorDescrito {
  if (!(err instanceof Error)) {
    return { nombre: err === null ? 'null' : typeof err, mensaje: String(err) }
  }

  const { code, cause } = err as { code?: unknown; cause?: unknown }
  const descrito: ErrorDescrito = { nombre: err.name, mensaje: sinParametros(err.message) }
  if (typeof code === 'string' || typeof code === 'number') descrito.codigo = String(code)

  const pila = err.stack
    ?.split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at '))
    .slice(0, LINEAS_DE_PILA)
  if (pila?.length) descrito.pila = pila

  if (cause !== undefined && nivel < NIVELES_DE_CAUSA) {
    descrito.causa = describirError(cause, nivel + 1)
  }
  return descrito
}

/** Registra un error en el log del servidor. `contexto` dice desde dónde. */
export function registrarError(contexto: string, err: unknown): void {
  console.error(`[${contexto}]`, JSON.stringify(describirError(err)))
}
