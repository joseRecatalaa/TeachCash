/**
 * Destino de los enlaces que manda Supabase por email: confirmar la cuenta,
 * confirmar el email de un invitado que se registra y recuperar la contraseña.
 *
 * Es el único route handler de la aplicación, y lo es porque tiene que serlo:
 * un enlace de email es un GET de HTTP, no puede llamar a una Server Action.
 *
 * Acepta SOLO `?code=…`, la forma de las plantillas por defecto de Supabase
 * (flujo PKCE): funciona únicamente en el MISMO navegador donde se pidió el
 * enlace, porque la otra mitad del secreto está en una cookie de ese navegador.
 *
 * `?token_hash=…&type=…` (el de las plantillas propias) se aceptaba y se
 * QUITÓ en la auditoría de seguridad: no está ligado a ningún navegador, así
 * que un atacante podía mandar a la víctima un enlace con el token de SU cuenta
 * y dejarla dentro de ella sin aviso (login CSRF), anotando allí sus finanzas.
 * Volverá con el SMTP propio y una página intermedia que diga con qué cuenta se
 * va a entrar y pida confirmarlo (ver "Decisiones abiertas" en AGENTS.md).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { registrarEvento } from '@/lib/log'
import { rutaInterna } from '@/lib/rutas'
import { crearClienteSupabase } from '@/lib/supabase/server'
import { asegurarCatalogoInicial } from '@/src/infrastructure/repositories/categorias.repository'

/** Convierte el enlace en sesión. Sin `code` no hay nada que canjear. */
async function canjearEnlace(code: string | null) {
  if (!code) return { data: { user: null }, error: new Error('Enlace incompleto') }
  const supabase = await crearClienteSupabase()
  return supabase.auth.exchangeCodeForSession(code)
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const destino = rutaInterna(url.searchParams.get('next'))
  const { data, error } = await canjearEnlace(url.searchParams.get('code'))

  if (error || !data.user) {
    // Caducado, ya usado o abierto en otro navegador. El motivo exacto no se
    // enseña: no le sirve a quien lo lee y sí a quien prueba enlaces. Sí queda
    // en el log: muchos seguidos son alguien probando enlaces.
    registrarEvento('enlace_email', 'fallo')
    return sinCache(NextResponse.redirect(new URL('/Login?enlace=invalido', request.url)))
  }

  // Una cuenta recién confirmada sin pasar por invitado no tiene categorías.
  // Si venía de invitado ya las tiene, y esto no hace nada.
  await asegurarCatalogoInicial(data.user.id)
  registrarEvento('enlace_email', 'ok', { userId: data.user.id })

  // `rutaInterna` ya garantiza una ruta propia; construirla contra
  // `request.url` lo remacha: el resultado es siempre de este mismo origen.
  return sinCache(NextResponse.redirect(new URL(destino, request.url)))
}

/**
 * La respuesta lleva las cookies de una sesión recién abierta: una caché
 * intermedia (CDN, proxy de empresa) que la guardara se la serviría a la
 * siguiente persona que abriera el mismo enlace.
 */
function sinCache(respuesta: NextResponse): NextResponse {
  respuesta.headers.set('Cache-Control', 'no-store')
  return respuesta
}
