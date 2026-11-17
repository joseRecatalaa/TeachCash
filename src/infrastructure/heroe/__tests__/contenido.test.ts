/**
 * La carga del contenido: que un JSON mal escrito se pare aquí, con un mensaje
 * que diga qué fichero falla, y no llegue a quien juega.
 *
 * Cada test copia el contenido de prueba del repositorio a una carpeta
 * temporal y le rompe UNA cosa.
 */

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cargarContenido, contenido } from '../contenido'

const FIXTURES = fileURLToPath(
  new URL('../../repositories/__tests__/fixtures/heroe', import.meta.url),
)

let raiz: string

const mapaIds = (mundos: { id: string }[]) => mundos.map((m) => m.id)

beforeEach(async () => {
  raiz = await mkdtemp(path.join(tmpdir(), 'heroe-'))
  await cp(FIXTURES, raiz, { recursive: true })
})

afterEach(() => rm(raiz, { recursive: true, force: true }))

const fichero = (...partes: string[]) => path.join(raiz, ...partes)

async function editar(ruta: string, cambio: (json: Record<string, unknown>) => void) {
  const json = JSON.parse(await readFile(ruta, 'utf8')) as Record<string, unknown>
  cambio(json)
  await writeFile(ruta, JSON.stringify(json))
}

describe('un contenido bueno', () => {
  test('carga los mundos en su orden y todos sus niveles', async () => {
    const { mundos, niveles } = await cargarContenido(raiz)
    expect(mapaIds(mundos)).toEqual(['prueba', 'otro', 'vacio'])
    expect([...niveles.keys()].sort()).toEqual([
      'otro/01-jefe',
      'prueba/01-lectura',
      'prueba/02-interactivo',
      'prueba/03-jefe',
    ])
  })
})

describe('un contenido roto se para con un mensaje que dice dónde', () => {
  test('un JSON que no es JSON', async () => {
    await writeFile(fichero('prueba', '01-lectura.json'), '{ "id": ')
    await expect(cargarContenido(raiz)).rejects.toThrow(/01-lectura\.json no es un JSON válido/)
  })

  test('una clave con una errata (los objetos son estrictos)', async () => {
    await editar(fichero('prueba', '02-interactivo.json'), (j) => {
      const [primero] = j.ejercicios as Record<string, unknown>[]
      primero.explicaion = primero.explicacion
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/02-interactivo\.json no cumple el formato/)
  })

  test('una opción "correcta" que no existe', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      ;(j.minitest as Record<string, unknown>[])[0].correcta = 9
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/minitest\.0\.correcta/)
  })

  test('un interactivo con minitest', async () => {
    await editar(fichero('prueba', '02-interactivo.json'), (j) => {
      j.minitest = j.ejercicios
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/02-interactivo\.json/)
  })

  test('una lectura sin minitest', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      delete j.minitest
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/01-lectura\.json/)
  })

  test('una negrita sin cerrar, con el campo en el mensaje', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      ;(j.minitest as Record<string, unknown>[])[1].explicacion = 'Esto es **clave'
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/minitest\.1\.explicacion: Hay una negrita \(\*\*\) sin cerrar/)
  })

  test('una cursiva sin cerrar en una página', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      const [pagina] = j.paginas as { bloques: Record<string, unknown>[] }[]
      pagina.bloques[0].texto = 'Un _matiz sin cerrar'
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/paginas\.0\.bloques\.0\.texto: Hay una cursiva \(_\) sin cerrar/)
  })

  test('una negrita que cruza el hueco', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      ;(j.minitest as Record<string, unknown>[])[2].enunciado = '**Tres ___ cuatro**'
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/no puede cruzar el hueco/)
  })

  test('un emoticono en el título de una página', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      const [pagina] = j.paginas as Record<string, unknown>[]
      pagina.titulo = '🌧️ Lo inesperado'
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/paginas\.0\.titulo: Sin emoticonos en los títulos/)
  })

  test('un emoticono en el título del nivel', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      j.titulo = 'Leer 🚀'
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/titulo: Sin emoticonos en los títulos/)
  })

  test('un dato sin fuente', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      const [pagina] = j.paginas as { bloques: Record<string, unknown>[] }[]
      pagina.bloques.push({ tipo: 'dato', texto: 'Un dato llamativo.' })
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/paginas\.0\.bloques\.1\.fuente/)
  })

  test('una imagen con un sprite que no existe', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      const [pagina] = j.paginas as { bloques: Record<string, unknown>[] }[]
      pagina.bloques.push({ tipo: 'imagen', sprite: 'dragon' })
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/paginas\.0\.bloques\.1\.sprite/)
  })

  test('marcas bien cerradas, una imagen y un dato con fuente: pasan', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      const [pagina] = j.paginas as { bloques: Record<string, unknown>[] }[]
      pagina.bloques.push(
        { tipo: 'parrafo', texto: 'Es **muy _importante_** y 3 * 4 = 12.' },
        { tipo: 'imagen', sprite: 'cerdito', pie: 'Un cerdito' },
        { tipo: 'imagen', sprite: 'nube' },
        { tipo: 'dato', texto: 'Casi la **mitad**.', fuente: 'Banco de España' },
      )
    })
    await expect(cargarContenido(raiz)).resolves.toBeDefined()
  })

  test('un hueco sin hueco', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      ;(j.minitest as Record<string, unknown>[])[2].enunciado = 'Sin hueco'
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/UN hueco/)
  })

  test('dos preguntas con el mismo id', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      ;(j.minitest as Record<string, unknown>[])[1].id = 'p1'
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/ids repetidos/)
  })

  test('el id de un nivel que no coincide con su fichero', async () => {
    await editar(fichero('prueba', '01-lectura.json'), (j) => {
      j.id = 'prueba/01-otra-cosa'
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/debería ser "prueba\/01-lectura"/)
  })

  test('el id de un mundo que no coincide con su carpeta', async () => {
    await editar(fichero('prueba', 'mundo.json'), (j) => {
      j.id = 'otra'
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/está en "prueba"/)
  })

  test('un nivel listado que no existe', async () => {
    await editar(fichero('prueba', 'mundo.json'), (j) => {
      j.niveles = ['01-lectura', '02-interactivo', '02b-fantasma', '03-jefe']
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/falta .*02b-fantasma\.json/)
  })

  test('un fichero de nivel que el mundo no lista', async () => {
    await cp(fichero('prueba', '01-lectura.json'), fichero('prueba', '99-suelto.json'))
    await expect(cargarContenido(raiz)).rejects.toThrow(/no lista: 99-suelto/)
  })

  test('un mundo que no acaba en jefe', async () => {
    await editar(fichero('prueba', 'mundo.json'), (j) => {
      j.niveles = ['01-lectura', '03-jefe', '02-interactivo']
    })
    await expect(cargarContenido(raiz)).rejects.toThrow(/acabar en UN jefe/)
  })
})

describe('contenido()', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  /** Importa el módulo de nuevo con `process.cwd()` en `cwd`: la raíz se fija al importar. */
  async function moduloEn(cwd: string) {
    vi.resetModules()
    vi.spyOn(process, 'cwd').mockReturnValue(cwd)
    return import('../contenido')
  }

  test('fuera de desarrollo, una sola lectura para todas las peticiones', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const proyecto = await mkdtemp(path.join(tmpdir(), 'proyecto-'))
    await cp(FIXTURES, path.join(proyecto, 'content', 'heroe'), { recursive: true })
    const { contenido: enFrio } = await moduloEn(proyecto)

    const [una, otra] = await Promise.all([enFrio(), enFrio()])
    expect(una).toBe(otra)
    expect(await enFrio()).toBe(una)
    await rm(proyecto, { recursive: true, force: true })
  })

  test('si la carga falla, la siguiente petición lo vuelve a intentar', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { contenido: enFrio } = await moduloEn(raiz) // sin content/heroe dentro
    const primera = await enFrio().catch((e: unknown) => e)
    const segunda = await enFrio().catch((e: unknown) => e)
    expect(primera).toBeInstanceOf(Error)
    expect(segunda).not.toBe(primera)
  })

  test('en desarrollo, lee cada vez', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const una = contenido().catch((e: unknown) => e)
    const otra = contenido().catch((e: unknown) => e)
    expect(una).not.toBe(otra)
    await Promise.all([una, otra])
  })
})
