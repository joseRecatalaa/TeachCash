/**
 * Las políticas de Row Level Security, sobre las migraciones REALES.
 *
 * La API REST de Supabase la puede llamar cualquiera con la clave pública y su
 * propia sesión (también un invitado). Por ahí no pasan las cuotas, los topes
 * de longitud, el cobro de estrellas ni la corrección de las partidas: todo eso
 * vive en los repositorios. Así que la regla es simple y se comprueba entera:
 * toda tabla de la app lleva RLS, cada usuario solo LEE lo suyo, y nadie
 * escribe por la API (OWASP API3/API4/API5; ver docs/SECURITY.md).
 *
 * Una tabla nueva que se olvide `.enableRLS()` o que vuelva a `for all` rompe
 * este test, que es justo cuando nadie está mirando.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createTestDb, type TestDb } from '@/db/testing'

let ctx: TestDb

beforeEach(async () => {
  ctx = await createTestDb()
})

afterEach(async () => {
  await ctx.close()
})

const tablas = async () =>
  (
    await ctx.pg.query<{ tabla: string; rls: boolean }>(
      `select c.relname as tabla, c.relrowsecurity as rls
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by 1`,
    )
  ).rows

const politicas = async () =>
  (
    await ctx.pg.query<{ tabla: string; cmd: string; roles: string }>(
      `select tablename as tabla, cmd, roles::text as roles from pg_policies where schemaname = 'public'`,
    )
  ).rows

describe('RLS', () => {
  test('toda tabla de la app tiene RLS activado', async () => {
    const lista = await tablas()
    expect(lista.length).toBeGreaterThan(0)
    expect(lista.filter((t) => !t.rls).map((t) => t.tabla)).toEqual([])
  })

  test('toda tabla tiene su política de lectura de lo suyo', async () => {
    const conLectura = new Set((await politicas()).filter((p) => p.cmd === 'SELECT').map((p) => p.tabla))
    expect((await tablas()).map((t) => t.tabla).filter((t) => !conLectura.has(t))).toEqual([])
  })

  test('ninguna política deja escribir por la API REST', async () => {
    expect((await politicas()).filter((p) => p.cmd !== 'SELECT')).toEqual([])
  })

  test('las políticas son para usuarios con sesión, nunca para anon', async () => {
    expect((await politicas()).filter((p) => !p.roles.includes('authenticated'))).toEqual([])
  })
})
