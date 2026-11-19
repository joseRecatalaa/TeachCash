/**
 * Las direcciones del Camino del héroe, en un solo sitio.
 *
 * Son rutas limpias, con el id en el camino y no en `?id=`:
 *
 *   - un mundo:  `/CaminoHeroe/ahorro`
 *   - un nivel:  `/CaminoHeroe/ahorro/01-fondo-de-emergencia`
 *
 * El id de un nivel ya es `<mundo>/<nivel>` (`contenido.ts`), así que su ruta
 * es la del mundo más el nivel. Cada trozo se codifica por separado: la barra
 * del id es un separador de ruta y no se codifica. Las páginas lo recomponen
 * desde los dos segmentos (`app/CaminoHeroe/[mundo]/[nivel]/page.tsx`).
 *
 * Sin `'use client'` a propósito: lo usan también las páginas públicas de los
 * cursos, que se pintan en el servidor.
 */

import type { Route } from 'next'

export const RUTA_CAMINO = '/CaminoHeroe'

export const rutaMundo = (mundo: string) => `${RUTA_CAMINO}/${encodeURIComponent(mundo)}` as Route

export const rutaNivel = (id: string) =>
  `${RUTA_CAMINO}/${id.split('/').map(encodeURIComponent).join('/')}` as Route

/**
 * Un segmento de la ruta, tal y como lo escribió `rutaMundo`/`rutaNivel`. Si ya
 * llega descodificado no cambia: los ids son minúsculas, cifras y guiones, sin
 * `%`.
 */
export function segmento(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor.join('/') : (valor ?? '')
  try {
    return decodeURIComponent(texto)
  } catch {
    return texto
  }
}
