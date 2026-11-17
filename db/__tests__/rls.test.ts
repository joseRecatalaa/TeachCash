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

/**
 * La segunda red, por debajo de las políticas (auditoría run-2). Hoy no se
 * escribe por la API porque no hay política de escritura; si alguien añadiera
 * una por error, RLS la dejaría pasar. Sin el permiso de tabla, ni así.
 */
describe('permisos de tabla de los roles de la API', () => {
  test('anon y authenticated no pueden escribir en ninguna tabla de la app', async () => {
    const { rows } = await ctx.pg.query<{ tabla: string; rol: string; permiso: string }>(
      `select c.relname as tabla, r.rol, p.permiso
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
         cross join (values ('anon'), ('authenticated')) as r(rol)
         cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) as p(permiso)
        where n.nspname = 'public' and c.relkind = 'r'
          and has_table_privilege(r.rol, c.oid, p.permiso)
        order by 1, 2, 3`,
    )
    expect(rows).toEqual([])
  })

  test('y una tabla que se cree después tampoco nace con permisos de escritura', async () => {
    await ctx.pg.exec('create table public.tabla_futura (id int)')
    const { rows } = await ctx.pg.query<{ puede: boolean }>(
      `select has_table_privilege('authenticated', 'public.tabla_futura', 'INSERT') as puede`,
    )
    expect(rows[0].puede).toBe(false)
  })

  test('siguen pudiendo leer: la API REST lee lo suyo a través de RLS', async () => {
    const { rows } = await ctx.pg.query<{ puede: boolean }>(
      `select has_table_privilege('authenticated', 'public.transactions', 'SELECT') as puede`,
    )
    expect(rows[0].puede).toBe(true)
  })
})
