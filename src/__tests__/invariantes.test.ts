/**
 * Guardas estructurales.
 *
 * No prueban comportamiento: leen el CÓDIGO y comprueban reglas de AGENTS.md
 * que, rotas, no dan ningún error — fallan en silencio. Cada una existe porque
 * la regla vive en dos o más sitios que tienen que coincidir, o porque saltársela
 * compila y funciona... hasta que no.
 *
 * Si una de estas falla, NO se arregla el test: se arregla el código, o se añade
 * la excepción a su lista con el porqué al lado.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, test, vi } from 'vitest'

// REPOSITORIES arrastra `@/db`, que es solo de servidor; aquí no se consulta nada.
vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())

import { REPOSITORIES } from '@/src/infrastructure/repositories'
import { VIDA_INVITADO_DIAS } from '@/src/types/cuenta.types'

const RAIZ = join(__dirname, '..', '..')
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf-8')

/** Ficheros bajo `carpeta` que acaban en `sufijo`, con ruta relativa a la raíz. */
const ficheros = (carpeta: string, sufijo: string): string[] =>
  readdirSync(join(RAIZ, carpeta), { recursive: true, encoding: 'utf-8' })
    .filter((f) => f.endsWith(sufijo))
    .map((f) => relative(RAIZ, join(RAIZ, carpeta, f)).replaceAll('\\', '/'))

describe('un recurso son cuatro nombres que tienen que coincidir', () => {
  test('REFINE_RESOURCES declara exactamente los recursos de REPOSITORIES', () => {
    // `providers.tsx` es un componente cliente con JSX: se lee como texto en
    // lugar de importarlo. Si los nombres divergen, el DataProvider lanza
    // "Recurso desconocido" en la primera consulta.
    const providers = leer('src/application/providers/providers.tsx')
    const bloque = providers.slice(providers.indexOf('export const REFINE_RESOURCES'))
    const declarados = [...bloque.slice(0, bloque.indexOf('\n]')).matchAll(/name: '([^']+)'/g)].map(
      (m) => m[1],
    )

    expect(declarados.sort()).toEqual(Object.keys(REPOSITORIES).sort())
  })
})

describe('regla dura 1: el dinero es type "money"', () => {
  /**
   * Una columna `number` con 123456 pinta "123456" donde deberían verse
   * 1.234,56 €, y un campo `number` deja escribir decimales que el repositorio
   * rechaza. Lo que SÍ puede ser `number` es lo que no es dinero: un recuento.
   */
  const NO_SON_DINERO = new Set(['usos'])
  const PARECE_DINERO = /importe|presupuesto|saldo|amount|total|precio|gasto|ingreso/i

  test.each(ficheros('src/config', '.ts'))('%s', (ruta) => {
    const codigo = leer(ruta)
    // Cada objeto con `type: 'number'`: busca su `accessor` o su `name`.
    const numericos = [...codigo.matchAll(/\{[^{}]*type: 'number'[^{}]*\}/g)].map(
      (m) => /(?:accessor|name): '([^']+)'/.exec(m[0])?.[1] ?? '(sin nombre)',
    )

    for (const campo of numericos) {
      if (NO_SON_DINERO.has(campo)) continue
      expect(campo, `«${campo}» parece un importe: usa type 'money'`).not.toMatch(PARECE_DINERO)
    }
  })

  test('src/config no lleva JSX (son .ts, nunca .tsx)', () => {
    expect(ficheros('src/config', '.tsx')).toEqual([])
  })
})

describe('campos con marcado propio', () => {
  test.each(ficheros('src/config', 'sections.ts'))(
    '%s: todo component o render declara su dependsOn',
    (ruta) => {
      // Sin `dependsOn`, el campo deja de repintarse cuando cambia lo que lee,
      // y no aparece ningún error.
      const codigo = leer(ruta)
      const campos = [...codigo.matchAll(/\{[^{}]*\b(?:component|render):[^{}]*\}/g)]
      for (const [campo] of campos) expect(campo).toMatch(/dependsOn:/)
    },
  )
})

describe('dos sitios que tienen que decir lo mismo', () => {
  test('los días de vida del invitado: lo que se anuncia = lo que se borra', () => {
    // VIDA_INVITADO_DIAS es lo que ve el usuario en la franja; el `interval`
    // del job de pg_cron es lo que borra de verdad. Si divergen, la franja miente.
    const sql = leer('db/sql/limpieza-invitados.sql')
    const intervalo = /interval '(\d+) days'/.exec(sql)?.[1]
    expect(Number(intervalo)).toBe(VIDA_INVITADO_DIAS)
  })

  test('el cliente de base desactiva las sentencias preparadas', () => {
    // El Transaction pooler de Supabase reparte las consultas entre conexiones;
    // con `prepare` activo funciona en local y falla en producción a ratos.
    expect(leer('db/client.ts')).toMatch(/^ *prepare: false,/m)
  })
})

describe('sistema de diseño: el color sale de un token', () => {
  /**
   * Un hexadecimal en un `*.module.css` es un color que el modo oscuro no
   * traduce, y en modo claro se ve bien, que es justo lo que lo esconde.
   *
   * Excepción: los colores de UNA ilustración, declarados como variables
   * locales con su explicación en el propio fichero.
   */
  const ILUSTRACIONES = new Set(['src/presentation/components/Splash/Splash.module.css'])

  const modulos = [...ficheros('src', '.module.css'), ...ficheros('app', '.module.css')]

  test.each(modulos)('%s', (ruta) => {
    const sinComentarios = leer(ruta).replace(/\/\*[\s\S]*?\*\//g, '')
    const conHex = sinComentarios
      .split('\n')
      .filter((linea) => /#[0-9a-f]{3,8}\b/i.test(linea))
      // En una ilustración, solo valen como definición de variable local.
      .filter((linea) => !(ILUSTRACIONES.has(ruta) && /^\s*--[\w-]+:\s*#[0-9a-f]{3,8};/i.test(linea)))

    expect(conHex).toEqual([])
  })
})
