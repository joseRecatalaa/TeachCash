/**
 * Leer un error de Postgres sin saber qué driver hay debajo.
 *
 * Drizzle envuelve el error del driver en un `DrizzleQueryError` y lo deja en
 * `cause`. El driver de la app (postgres-js) llama a la restricción
 * `constraint_name`; el de los tests (PGlite), `constraint`. Esto mira los dos
 * niveles y los dos nombres para que el repositorio no tenga que saberlo.
 */

/** SQLSTATE de "violación de UNIQUE". */
export const UNIQUE_VIOLATION = '23505'

type ErrorPg = { code?: unknown; constraint?: unknown; constraint_name?: unknown; cause?: unknown }

function capas(err: unknown): ErrorPg[] {
  const salida: ErrorPg[] = []
  let actual: unknown = err
  // Dos niveles bastan (Drizzle → driver); el tope evita un bucle con un
  // `cause` circular.
  for (let i = 0; i < 3 && actual && typeof actual === 'object'; i++) {
    salida.push(actual as ErrorPg)
    actual = (actual as ErrorPg).cause
  }
  return salida
}

/** ¿Es este error un choque con la restricción UNIQUE `restriccion`? */
export function esChoqueUnico(err: unknown, restriccion: string): boolean {
  return capas(err).some(
    (e) =>
      e.code === UNIQUE_VIOLATION &&
      (e.constraint === restriccion || e.constraint_name === restriccion),
  )
}
