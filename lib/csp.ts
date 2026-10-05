/**
 * Content Security Policy con nonce.
 *
 * Por qué importa aquí aunque la cookie de sesión sea `httpOnly`: un XSS no
 * puede leer el JWT, pero sí llamar a las Server Actions desde la propia página
 * con la cookie puesta, que es lo mismo que ser el usuario. La CSP es lo que
 * impide que ese script llegue a ejecutarse.
 *
 * El nonce se genera en `proxy.ts` en cada petición. Next lo lee de la cabecera
 * `Content-Security-Policy` de la PETICIÓN y lo pone solo en sus propios
 * scripts; los inline nuestros (`app/layout.tsx`) lo leen de `x-nonce`.
 */

export const CABECERA_NONCE = 'x-nonce'

/** Origen de Cloudflare Turnstile: el script (`lib/turnstile.ts`) y su iframe. */
const TURNSTILE = 'https://challenges.cloudflare.com'

/** 128 bits aleatorios en base64. Uno por petición, nunca reutilizado. */
export function generarNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

export interface OpcionesCsp {
  /** `next dev`: hace falta 'unsafe-eval'. */
  desarrollo: boolean
  /** La petición llegó por https. */
  https: boolean
}

export function construirCsp(nonce: string, { desarrollo, https }: OpcionesCsp): string {
  const directivas = [
    "default-src 'self'",
    // 'strict-dynamic': un script con nonce puede cargar otros (los chunks de
    // Next, el de Turnstile, que se inserta con appendChild) y la lista de
    // orígenes se ignora en los navegadores con CSP 3. El origen de Turnstile
    // se queda para los que no la entienden. 'unsafe-eval' solo en desarrollo:
    // React lo usa para reconstruir las pilas de error del servidor.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE}${desarrollo ? " 'unsafe-eval'" : ''}`,
    // Estilos SIN nonce y con 'unsafe-inline', a propósito: Mantine y Recharts
    // escriben atributos `style`, que un nonce no cubre, y la mera presencia de
    // un nonce hace que el navegador ignore 'unsafe-inline'. Inyectar CSS es
    // mucho menos grave que inyectar JS, y el JS es lo que cierra esta política.
    "style-src 'self' 'unsafe-inline'",
    // `data:` y `blob:`: iconos en línea y la descarga del Excel.
    "img-src 'self' data: blob:",
    // next/font sirve las tipografías desde el propio dominio.
    "font-src 'self'",
    // No hay cliente de Supabase en el navegador: todo va por Server Actions.
    "connect-src 'self'",
    `frame-src ${TURNSTILE}`,
    "object-src 'none'",
    "base-uri 'self'",
    // Las Server Actions son POST al propio origen.
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]
  // Solo si ya se entró por https: con `pnpm start` en http://localhost (o por
  // la IP de la LAN) forzaría https en recursos que no lo tienen.
  if (https) directivas.push('upgrade-insecure-requests')
  return directivas.join('; ')
}
