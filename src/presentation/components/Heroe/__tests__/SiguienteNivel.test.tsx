/**
 * Pasar de un nivel al siguiente con "Siguiente nivel", sin recargar.
 *
 * Es la misma página (`/CaminoHeroe/Nivel`) con otro `?id=`. El bug: la
 * lectura siguiente se abría directamente en su minitest, y al terminarlo el
 * servidor rechazaba las respuestas. Es lo que pasa si el reproductor nace con
 * el nivel ANTERIOR (su fase de preguntas y una respuesta por cada ejercicio
 * suyo) y después le llega el nuevo sin volver a montarse.
 */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { startTransition } from 'react'
import { ocultar } from '@/lib/ocultar'
import { nuevoQueryClient, renderConMantine } from '@/test/render'
import type { Nivel, NivelDto, ResultadoNivelDto } from '@/src/types/heroe.types'
import NivelHeroePage from '@/app/CaminoHeroe/Nivel/page'

const acciones = vi.hoisted(() => ({
  fetchMapa: vi.fn(),
  fetchMundo: vi.fn(),
  fetchNivel: vi.fn(),
  enviarNivel: vi.fn(),
  fetchTienda: vi.fn(),
}))
vi.mock('@/src/application/actions/heroe.actions', () => acciones)

const url = vi.hoisted(() => ({ params: new URLSearchParams() }))
vi.mock('next/navigation', () => ({
  useSearchParams: () => url.params,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/CaminoHeroe/Nivel',
}))

/**
 * Lo que devuelve `useNivelHeroe` mientras el nivel nuevo aún no ha llegado.
 * `null`, el hook tal cual; si no, los datos que se le fuerzan (los del nivel
 * anterior), que es la condición en la que aparecía el bug.
 */
const mientrasCarga = vi.hoisted(() => ({ datos: null as unknown }))
vi.mock('@/src/application/hooks/useHeroe', async (original) => {
  const real = await original<typeof import('@/src/application/hooks/useHeroe')>()
  return {
    ...real,
    useNivelHeroe: (id: string | null) => {
      const r = real.useNivelHeroe(id)
      return r.data || !mientrasCarga.datos ? r : { ...r, data: mientrasCarga.datos }
    },
  }
})

afterEach(() => {
  mientrasCarga.datos = null
})

const E = 'Porque sí.'

const INTERACTIVO: Nivel = {
  id: 'ahorro/02',
  tipo: 'interactivo',
  titulo: 'Practica',
  descripcion: 'Ejercicios.',
  minutos: 3,
  ejercicios: [
    { id: 'e1', tipo: 'verdaderoFalso', enunciado: '¿Practica uno?', correcta: true, explicacion: E },
    { id: 'e2', tipo: 'verdaderoFalso', enunciado: '¿Practica dos?', correcta: true, explicacion: E },
    { id: 'e3', tipo: 'verdaderoFalso', enunciado: '¿Practica tres?', correcta: true, explicacion: E },
  ],
}

const LECTURA: Nivel = {
  id: 'ahorro/03',
  tipo: 'lectura',
  titulo: 'Leer',
  descripcion: 'Una lectura.',
  minutos: 2,
  paginas: [{ titulo: 'La primera página', bloques: [{ tipo: 'parrafo', texto: 'Hola.' }] }],
  minitest: [
    { id: 'm1', tipo: 'verdaderoFalso', enunciado: '¿Minitest uno?', correcta: true, explicacion: E },
    { id: 'm2', tipo: 'verdaderoFalso', enunciado: '¿Minitest dos?', correcta: true, explicacion: E },
  ],
}

const NIVELES: Record<string, Nivel> = { [INTERACTIVO.id]: INTERACTIVO, [LECTURA.id]: LECTURA }
const MUNDO = { id: 'ahorro', titulo: 'Ahorro', decorado: 'hucha' } as const

/** El nivel como lo manda el servidor: oculto, con su clave al lado. */
const oculto = (id: string) => {
  const clave = 'k'.repeat(32)
  return { ok: true, data: { nivel: ocultar(NIVELES[id], clave), clave, mundo: MUNDO, estrellas: 0 } }
}

const RESULTADO: ResultadoNivelDto = {
  aciertos: 3,
  total: 3,
  estrellas: 3,
  mejorEstrellas: 3,
  superado: true,
  correccion: [true, true, true],
  siguiente: LECTURA.id,
}

/** Juega el interactivo entero, todo bien, hasta el resultado. */
async function jugarInteractivo() {
  acciones.enviarNivel.mockResolvedValue({ ok: true, data: RESULTADO })
  url.params = new URLSearchParams(`id=${INTERACTIVO.id}`)
  const pantalla = renderConMantine(<NivelHeroePage />, { queryClient: nuevoQueryClient() })
  for (let i = 0; i < 3; i++) {
    await pantalla.usuario.click(await screen.findByRole('radio', { name: 'Verdadero' }))
    await pantalla.usuario.click(screen.getByRole('button', { name: 'Comprobar' }))
    await pantalla.usuario.click(screen.getByRole('button', { name: i === 2 ? 'Terminar' : 'Siguiente' }))
  }
  expect(await screen.findByRole('link', { name: /Siguiente nivel/ })).toHaveAttribute(
    'href',
    `/CaminoHeroe/Nivel?id=${encodeURIComponent(LECTURA.id)}`,
  )
  return pantalla
}

/** Lo que hace el `<Link>` de "Siguiente nivel": la misma página con otro `?id=`, en una transición. */
async function irA(id: string, rerender: (ui: React.ReactElement) => void) {
  await act(async () => {
    startTransition(() => {
      url.params = new URLSearchParams(`id=${id}`)
      rerender(<NivelHeroePage />)
    })
  })
}

describe('Siguiente nivel', () => {
  test('el nivel siguiente empieza por su lectura, no por el minitest', async () => {
    acciones.fetchNivel.mockImplementation(async (id: string) => oculto(id))
    const { rerender } = await jugarInteractivo()

    await irA(LECTURA.id, rerender)

    expect(await screen.findByRole('heading', { name: 'La primera página' })).toBeInTheDocument()
    expect(screen.queryByText('¿Minitest uno?')).not.toBeInTheDocument()
  })

  test('aunque un instante se vea aún el nivel anterior, el nuevo empieza de cero', async () => {
    // La lectura tarda en llegar, y mientras tanto el hook da el interactivo.
    let llegaLaLectura = () => {}
    acciones.fetchNivel.mockImplementation((id: string) =>
      id === LECTURA.id ? new Promise((r) => {
            llegaLaLectura = () => r(oculto(id))
          }) : Promise.resolve(oculto(id)),
    )
    const { rerender, usuario } = await jugarInteractivo()
    const anterior: NivelDto = { nivel: INTERACTIVO, mundo: MUNDO, estrellas: 3 }
    mientrasCarga.datos = anterior

    await irA(LECTURA.id, rerender)
    // Mientras tanto no se juega nada: ni el nivel de antes ni el nuevo a medias.
    expect(screen.queryByText('¿Practica uno?')).not.toBeInTheDocument()

    await act(async () => llegaLaLectura())

    expect(await screen.findByRole('heading', { name: 'La primera página' })).toBeInTheDocument()
    expect(screen.queryByText('¿Minitest uno?')).not.toBeInTheDocument()

    // Y el minitest, al final de la lectura, manda una respuesta por pregunta SUYA.
    acciones.enviarNivel.mockResolvedValue({ ok: true, data: { ...RESULTADO, total: 2, correccion: [true, true], siguiente: null } })
    await usuario.click(screen.getByRole('button', { name: /minitest/i }))
    for (let i = 0; i < 2; i++) {
      await usuario.click(screen.getByRole('radio', { name: 'Verdadero' }))
      await usuario.click(screen.getByRole('button', { name: i === 1 ? 'Terminar' : 'Siguiente' }))
    }
    expect(acciones.enviarNivel).toHaveBeenLastCalledWith(LECTURA.id, [true, true])
  })
})
