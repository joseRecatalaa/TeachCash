/**
 * Lo que ven los buscadores: la dirección canónica, el lema y qué rutas son
 * PÚBLICAS.
 *
 * La aplicación se usa sin registrarse, pero quien llega sin sesión no ve la
 * aplicación: ve "Preparando tu espacio…" mientras nace su invitado. Un
 * rastreador nunca tiene sesión, así que eso era lo ÚNICO que veía de cada
 * página. Las rutas públicas se pintan en el servidor, sin `Providers` y sin
 * crear invitado, con contenido de verdad que indexar.
 *
 * Las demás rutas siguen siendo `noindex` y van en el `Disallow` de
 * `app/robots.ts`: con sesión enseñan los datos de una persona, y sin ella,
 * nada.
 */

/**
 * La dirección canónica, con `www`: es a la que redirige Vercel (`teachcash.es`
 * → `www.teachcash.es` con un 308). Escrita aquí y no sacada de `APP_URL`: una
 * vista previa o un `APP_URL` sin `www` repartirían los enlaces entre dos
 * direcciones, y la canónica tiene que ser una.
 */
export const URL_SITIO = 'https://www.teachcash.es'

export const NOMBRE_SITIO = 'TeachCash'

/** El lema del proyecto. Es el tema de todo, no un eslogan de esta página. */
export const LEMA = 'Educación financiera al alcance de cualquiera'

/**
 * El título largo, para cuando se comparte un enlace (Open Graph, Twitter) y
 * para el manifiesto. NO es el de la pestaña de la portada, que es solo
 * `NOMBRE_SITIO` (`app/page.tsx`). Menos de 60 caracteres: Google corta a
 * partir de ahí.
 */
export const TITULO_SITIO = `${NOMBRE_SITIO}: ${LEMA.charAt(0).toLowerCase()}${LEMA.slice(1)}`

/** Entre 120 y 160 caracteres: es lo que sale bajo el título en Google. */
export const DESCRIPCION_SITIO = `${LEMA}: construye una relación sana con la economía mediante un videojuego a píxel gratuito.`

/**
 * La cabecera con la que `proxy.ts` le dice al layout qué ruta se pide. El
 * layout no tiene otra forma de saberlo, y lo necesita para decidir si monta la
 * aplicación o la página pública. El proxy la pone en TODA petición que pasa
 * por él, así que pisa la que mande el cliente.
 */
export const CABECERA_RUTA = 'x-tc-ruta'

/** Donde viven los cursos públicos. En minúsculas: es una URL que se enlaza. */
export const RUTA_CURSOS = '/aprende'

export const rutaCurso = (mundo: string) => `${RUTA_CURSOS}/${mundo}`

/**
 * La presentación del proyecto (el TFM): pantallas de 1920x1080 hechas con los
 * mismos sprites que el juego. Pública para que se pueda enlazar sin sesión,
 * pero `noindex`: no es una página para buscar, es una charla.
 */
export const RUTA_PRESENTACION = '/presentacion'

/**
 * Si una ruta se pinta como página pública.
 *
 * La portada (`/`) solo lo es SIN sesión: con ella, `/` es el Cuadro de mando.
 * Los cursos lo son siempre, porque su dirección es la misma para todos, y la
 * presentación también: el tribunal la abre sin cuenta.
 */
export function esPaginaPublica(ruta: string, conSesion: boolean): boolean {
  if (ruta === '/') return !conSesion
  if (ruta === RUTA_PRESENTACION) return true
  return ruta === RUTA_CURSOS || ruta.startsWith(`${RUTA_CURSOS}/`)
}
