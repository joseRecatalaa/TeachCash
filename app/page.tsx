/**
 * `/`: dos páginas en una dirección, según quién mire.
 *
 *   - **Con sesión** (invitado o cuenta): el Cuadro de mando, como siempre.
 *   - **Sin sesión**: la portada pública. Es lo que ve quien llega por primera
 *     vez, y lo que lee Google, que nunca tiene sesión. Antes veía solo
 *     "Preparando tu espacio…" mientras nacía el invitado.
 *
 * El layout toma la MISMA decisión (`esPaginaPublica`) para montar la
 * aplicación o el marco público, y las dos preguntan a `cuentaDeLaPeticion`,
 * que responde una vez por petición: no pueden llegar a respuestas distintas.
 */

import type { Metadata } from 'next'
import { TITULO_SITIO } from '@/lib/seo'
import { cuentaDeLaPeticion } from '@/src/application/cuentaDeLaPeticion'
import { catalogoPublico } from '@/src/infrastructure/heroe/catalogo'
import { DatosEstructurados } from '@/src/presentation/components/Publico/DatosEstructurados'
import { esquemaPortada } from '@/src/presentation/components/Publico/esquemas'
import { Portada } from '@/src/presentation/components/Publico/Portada'
import { PantallaCuadro } from './PantallaCuadro'

/** La única página de la aplicación que se indexa con su dirección raíz. */
export const metadata: Metadata = {
  title: { absolute: TITULO_SITIO },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
}

export default async function PaginaRaiz() {
  const cuenta = await cuentaDeLaPeticion()
  if (cuenta.tipo !== 'ninguna') return <PantallaCuadro />

  const mundos = await catalogoPublico()
  return (
    <>
      <DatosEstructurados datos={esquemaPortada(mundos)} />
      <Portada mundos={mundos} />
    </>
  )
}
