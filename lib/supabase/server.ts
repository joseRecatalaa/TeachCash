/**
 * Cliente de Supabase para el servidor: Server Actions, Server Components y
 * route handlers. Solo se usa para AUTH. Los datos no pasan por aquí: van por
 * Drizzle, en los repositorios (ver AGENTS.md, "Cómo viajan los datos").
 *
 * La sesión vive en cookies httpOnly que gestiona `@supabase/ssr`. El navegador
 * nunca ve el token desde JavaScript, así que un XSS no puede robarlo.
 *
 * Uno nuevo por petición, nunca compartido: lleva dentro las cookies de quien
 * pregunta.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { opcionesCookie, supabasePublishableKey, supabaseUrl } from './config'

export async function crearClienteSupabase() {
  const almacen = await cookies()

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookieOptions: opcionesCookie,
    cookies: {
      getAll: () => almacen.getAll(),
      setAll(aEscribir) {
        try {
          for (const { name, value, options } of aEscribir) almacen.set(name, value, options)
        } catch {
          // Un Server Component no puede escribir cookies. No pasa nada: el
          // token ya lo ha refrescado `proxy.ts` antes de llegar aquí, y las
          // Server Actions y los route handlers sí pueden escribirlas.
        }
      },
    },
  })
}
