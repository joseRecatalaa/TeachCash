/**
 * El camino de un mundo y el mapa, como los usa una persona: los nodos se
 * pulsan (con ratón o con teclado) y abren su ficha; uno bloqueado dice qué
 * falta en vez de llevar a ninguna parte; cada mundo del mapa lleva a su
 * camino.
 */

import { describe, expect, test } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderConMantine } from '@/test/render'
import type { MapaDto, MundoDto } from '@/src/types/heroe.types'
import { CaminoMundo } from '../CaminoMundo'
import { MapaMundos } from '../MapaMundos'

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
      { id: 'salud', titulo: 'Salud financiera', descripcion: 'Saber dónde estás.', decorado: 'escudo', hechos: 0, total: 9, estrellas: 0, estrellasMax: 27 },
      { id: 'ahorro', titulo: 'Ahorro', descripcion: 'Apartar dinero.', decorado: 'hucha', hechos: 3, total: 3, estrellas: 7, estrellasMax: 9 },
    ],
    ultimoMundo: 'ahorro',
  }

  test('cada mundo lleva a su camino y dice su progreso', () => {
    renderConMantine(<MapaMundos mapa={MAPA} />)

    const ahorro = screen.getByRole('link', { name: /Ahorro/ })
    expect(ahorro).toHaveAttribute('href', '/CaminoHeroe/Mundo?id=ahorro')
    expect(ahorro).toHaveTextContent('Completado')
    expect(ahorro).toHaveTextContent('7 de 9 estrellas')
    expect(screen.getByRole('link', { name: /Salud financiera/ })).toHaveTextContent('0 de 9 niveles')
  })

  test('el héroe espera en el último mundo jugado, y si no ha jugado, en el primero', () => {
    const { unmount } = renderConMantine(<MapaMundos mapa={MAPA} />)
    expect(screen.getByRole('link', { name: /Ahorro/ })).toHaveTextContent('Aquí te quedaste')
    unmount()

    renderConMantine(<MapaMundos mapa={{ ...MAPA, ultimoMundo: null }} />)
    expect(screen.getByRole('link', { name: /Salud financiera/ })).toHaveTextContent('Aquí te quedaste')
  })
})
