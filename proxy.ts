/**
 * Proxy de Next 16 (antes `middleware.ts`).
 *
 * Solo mantiene viva la sesión: ver `lib/supabase/proxy.ts`. No hay rutas
 * protegidas aquí porque la aplicación se usa sin cuenta. Quien no tiene sesión
 * recibe una de invitado desde el cliente, no desde aquí: crearla en el proxy
 * daría de alta un usuario por cada bot que pidiera una página.
 */

import type { NextRequest } from 'next/server'
import { refrescarSesion } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return refrescarSesion(request)
}

export const config = {
  matcher: [
    // Todo menos los estáticos: sin esto, cada imagen y cada chunk de JS
    // pagaría una vuelta a Supabase.
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
