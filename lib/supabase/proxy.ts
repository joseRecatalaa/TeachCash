/**
 * Refresco de la sesión en `proxy.ts`.
 *
 * El token de acceso dura una hora. Cuando caduca, alguien tiene que cambiarlo
 * por uno nuevo usando el refresh token y escribir las cookies nuevas en la
 * respuesta. Un Server Component no puede escribir cookies, así que ese alguien
 * es el proxy, que corre antes que cualquier página.
 *
 * NO decide nada: no redirige ni bloquea. La aplicación se usa sin cuenta (modo
 * invitado) y la autorización de verdad está en cada Server Action.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabasePublishableKey, supabaseUrl } from './config'

export async function refrescarSesion(request: NextRequest): Promise<NextResponse> {
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(aEscribir, cabeceras) {
        // Las cookies nuevas van a la PETICIÓN (para que la página que se pinta
        // ahora ya las vea) y a la RESPUESTA (para que el navegador las guarde).
        for (const { name, value } of aEscribir) request.cookies.set(name, value)
        respuesta = NextResponse.next({ request })
        for (const { name, value, options } of aEscribir) {
          respuesta.cookies.set(name, value, options)
        }
        // Una respuesta que lleva el token de alguien no puede quedarse en una
        // caché intermedia: se le serviría a la siguiente persona.
        for (const [clave, valor] of Object.entries(cabeceras)) {
          respuesta.headers.set(clave, valor)
        }
      },
    },
  })

  // getClaims, y no getSession: refresca si hace falta Y verifica la firma.
  // Nada entre la creación del cliente y esta llamada: es lo que recomienda
  // Supabase para no dejar sesiones a medio refrescar.
  await supabase.auth.getClaims()

  return respuesta
}
