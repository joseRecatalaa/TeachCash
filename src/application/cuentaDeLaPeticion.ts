import 'server-only'
import { cache } from 'react'
import type { CuentaDto } from '@/src/types/cuenta.types'
import { getCuenta } from './actions/auth.actions'

/**
 * Quién pide ESTA página, una sola vez por petición.
 *
 * La necesitan dos sitios que tienen que llegar a la MISMA respuesta: el
 * layout, que decide si monta la aplicación o la página pública, y la portada
 * (`app/page.tsx`), que decide si pinta el Cuadro de mando o la presentación.
 * Si cada uno preguntara por su cuenta, entre las dos preguntas podría caducar
 * la sesión, y la portada saldría dentro de la aplicación o el Cuadro fuera.
 * `cache` de React la comparte durante el render de una petición.
 *
 * Un fallo cuenta como "sin sesión": es lo mismo que haría la aplicación, que
 * crearía un invitado.
 */
export const cuentaDeLaPeticion = cache(async (): Promise<CuentaDto> => {
  const cuenta = await getCuenta()
  return cuenta.ok ? cuenta.data : { tipo: 'ninguna' }
})
