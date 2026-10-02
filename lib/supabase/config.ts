/**
 * Dónde está Supabase y con qué clave se le habla.
 *
 * La clave es la PUBLISHABLE, que es pública por diseño: viaja al navegador y
 * cualquiera puede leerla. Lo que impide que sirva para leer datos ajenos es RLS
 * (ver `db/schema.ts`), no que la clave sea secreta. La Secret key / service_role
 * no aparece en ningún sitio de esta aplicación, y así tiene que seguir.
 *
 * `process.env.NEXT_PUBLIC_…` se escribe entero y literal a propósito: Next solo
 * sustituye en build los accesos que puede ver tal cual.
 */

const obligatoria = (nombre: string, valor: string | undefined): string => {
  if (!valor) throw new Error(`Falta ${nombre}. Copia .env.example a .env.local y rellénalo.`)
  return valor
}

export const supabaseUrl = (): string =>
  obligatoria('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)

/**
 * Cómo se guardan las cookies de la sesión.
 *
 * `httpOnly` NO es el valor por defecto de `@supabase/ssr`: lo deja apagado
 * para que su cliente de navegador pueda leer la sesión. Aquí no hay cliente
 * de navegador —todo pasa por el servidor—, así que se enciende: un script
 * inyectado en la página no puede leer ni robar el token.
 *
 * `secure` solo en producción: en desarrollo la app va por http://localhost, y
 * una cookie `secure` sobre http el navegador la tira.
 */
export const opcionesCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export const supabasePublishableKey = (): string =>
  obligatoria(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
