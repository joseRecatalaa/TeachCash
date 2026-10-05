/**
 * Proxy de Next 16 (antes `middleware.ts`).
 *
 * Dos trabajos, y ninguno decide quién entra:
 *
 *   - Pone la Content Security Policy con un nonce nuevo (`lib/csp.ts`).
 *   - Mantiene viva la sesión: ver `lib/supabase/proxy.ts`.
 *
 * No hay rutas protegidas aquí porque la aplicación se usa sin cuenta. Quien no
 * tiene sesión recibe una de invitado desde el cliente, no desde aquí: crearla
 * en el proxy daría de alta un usuario por cada bot que pidiera una página.
 */

import type { NextRequest } from 'next/server'
import { CABECERA_NONCE, construirCsp, generarNonce } from '@/lib/csp'
import { refrescarSesion } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const nonce = generarNonce()
  const csp = construirCsp(nonce, {
    desarrollo: process.env.NODE_ENV === 'development',
    https: request.nextUrl.protocol === 'https:',
  })

  // En la PETICIÓN antes de refrescar la sesión: `refrescarSesion` construye la
  // respuesta con `NextResponse.next({ request })`, que copia estas cabeceras
  // para el render. Next saca el nonce de ahí para sus propios scripts.
  request.headers.set(CABECERA_NONCE, nonce)
  request.headers.set('Content-Security-Policy', csp)

  const respuesta = await refrescarSesion(request)
  respuesta.headers.set('Content-Security-Policy', csp)
  return respuesta
}

export const config = {
  matcher: [
    // Todo menos los estáticos: sin esto, cada imagen y cada chunk de JS
    // pagaría una vuelta a Supabase.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
