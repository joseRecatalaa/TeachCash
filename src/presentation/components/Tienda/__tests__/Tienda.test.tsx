/**
 * La tienda en pantalla: qué botón sale en cada estado, que comprar manda solo el
 * id y que el probador viste al héroe sin comprar nada.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { CATALOGO } from '@/lib/tienda'
import { nuevoQueryClient } from '@/test/render'
import type { TiendaDto } from '@/src/types/tienda.types'
import { Tienda } from '../Tienda'

const acciones = vi.hoisted(() => ({
  fetchTienda: vi.fn(),
  comprarObjeto: vi.fn(),
  equiparObjeto: vi.fn(),
  quitarObjeto: vi.fn(),
}))
vi.mock('@/src/application/actions/tienda.actions', () => acciones)
vi.mock('@/src/application/actions/cuadro.actions', () => ({ fetchCuadro: vi.fn() }))

const tienda = (disponibles: number, comprados: string[] = [], equipo: string[] = []): TiendaDto => ({
  estrellas: { ganadas: disponibles, gastadas: 0, disponibles },
  equipo,
  objetos: CATALOGO.map((o) => ({ ...o, comprado: comprados.includes(o.id), equipado: equipo.includes(o.id) })),
})

const pintar = (t: TiendaDto) =>
  render(
    <MantineProvider>
      <QueryClientProvider client={nuevoQueryClient()}>
        <Tienda tienda={t} />
      </QueryClientProvider>
    </MantineProvider>,
  )

const ficha = (nombre: string) => screen.getByText(nombre).closest('li') as HTMLElement
const heroe = () => screen.getAllByRole('img')[0]

beforeEach(() => vi.clearAllMocks())

describe('cada objeto dice lo que se puede hacer con él', () => {
  test('con estrellas, se compra, y solo se manda el id', async () => {
    acciones.comprarObjeto.mockResolvedValue({ ok: true, data: tienda(0) })
    pintar(tienda(3))

    await userEvent.click(within(ficha('Casco de cuero')).getByRole('button', { name: /Comprar por 3/ }))

    expect(acciones.comprarObjeto).toHaveBeenCalledWith('casco-basica')
  })

  test('sin estrellas suficientes, el botón no se puede pulsar y dice cuántas faltan', () => {
    pintar(tienda(2))
    const casco = within(ficha('Casco de cuero'))
    expect(casco.getByRole('button', { name: /Comprar/ })).toBeDisabled()
    expect(casco.getByText('Te falta 1')).toBeInTheDocument()
    expect(within(ficha('Casco de oro')).getByText('Te faltan 8')).toBeInTheDocument()
  })

  test('comprado y guardado, se equipa', async () => {
    acciones.equiparObjeto.mockResolvedValue({ ok: true, data: tienda(0) })
    pintar(tienda(0, ['casco-basica']))
    await userEvent.click(within(ficha('Casco de cuero')).getByRole('button', { name: 'Equipar' }))
    expect(acciones.equiparObjeto).toHaveBeenCalledWith('casco-basica')
  })

  test('equipado, lo dice y se puede quitar', async () => {
    acciones.quitarObjeto.mockResolvedValue({ ok: true, data: tienda(0) })
    pintar(tienda(0, ['casco-basica'], ['casco-basica']))
    const casco = within(ficha('Casco de cuero'))
    expect(casco.getByText('Equipado')).toBeInTheDocument()
    await userEvent.click(casco.getByRole('button', { name: 'Quitar' }))
    expect(acciones.quitarObjeto).toHaveBeenCalledWith('casco-basica')
  })
})

describe('el filtro', () => {
  test('deja solo los objetos de ese hueco, con la espada y el martillo juntos', async () => {
    pintar(tienda(0))
    await userEvent.click(screen.getByRole('button', { name: 'Arma' }))
    expect(screen.getByText('Espada de oro')).toBeInTheDocument()
    expect(screen.getByText('Martillo de oro')).toBeInTheDocument()
    expect(screen.queryByText('Casco de oro')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arma' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('el probador', () => {
  test('viste al héroe al pasar por encima y lo deja como estaba al salir', async () => {
    pintar(tienda(0))
    expect(heroe()).toHaveAttribute('aria-label', 'El héroe, sin equipo')

    await userEvent.hover(ficha('Casco de oro'))
    expect(heroe()).toHaveAttribute('aria-label', 'El héroe, con: Casco de oro')

    await userEvent.unhover(ficha('Casco de oro'))
    expect(heroe()).toHaveAttribute('aria-label', 'El héroe, sin equipo')
    expect(acciones.comprarObjeto).not.toHaveBeenCalled()
  })

  test('también con el teclado', async () => {
    pintar(tienda(10))
    within(ficha('Casco de oro')).getByRole('button', { name: /Comprar/ }).focus()
    expect(await screen.findByRole('img', { name: 'El héroe, con: Casco de oro' })).toBeInTheDocument()
  })

  test('sin estrellas ganadas, dice dónde se ganan', () => {
    pintar(tienda(0))
    expect(screen.getByRole('link', { name: /Camino del héroe/ })).toHaveAttribute('href', '/CaminoHeroe')
  })
})
