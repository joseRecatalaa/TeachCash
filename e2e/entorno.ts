/**
 * El entorno de los E2E: `.env.e2e`, y nada más.
 *
 * Los E2E crean usuarios y datos de verdad en Supabase. Si por error corrieran
 * contra el proyecto de desarrollo, llenarían esa base de invitados de prueba;
 * por eso este módulo se niega a arrancar en tres casos que fallarían en
 * silencio:
 *
 *  1. Falta `.env.e2e`, o le falta una variable. Next carga `.env.local` por su
 *     cuenta y rellenaría el hueco con la de desarrollo sin avisar: una sola
 *     línea olvidada y la app de prueba habla con la base de verdad.
 *  2. `.env.e2e` apunta al MISMO proyecto que `.env.local` (copiado y sin
 *     cambiar).
 *  3. La site key de Turnstile no es una de las de prueba: con la real, el
 *     CAPTCHA de un navegador sin cabeza no siempre pasa y el invitado no nace.
 *
 * Los valores se copian en `process.env` PISANDO lo que hubiera: el servidor que
 * arranca Playwright los hereda, y Next no sobrescribe una variable que ya
 * existe con la de `.env.local`.
 */

import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

const FICHERO = '.env.e2e'

/** Las que necesita la app (ver `lib/env.ts`). La de migraciones no hace falta aquí. */
const OBLIGATORIAS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
] as const

/** Las site keys de prueba de Cloudflare que SIEMPRE pasan (visible e invisible). */
const SITE_KEY_DE_PRUEBA = /^1x0{20}(AA|BB)$/

const AYUDA = 'Copia .env.e2e.example a .env.e2e y rellénalo con el proyecto teachcash-e2e (docs en el propio fichero).'

const leer = (fichero: string): NodeJS.Dict<string> =>
  existsSync(fichero) ? parseEnv(readFileSync(fichero, 'utf8')) : {}

export function cargarEntornoE2e(): void {
  if (!existsSync(FICHERO)) throw new Error(`No existe ${FICHERO}. ${AYUDA}`)

  const e2e = leer(FICHERO)
  const faltan = OBLIGATORIAS.filter((k) => !e2e[k])
  if (faltan.length > 0) throw new Error(`Faltan en ${FICHERO}: ${faltan.join(', ')}. ${AYUDA}`)

  const desarrollo = leer('.env.local')
  const repetidas = (['DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'] as const).filter(
    (k) => desarrollo[k] && desarrollo[k] === e2e[k],
  )
  if (repetidas.length > 0) {
    throw new Error(
      `${FICHERO} apunta al proyecto de DESARROLLO (${repetidas.join(', ')} igual que en .env.local). Los E2E crean usuarios y datos: necesitan su propio proyecto.`,
    )
  }

  if (!SITE_KEY_DE_PRUEBA.test(e2e.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '')) {
    throw new Error(
      `NEXT_PUBLIC_TURNSTILE_SITE_KEY de ${FICHERO} tiene que ser una clave de PRUEBA de Turnstile (1x00000000000000000000BB).`,
    )
  }

  Object.assign(process.env, e2e)
}
