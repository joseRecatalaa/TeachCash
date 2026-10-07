/**
 * Destino de los enlaces que manda Supabase por email: confirmar la cuenta,
 * confirmar el email de un invitado que se registra y recuperar la contraseña.
 *
 * Es el único route handler de la aplicación, y lo es porque tiene que serlo:
 * un enlace de email es un GET de HTTP, no puede llamar a una Server Action.
 *
 * Acepta las dos formas en que llega el enlace:
 *   - `?code=…`: la de las plantillas de email por defecto de Supabase (flujo
 *     PKCE). Solo funciona en el MISMO navegador donde se pidió el enlace,
 *     porque la otra mitad del secreto está en una cookie de ese navegador.
 *   - `?token_hash=…&type=…`: la de las plantillas propias, cuando haya SMTP
 *     propio. Funciona desde cualquier dispositivo.
 */

import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { rutaInterna } from '@/lib/rutas'
import { crearClienteSupabase } from '@/lib/supabase/server'
import { asegurarCatalogoInicial } from '@/src/infrastructure/repositories/categorias.repository'

const TIPOS: readonly EmailOtpType[] = ['email', 'signup', 'recovery', 'email_change', 'invite']

/** Convierte el enlace en sesión, por la vía que traiga. */
async function canjearEnlace(
  code: string | null,
  tokenHash: string | null,
  tipo: EmailOtpType | null,
) {
  const supabase = await crearClienteSupabase()
  if (code) return supabase.auth.exchangeCodeForSession(code)
  if (tokenHash && tipo && TIPOS.includes(tipo)) {
    return supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
  }
  return { data: { user: null }, error: new Error('Enlace incompleto') }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const destino = rutaInterna(url.searchParams.get('next'))
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const tipo = url.searchParams.get('type') as EmailOtpType | null

  const { data, error } = await canjearEnlace(code, tokenHash, tipo)

  if (error || !data.user) {
    // Caducado, ya usado o abierto en otro navegador. El motivo exacto no se
    // enseña: no le sirve a quien lo lee y sí a quien prueba enlaces.
    return NextResponse.redirect(new URL('/Login?enlace=invalido', request.url))
  }

  // Una cuenta recién confirmada sin pasar por invitado no tiene categorías.
  // Si venía de invitado ya las tiene, y esto no hace nada.
  await asegurarCatalogoInicial(data.user.id)

  // `rutaInterna` ya garantiza una ruta propia; construirla contra
  // `request.url` lo remacha: el resultado es siempre de este mismo origen.
  return NextResponse.redirect(new URL(destino, request.url))
}
