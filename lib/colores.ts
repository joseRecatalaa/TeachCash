/**
 * La paleta categórica: los ocho colores con los que se distingue una categoría
 * de otra, en la tabla y en los gráficos.
 *
 * Aquí SOLO viven las claves y sus etiquetas. **Los valores están en
 * `app/globals.css`**, como tokens `--sd-cat-N`, y este fichero se limita a
 * construir la referencia `var(--sd-cat-N)`. Es lo que hace que el modo oscuro
 * sea un bloque de tokens y no una revisión de cada sitio donde se pinta un
 * color: un hexadecimal escrito aquí volvería a partir la paleta en dos.
 *
 * La clave (`cat-3`) es lo que se guarda en `categories.color`. Nunca el color:
 * si mañana se ajusta un tono, las categorías ya guardadas lo heredan solas.
 *
 * `lib/` no importa de `src/`: esto lo consumen por igual `src/config` (que no
 * puede llevar JSX), la presentación y los gráficos.
 */

export const CLAVES_COLOR = [
  'cat-1',
  'cat-2',
  'cat-3',
  'cat-4',
  'cat-5',
  'cat-6',
  'cat-7',
  'cat-8',
] as const

export type ClaveColor = (typeof CLAVES_COLOR)[number]

/**
 * Nombres para el selector. Son descripciones del tono, no de un significado:
 * el rojo de una categoría no quiere decir "gasto" —para eso están `--income` y
 * `--expense`, que son otra cosa— y ponerle nombre semántico invitaría a
 * confundirlos.
 */
export const NOMBRE_COLOR: Record<ClaveColor, string> = {
  'cat-1': 'Verde',
  'cat-2': 'Azul',
  'cat-3': 'Lila',
  'cat-4': 'Frambuesa',
  'cat-5': 'Ámbar',
  'cat-6': 'Teja',
  'cat-7': 'Turquesa',
  'cat-8': 'Oliva',
}

export const esClaveColor = (value: string): value is ClaveColor =>
  (CLAVES_COLOR as readonly string[]).includes(value)

/**
 * Color de una categoría, listo para `color:` en CSS o `fill` en un SVG de
 * Recharts (que acepta `var()` sin problema).
 *
 * Sin clave —o con una clave vieja que ya no existe— se reparte por POSICIÓN, no
 * se cae a un gris: dos categorías sin color asignado tienen que seguir
 * distinguiéndose en un gráfico. El índice lo pone quien llama, normalmente el
 * orden de la serie.
 */
export const colorDeCategoria = (clave: string | null | undefined, indice = 0): string => {
  const key = clave && esClaveColor(clave) ? clave : CLAVES_COLOR[indice % CLAVES_COLOR.length]
  return `var(--sd-${key})`
}

/** El mismo color, en su versión lavada. Para fondos de badge y chapas. */
export const washDeCategoria = (clave: string | null | undefined, indice = 0): string => {
  const key = clave && esClaveColor(clave) ? clave : CLAVES_COLOR[indice % CLAVES_COLOR.length]
  return `var(--sd-${key}-wash)`
}
