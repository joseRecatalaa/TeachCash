/**
 * El camino de un mundo y el mapa, como los usa una persona: los nodos se
 * pulsan (con ratón o con teclado) y abren su ficha; uno bloqueado dice qué
 * falta en vez de llevar a ninguna parte; cada mundo del mapa lleva a su
 * camino.
 */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderConMantine } from '@/test/render'
import type { MapaDto, MundoDto } from '@/src/types/heroe.types'
import { CaminoMundo } from '../CaminoMundo'
import { MapaMundos, partirNombre } from '../MapaMundos'

const navegar = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => navegar }))

// jsdom no implementa `scrollIntoView`, que el camino usa para enseñar al héroe.
Element.prototype.scrollIntoView ??= () => {}

afterEach(() => navegar.push.mockReset())

const MUNDO: MundoDto = {
  mundo: { id: 'ahorro', titulo: 'Ahorro', descripcion: 'Apartar dinero.', decorado: 'hucha' },
  niveles: [
    { id: 'ahorro/01', titulo: 'El colchón', descripcion: 'Leer.', tipo: 'lectura', minutos: 2, estado: 'hecho', estrellas: 2 },
    { id: 'ahorro/02', titulo: 'Practica', descripcion: 'Jugar.', tipo: 'interactivo', minutos: 3, estado: 'disponible', estrellas: 0 },
    { id: 'ahorro/03', titulo: 'El Tragaperras', descripcion: 'El jefe.', tipo: 'jefe', minutos: 4, estado: 'bloqueado', estrellas: 0 },
  ],
  siguiente: 'ahorro/02',
}

describe('CaminoMundo', () => {
  test('un nodo por nivel, con su tipo, su estado y sus estrellas', () => {
    renderConMantine(<CaminoMundo datos={MUNDO} />)

    expect(screen.getByRole('button', { name: 'Lectura: El colchón, superado, 2 de 3 estrellas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Práctica: Practica, disponible' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jefe: El Tragaperras, bloqueado' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Camino de Ahorro: 1 de 3 niveles superados' })).toBeInTheDocument()
  })

  test('pulsar el nivel disponible abre su ficha con el enlace para jugarlo', async () => {
    const { usuario } = renderConMantine(<CaminoMundo datos={MUNDO} />)

    await usuario.click(screen.getByRole('button', { name: /Practica, disponible/ }))

    const ficha = screen.getByRole('dialog', { name: 'Practica' })
    expect(within(ficha).getByText('3 min')).toBeInTheDocument()
    expect(within(ficha).getByRole('link', { name: /Empezar/ })).toHaveAttribute(
      'href',
      '/CaminoHeroe/Nivel?id=ahorro%2F02',
    )
  })

  test('uno superado se puede repetir y enseña la mejor marca', async () => {
    const { usuario } = renderConMantine(<CaminoMundo datos={MUNDO} />)

    await usuario.click(screen.getByRole('button', { name: /El colchón/ }))

    const ficha = screen.getByRole('dialog', { name: 'El colchón' })
    expect(within(ficha).getByText(/2 de 3 estrellas/)).toBeInTheDocument()
    expect(within(ficha).getByRole('link', { name: /Repetir/ })).toBeInTheDocument()
  })

  test('uno bloqueado abre su ficha sin enlace, diciendo qué falta, y también con teclado', async () => {
    const { usuario } = renderConMantine(<CaminoMundo datos={MUNDO} />)

    screen.getByRole('button', { name: /El Tragaperras/ }).focus()
    await usuario.keyboard('{Enter}')

    const ficha = screen.getByRole('dialog', { name: 'El Tragaperras' })
    expect(within(ficha).getByText(/Supera el nivel anterior/)).toBeInTheDocument()
    expect(within(ficha).queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('MapaMundos', () => {
  const MAPA: MapaDto = {
    mundos: [
      { id: 'salud', proximamente: true, titulo: 'Salud financiera', descripcion: 'Saber dónde estás.', decorado: 'escudo', hechos: 0, total: 0, estrellas: 0, estrellasMax: 0 },
      { id: 'ahorro', proximamente: false, titulo: 'Ahorro', descripcion: 'Apartar dinero.', decorado: 'hucha', hechos: 3, total: 3, estrellas: 7, estrellasMax: 9 },
      { id: 'inversion', proximamente: false, titulo: 'Inversión', descripcion: 'Invertir.', decorado: 'montana', hechos: 1, total: 9, estrellas: 2, estrellasMax: 27 },
      { id: 'deuda', proximamente: true, titulo: 'Deuda y crédito', descripcion: 'Préstamos.', decorado: 'tarjeta', hechos: 0, total: 0, estrellas: 0, estrellasMax: 0 },
    ],
    ultimoMundo: null,
  }

  test('arranca elegido el primer mundo con niveles, con sus estrellas encima y el botón para entrar', async () => {
    const { usuario } = renderConMantine(<MapaMundos mapa={MAPA} />)

    const ahorro = screen.getByRole('button', { name: 'Ahorro, 3 de 3 niveles' })
    expect(ahorro).toHaveAttribute('aria-pressed', 'true')
    expect(ahorro).toHaveTextContent('7/9')

    await usuario.click(screen.getByRole('button', { name: 'Entrar en Ahorro' }))
    // Navega al acabar el salto del héroe dentro del planeta.
    await waitFor(() => expect(navegar.push).toHaveBeenCalledWith('/CaminoHeroe/Mundo?id=ahorro'))
  })

  test('elegir otro mundo cambia el botón; pulsarlo otra vez entra', async () => {
    const { usuario } = renderConMantine(<MapaMundos mapa={MAPA} />)

    const inversion = screen.getByRole('button', { name: 'Inversión, 1 de 9 niveles' })
    await usuario.click(inversion)
    expect(inversion).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Entrar en Inversión' })).toBeEnabled()
    expect(navegar.push).not.toHaveBeenCalled()

    await usuario.click(inversion)
    await waitFor(() => expect(navegar.push).toHaveBeenCalledWith('/CaminoHeroe/Mundo?id=inversion'))
  })

  test('un mundo sin niveles lleva candado y no se puede entrar', async () => {
    const { usuario } = renderConMantine(<MapaMundos mapa={MAPA} />)

    const salud = screen.getByRole('button', { name: 'Salud financiera, próximamente' })
    expect(salud).toHaveTextContent('Pronto')
    await usuario.click(salud)
    expect(screen.getByRole('button', { name: /Salud financiera: próximamente/ })).toBeDisabled()
    await usuario.click(salud)
    expect(navegar.push).not.toHaveBeenCalled()
  })

  test.each([
    ['Ahorro', ['Ahorro']],
    ['Salud financiera', ['Salud financiera']],
    ['Deuda y crédito', ['Deuda y crédito']],
    ['Planificación financiera personal', ['Planificación', 'financiera personal']],
  ])('el nombre "%s" va en una línea si cabe sobre su planeta, y si no en dos', (nombre, lineas) => {
    expect(partirNombre(nombre)).toEqual(lineas)
  })

  test('se ven tres a la vez; las flechas deslizan y no pasan de los extremos', async () => {
    const { usuario } = renderConMantine(<MapaMundos mapa={MAPA} />)

    const antes = screen.getByRole('button', { name: 'Mundos anteriores' })
    const despues = screen.getByRole('button', { name: 'Mundos siguientes' })
    expect(screen.getByRole('group', { name: /se ven del 1 al 3/ })).toBeInTheDocument()
    expect(antes).toBeDisabled()

    await usuario.click(despues)
    expect(screen.getByRole('group', { name: /se ven del 2 al 4/ })).toBeInTheDocument()
    expect(despues).toBeDisabled()
    // Ahorro (el 2) sigue a la vista: sigue elegido.
    expect(screen.getByRole('button', { name: /^Ahorro/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('si al deslizar el elegido sale de la vista, se elige el más cercano', async () => {
    const { usuario } = renderConMantine(<MapaMundos mapa={{ ...MAPA, ultimoMundo: 'deuda' }} />)

    expect(screen.getByRole('group', { name: /se ven del 2 al 4/ })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Mundos anteriores' }))
    expect(screen.getByRole('button', { name: /^Inversión/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('el héroe espera en el último mundo jugado', () => {
    renderConMantine(<MapaMundos mapa={{ ...MAPA, ultimoMundo: 'inversion' }} />)
    expect(screen.getByRole('button', { name: /^Inversión/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
