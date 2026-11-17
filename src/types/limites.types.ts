/**
 * Los topes de la aplicación, con nombre y en un solo sitio.
 *
 * Cada uno existe por una razón de seguridad o de integridad, no de producto:
 * los endpoints son públicos (regla dura 3), los invitados se crean sin
 * registrarse y cualquiera puede mandar a una Server Action el número que
 * quiera. Un tope que no está escrito es un tope que no existe.
 *
 * Viven en `src/types` porque los leen a la vez el servidor (que los impone) y
 * la interfaz (que los respeta por cortesía).
 */

/**
 * El importe más grande que se acepta, en céntimos: diez millones de euros.
 *
 * La columna es `integer` (int4, hasta 2.147.483.647). Sin este tope, un
 * importe mayor llega hasta Postgres y vuelve como un error genérico; con él,
 * es un error del campo que la persona puede corregir. Y deja margen: la suma
 * de 4.000 movimientos al máximo sigue siendo exacta en un `Number` (< 2^53).
 */
export const IMPORTE_MAXIMO = 1_000_000_000

/**
 * Cuántos movimientos puede tener un usuario.
 *
 * Es una cuota contra el abuso, no un límite de uso: un invitado nace sin
 * registrarse y vive 4 días, así que sin cuota cualquiera podría llenar la base
 * del plan gratuito con un bucle. Nadie anota 200 movimientos a mano en 4 días,
 * y una persona que anota 30 al mes tarda once años en llegar al de cuenta.
 */
export const MAX_MOVIMIENTOS_INVITADO = 200
export const MAX_MOVIMIENTOS_CUENTA = 4_000

/**
 * Bytes de texto (descripción + notas, en UTF-8) que puede guardar un usuario.
 *
 * La cuota de movimientos sola no basta: un movimiento con descripción y notas
 * al máximo ocupa cien veces uno normal. Con uso normal (unos 30 caracteres de
 * descripción) estos topes no se notan: antes llega la de movimientos. Cuenta
 * BYTES y no caracteres porque es lo que ocupa en disco, y un emoji son 4.
 */
export const MAX_TEXTO_INVITADO = 100 * 1024
export const MAX_TEXTO_CUENTA = 5 * 1024 * 1024

/**
 * El freno general: con la base por encima de esto no se crean invitados,
 * movimientos ni categorías (`capacidad.repository.ts`). El plan gratuito de
 * Supabase tiene 500 MB; el margen es para lo que ya esté a medio escribir y
 * para lo que ocupa Supabase por su cuenta.
 */
export const MAX_TAMANO_BASE = 400 * 1024 * 1024

/** Cuántas categorías puede tener un usuario. El catálogo de fábrica trae 17. */
export const MAX_CATEGORIAS = 200

/** Filas por página cuando quien pide no dice cuántas. */
export const TAMANO_PAGINA_POR_DEFECTO = 20

/** Filas por página como mucho. Un `pageSize` de mil millones es una petición de DoS. */
export const TAMANO_PAGINA_MAXIMO = 100

/**
 * Página más alta que se acepta. Con la cuota de movimientos de una cuenta y
 * páginas de una fila, ninguna página más allá puede tener datos: pedirla solo
 * sirve para hacer a Postgres saltarse un `OFFSET` enorme (OWASP API4).
 */
export const PAGINA_MAXIMA = MAX_MOVIMIENTOS_CUENTA

/**
 * Filas como mucho en un listado SIN paginar (`paginate: false`).
 *
 * Lo usan las tablas en modo cliente (Categorías, Planificación), que traen el
 * conjunto entero y lo exportan a Excel desde memoria. Tiene que quedar muy por
 * encima de `MAX_CATEGORIAS` para que ninguna se corte; Movimientos, que es la
 * que crece, pagina siempre en el servidor y exporta solo lo que ve.
 */
export const FILAS_SIN_PAGINAR_MAXIMO = 5_000

/** Longitud máxima del texto del buscador. Un `ilike` sobre un megabyte es trabajo gratis. */
export const BUSQUEDA_MAX = 100

/** Longitud máxima de un id que llega del cliente. Los nuestros son UUID (36). */
export const ID_MAX = 64

/**
 * El tramo más largo que se puede pedir a la serie de saldo: unos dos años.
 *
 * La serie tiene un punto por día. Sin tope, pedir del año 1 al 9999 genera
 * 3,6 millones de objetos en el servidor por cada petición.
 */
export const SERIE_SALDO_MAX_DIAS = 731

/** Meses como mucho en "ingresos frente a gastos". Cinco años. */
export const INFORME_MESES_MAX = 60
