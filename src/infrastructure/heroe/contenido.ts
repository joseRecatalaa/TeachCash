/**
 * El contenido del Camino del héroe: lee los JSON de `content/heroe/`, los
 * valida y los guarda en memoria.
 *
 * SOLO SERVIDOR (lee con `fs`). Es el ÚNICO fichero que sabe dónde y cómo se
 * guarda el contenido: si algún día pasa a un CMS o a tablas, se cambia este y
 * nada más.
 *
 * Estructura:
 *
 *   content/heroe/<mundo>/mundo.json     ← MundoSchema
 *   content/heroe/<mundo>/<nivel>.json   ← NivelSchema
 *
 * Además del Zod de cada fichero, se comprueba lo que un esquema suelto no
 * puede ver: que los ids coincidan con la ruta, que todo nivel listado exista
 * (y que no sobre ninguno) y que cada mundo acabe en su jefe. Un contenido mal
 * formado LANZA con un mensaje que dice qué fichero y qué falla: es un error
 * de quien lo escribió, no de quien juega, y tiene que pararse en la CI
 * (`contenido-heroe.test.ts`), no llegar a producción.
 */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { z } from 'zod'
import {
  MundoSchema,
  NivelSchema,
  type Mundo,
  type Nivel,
} from '@/src/types/heroe.types'

export interface Contenido {
  /** En el orden del mapa. */
  mundos: Mundo[]
  niveles: Map<string, Nivel>
}

/**
 * La carpeta del contenido, relativa a la raíz del proyecto (desde donde se
 * arranca `next`). `next.config.ts` la incluye en el build con
 * `outputFileTracingIncludes`: sin eso, un despliegue empaquetado no la lleva.
 */
export const RAIZ_CONTENIDO = path.join(process.cwd(), 'content', 'heroe')

const leerJson = async (fichero: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(fichero, 'utf8'))
  } catch (e) {
    throw new Error(`Contenido del héroe: ${fichero} no es un JSON válido (${(e as Error).message})`)
  }
}

function validar<T>(esquema: z.ZodType<T>, valor: unknown, fichero: string): T {
  const r = esquema.safeParse(valor)
  if (r.success) return r.data
  const detalle = r.error.issues
    .map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
    .join('; ')
  throw new Error(`Contenido del héroe: ${fichero} no cumple el formato. ${detalle}`)
}

/** Lee y valida un mundo y sus niveles. Lanza al primer problema. */
async function cargarMundo(raiz: string, carpeta: string, niveles: Map<string, Nivel>): Promise<Mundo> {
  const dir = path.join(raiz, carpeta)
  const ficheroMundo = path.join(dir, 'mundo.json')
  const mundo = validar(MundoSchema, await leerJson(ficheroMundo), ficheroMundo)
  if (mundo.id !== carpeta) {
    throw new Error(`Contenido del héroe: ${ficheroMundo} tiene id "${mundo.id}" y está en "${carpeta}"`)
  }

  const ficheros = (await readdir(dir))
    .filter((f) => f.endsWith('.json') && f !== 'mundo.json')
    .map((f) => f.slice(0, -'.json'.length))
  const sobran = ficheros.filter((f) => !mundo.niveles.includes(f))
  if (sobran.length) {
    throw new Error(`Contenido del héroe: ${carpeta} tiene niveles que mundo.json no lista: ${sobran.join(', ')}`)
  }

  for (const [i, slug] of mundo.niveles.entries()) {
    const fichero = path.join(dir, `${slug}.json`)
    if (!ficheros.includes(slug)) {
      throw new Error(`Contenido del héroe: falta ${fichero}, que lista ${ficheroMundo}`)
    }
    const nivel = validar(NivelSchema, await leerJson(fichero), fichero)
    if (nivel.id !== `${carpeta}/${slug}`) {
      throw new Error(`Contenido del héroe: ${fichero} tiene id "${nivel.id}" y debería ser "${carpeta}/${slug}"`)
    }
    const esUltimo = i === mundo.niveles.length - 1
    if (esUltimo !== (nivel.tipo === 'jefe')) {
      throw new Error(
        `Contenido del héroe: ${carpeta} tiene que acabar en UN jefe, y solo al final (${slug} es ${nivel.tipo})`,
      )
    }
    niveles.set(nivel.id, nivel)
  }
  return mundo
}

/** Lee y valida todo el contenido de `raiz`. Lanza al primer problema. */
export async function cargarContenido(raiz: string = RAIZ_CONTENIDO): Promise<Contenido> {
  const carpetas = (await readdir(raiz, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  const niveles = new Map<string, Nivel>()
  const mundos: Mundo[] = []
  for (const carpeta of carpetas) mundos.push(await cargarMundo(raiz, carpeta, niveles))

  mundos.sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id))
  return { mundos, niveles }
}

/**
 * Se carga una vez por proceso y se guarda la PROMESA, no el resultado: dos
 * peticiones a la vez en frío comparten la misma lectura. Si falla, se olvida,
 * para que la siguiente petición lo vuelva a intentar en vez de servir el
 * error para siempre.
 *
 * En desarrollo no se guarda: así un JSON recién editado se ve al recargar,
 * sin reiniciar `pnpm dev`.
 */
let enMemoria: Promise<Contenido> | null = null

export function contenido(): Promise<Contenido> {
  if (process.env.NODE_ENV === 'development') return cargarContenido()
  enMemoria ??= cargarContenido().catch((e: unknown) => {
    enMemoria = null
    throw e
  })
  return enMemoria
}
