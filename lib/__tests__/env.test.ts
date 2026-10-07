/**
 * Las variables de entorno se validan al arrancar.
 *
 * Una variable que falta o está mal escrita no debe descubrirse en la primera
 * petición de un usuario, con un error genérico: debe parar el arranque con un
 * mensaje que diga cuál es y qué hacer.
 */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { entornoPublico, entornoServidor, validarEntorno } from '../env'

const PUBLICO = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcd.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxx',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAA',
}
const SERVIDOR = {
  DATABASE_URL: 'postgresql://postgres.abcd:clave@aws-0-eu-west-3.pooler.supabase.com:6543/postgres',
}

const poner = (vars: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('entorno público', () => {
  test('con todo bien, lo devuelve tipado', () => {
    poner(PUBLICO)
    expect(entornoPublico()).toEqual(PUBLICO)
  })

  test.each(Object.keys(PUBLICO))('sin %s falla diciendo cuál falta', (nombre) => {
    poner({ ...PUBLICO, [nombre]: undefined })
    expect(() => entornoPublico()).toThrow(nombre)
  })

  test('una URL de Supabase que no es URL falla con un mensaje claro', () => {
    poner({ ...PUBLICO, NEXT_PUBLIC_SUPABASE_URL: 'abcd.supabase.co' })
    expect(() => entornoPublico()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  test('el mensaje dice qué hacer', () => {
    poner({ ...PUBLICO, NEXT_PUBLIC_TURNSTILE_SITE_KEY: '' })
    expect(() => entornoPublico()).toThrow(/\.env\.example/)
  })
})

describe('entorno de servidor', () => {
  test('con todo bien, lo devuelve', () => {
    poner(SERVIDOR)
    expect(entornoServidor().DATABASE_URL).toBe(SERVIDOR.DATABASE_URL)
  })

  test('una DATABASE_URL que no es de Postgres falla', () => {
    poner({ DATABASE_URL: 'https://abcd.supabase.co' })
    expect(() => entornoServidor()).toThrow(/DATABASE_URL/)
  })

  test('sin DATABASE_URL falla', () => {
    poner({ DATABASE_URL: undefined })
    expect(() => entornoServidor()).toThrow(/DATABASE_URL/)
  })

  test('nunca expone una clave secreta de Supabase aunque esté en el entorno', () => {
    poner({ ...SERVIDOR, SUPABASE_SERVICE_ROLE_KEY: 'secreta' })
    expect(JSON.stringify(entornoServidor())).not.toContain('secreta')
  })
})

describe('validarEntorno (lo que corre al arrancar)', () => {
  test('junta todos los fallos en un solo mensaje', () => {
    poner({ ...PUBLICO, ...SERVIDOR, NEXT_PUBLIC_SUPABASE_URL: undefined, DATABASE_URL: undefined })
    expect(() => validarEntorno()).toThrow(/NEXT_PUBLIC_SUPABASE_URL[\s\S]*DATABASE_URL|DATABASE_URL[\s\S]*NEXT_PUBLIC_SUPABASE_URL/)
  })

  test('con todo bien, no lanza', () => {
    poner({ ...PUBLICO, ...SERVIDOR })
    expect(() => validarEntorno()).not.toThrow()
  })
})
