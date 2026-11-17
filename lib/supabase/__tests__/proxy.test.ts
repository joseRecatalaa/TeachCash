/**
 * El refresco de sesión del proxy, con su límite por IP.
 *
 * Cada petición con cookie de sesión puede acabar en una llamada a Supabase
 * (refrescar el token). Sin límite, una sola máquina mandando cookies
 * inventadas convertía cada petición en una llamada, y Supabase las ve todas
 * desde la IP del servidor: el cupo de refrescos se agotaba para todo el mundo.
 *
 * Supabase se sustituye: lo que se prueba es CUÁNDO se le llama.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({ getClaims: vi.fn(async () => ({ data: null, error: null })) }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getClaims: h.getClaims } }),
}))
vi.mock('../config', () => ({
  opcionesCookie: {},
  supabaseUrl: () => 'https://x.supabase.co',
  supabasePublishableKey: () => 'clave',
}))

import { LIMITE_REFRESCO_IP } from '@/lib/limite'
import { refrescarSesion } from '../proxy'

const COOKIE = 'sb-x-auth-token=base64-inventada'

function peticion(cabeceras: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost:3000/', { headers: cabeceras })
}

beforeEach(() => h.getClaims.mockClear())

describe('refrescarSesion', () => {
  test('con cookie de sesión, refresca', async () => {
    await refrescarSesion(peticion({ cookie: COOKIE, 'x-real-ip': 'ip-a' }))
    expect(h.getClaims).toHaveBeenCalledTimes(1)
  })

  test('sin cookie de sesión no hay nada que refrescar ni que contar', async () => {
    for (let i = 0; i <= LIMITE_REFRESCO_IP.maximo; i++) {
      await refrescarSesion(peticion({ 'x-real-ip': 'ip-a' }))
    }
    await refrescarSesion(peticion({ cookie: COOKIE, 'x-real-ip': 'ip-a' }))
    // Las peticiones sin cookie no llaman a Supabase ni gastan el cupo de la IP.
    expect(h.getClaims).toHaveBeenCalledTimes(1)
  })

  test('pasado el límite por IP deja de llamar a Supabase, pero no bloquea la página', async () => {
    const ip = { cookie: COOKIE, 'x-real-ip': 'ip-b' }
    for (let i = 0; i < LIMITE_REFRESCO_IP.maximo; i++) await refrescarSesion(peticion(ip))
    h.getClaims.mockClear()

    const respuesta = await refrescarSesion(peticion(ip))

    expect(h.getClaims).not.toHaveBeenCalled()
    expect(respuesta.status).toBe(200)
  })

  test('el límite de una IP no frena a otra', async () => {
    const ip = { cookie: COOKIE, 'x-real-ip': 'ip-c' }
    for (let i = 0; i <= LIMITE_REFRESCO_IP.maximo; i++) await refrescarSesion(peticion(ip))
    h.getClaims.mockClear()
    await refrescarSesion(peticion({ cookie: COOKIE, 'x-real-ip': 'ip-d' }))
    expect(h.getClaims).toHaveBeenCalledTimes(1)
  })
})
