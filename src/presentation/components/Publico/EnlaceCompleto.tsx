/*
 * Un enlace que carga la página ENTERA: un `<a>` de los de siempre, a
 * propósito, en vez del `<Link>` de Next.
 *
 * El layout decide al cargar si monta la aplicación o el marco público
 * (`esPaginaPublica`), y una navegación de `<Link>` no vuelve a pasar por él.
 * Todo enlace que cruza esa frontera (de una página pública a la aplicación,
 * o a `/`, que es una cosa u otra según la sesión) tiene que recargar, o la
 * página nueva se pinta en el marco que no es: la aplicación sin sesión ni
 * proveedores, o la portada dentro de la aplicación.
 *
 * Usarlo, y no un `<a>` suelto, deja dicho en cada sitio que la recarga es a
 * propósito (la regla de ESLint que pide `<Link>` salta con un `href="/"`
 * literal).
 */

import type { ComponentPropsWithoutRef } from 'react'

export function EnlaceCompleto(props: ComponentPropsWithoutRef<'a'> & { href: string }) {
  return <a {...props} />
}
