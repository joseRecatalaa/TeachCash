/**
 * Las reglas del Camino del héroe que no dependen de nada: qué respuesta es
 * correcta y cuántas estrellas vale una partida.
 *
 * Puras y sin base de datos, para poder probarlas al 100 %. Las usa el
 * repositorio, que es quien CORRIGE (regla dura 6): el cliente también tiene
 * las soluciones, porque las necesita para el feedback inmediato, pero lo que
 * cuenta como superado lo decide el servidor con estas funciones.
 *
 * `lib/` no importa de `src/`, así que aquí se describe solo la forma que hace
 * falta para corregir. Las preguntas de `src/types/heroe.types.ts` encajan en
 * ella sin conversión.
 */

/** Lo mínimo de una pregunta para saber si una respuesta es la buena. */
export type Corregible =
  | { tipo: 'opcion'; correcta: number }
  | { tipo: 'hueco'; correcta: number }
  | { tipo: 'verdaderoFalso'; correcta: boolean }
  | { tipo: 'ordenar'; pasos: readonly unknown[] }
  | { tipo: 'emparejar'; pares: readonly unknown[] }
  | { tipo: 'calcula'; solucion: number; tolerancia: number }

/**
 * La respuesta a "ordenar" y a "emparejar" es una lista de ÍNDICES del
 * contenido original: en qué orden puso los pasos, o qué definición le dio a
 * cada concepto. La buena es la identidad (0, 1, 2…), porque el contenido se
 * escribe ya en el orden correcto y es el cliente quien lo baraja.
 */
const esIdentidad = (r: unknown, n: number): boolean =>
  Array.isArray(r) && r.length === n && r.every((v, i) => v === i)

/**
 * Si `respuesta` es la correcta. Una respuesta con la forma equivocada (un
 * texto donde va un número) no es correcta, sin lanzar: la forma ya la ha
 * validado el repositorio, y aquí se responde lo prudente.
 */
export function esCorrecta(pregunta: Corregible, respuesta: unknown): boolean {
  switch (pregunta.tipo) {
    case 'opcion':
    case 'hueco':
    case 'verdaderoFalso':
      return respuesta === pregunta.correcta
    case 'ordenar':
      return esIdentidad(respuesta, pregunta.pasos.length)
    case 'emparejar':
      return esIdentidad(respuesta, pregunta.pares.length)
    case 'calcula':
      // Enteros en la unidad mínima (céntimos, centésimas de punto): la
      // tolerancia se compara sin un solo decimal (regla dura 1).
      return (
        Number.isSafeInteger(respuesta) &&
        Math.abs((respuesta as number) - pregunta.solucion) <= pregunta.tolerancia
      )
  }
}

/** El porcentaje de aciertos para superar una lectura o un interactivo. El jefe declara el suyo. */
export const APROBADO_POR_DEFECTO = 60

/** A partir de qué porcentaje una partida superada vale dos estrellas. */
export const UMBRAL_DOS_ESTRELLAS = 80

/**
 * Si la partida supera el nivel. Con enteros: `aciertos / total >= aprobado %`
 * escrito como multiplicación, para que 3 de 5 con un 60 % no dependa de cómo
 * redondee una división.
 */
export function supera(aciertos: number, total: number, aprobado: number): boolean {
  return aciertos * 100 >= aprobado * total
}

/**
 * Las estrellas de una partida: 3 si es perfecta, 2 si llega al 80 %, 1 si
 * solo supera el nivel y 0 si no lo supera.
 */
export function estrellas(aciertos: number, total: number, aprobado: number): 0 | 1 | 2 | 3 {
  if (total <= 0 || !supera(aciertos, total, aprobado)) return 0
  if (aciertos >= total) return 3
  if (aciertos * 100 >= UMBRAL_DOS_ESTRELLAS * total) return 2
  return 1
}
