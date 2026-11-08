/**
 * La tienda en pantalla: qué botón sale en cada estado, que comprar manda solo el
 * id y que el probador viste al héroe sin comprar nada. Y que comprar se nota:
 * la pieza se estrena con destellos y las estrellas bajan contando, pero solo al
 * comprar, y nunca con el movimiento reducido.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CATALOGO } from '@/lib/tienda'
import { nuevoQueryClient } from '@/test/render'
import { CLAVE_TIENDA, useTienda } from '@/src/application/hooks/useCuadro'
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

/* ── Comprar se nota ───────────────────────────────────────────────────────── */

/*
 * Como en la página: la tienda sale de `useTienda`, y lo que devuelve una compra
 * entra por la caché (`setQueryData` en el hook). Con un prop fijo, la Tienda no
 * vería nunca el resultado. La caché arranca llena y no caduca: así no se pide
 * nada al montar y lo único que la cambia es la mutación.
 */
function TiendaDeLaPagina() {
  const { data } = useTienda()
  return data ? <Tienda tienda={data} /> : null
}

const pintarComoLaPagina = (t: TiendaDto) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  queryClient.setQueryData(CLAVE_TIENDA, t)
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <TiendaDeLaPagina />
      </QueryClientProvider>
    </MantineProvider>,
  )
}

const estreno = () => heroe().querySelector('[data-estreno]')
const destellos = () => heroe().querySelectorAll('[data-destellos] > g')
const comprarCasco = () =>
  userEvent.click(within(ficha('Casco de cuero')).getByRole('button', { name: /Comprar por 3/ }))

/** Como un navegador con "reducir movimiento" activado. */
function conMovimientoReducido() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  )
}

afterEach(() => vi.restoreAllMocks())

describe('comprar se nota', () => {
  test('la pieza se estrena en el héroe, con sus destellos, y lo cuenta', async () => {
    acciones.comprarObjeto.mockResolvedValue({ ok: true, data: tienda(7, ['casco-basica'], ['casco-basica']) })
    pintarComoLaPagina(tienda(10))

    await comprarCasco()

    await waitFor(() => expect(estreno()).not.toBeNull())
    expect(estreno()).toHaveAttribute('data-hueco', 'casco')
    expect(destellos()).toHaveLength(4)
    expect(screen.getByRole('status')).toHaveTextContent('Casco de cuero, comprado y puesto')
  })

  test('no retrasa la compra: la ficha ya dice "Equipado" mientras se estrena', async () => {
    acciones.comprarObjeto.mockResolvedValue({ ok: true, data: tienda(7, ['casco-basica'], ['casco-basica']) })
    pintarComoLaPagina(tienda(10))

    await comprarCasco()

    await waitFor(() => expect(estreno()).not.toBeNull())
    expect(within(ficha('Casco de cuero')).getByText('Equipado')).toBeInTheDocument()
  })

  test('las estrellas bajan hasta lo que queda, y el lector de pantalla oye solo la cifra final', async () => {
    acciones.comprarObjeto.mockResolvedValue({ ok: true, data: tienda(7, ['casco-basica'], ['casco-basica']) })
    pintarComoLaPagina(tienda(10))
    expect(screen.getByLabelText('10')).toHaveTextContent('10')

    await comprarCasco()

    const cifra = await screen.findByLabelText('7')
    await waitFor(() => expect(cifra).toHaveTextContent('7'))
  })

  test('el estreno se va solo: volver a pasar por la pieza no la hace parpadear', async () => {
    acciones.comprarObjeto.mockResolvedValue({ ok: true, data: tienda(7, ['casco-basica'], ['casco-basica']) })
    pintarComoLaPagina(tienda(10))

    await comprarCasco()
    await waitFor(() => expect(estreno()).not.toBeNull())

    await waitFor(() => expect(estreno()).toBeNull(), { timeout: 2000 })
    expect(destellos()).toHaveLength(0)
  })

  test('al cargar la página no se estrena nada, aunque lleve equipo', () => {
    pintarComoLaPagina(tienda(5, ['casco-basica'], ['casco-basica']))
    expect(heroe()).toHaveAttribute('aria-label', 'El héroe, con: Casco de cuero')
    expect(estreno()).toBeNull()
    expect(destellos()).toHaveLength(0)
  })

  test('equipar algo que ya era tuyo no se estrena', async () => {
    acciones.equiparObjeto.mockResolvedValue({ ok: true, data: tienda(0, ['casco-basica'], ['casco-basica']) })
    pintarComoLaPagina(tienda(0, ['casco-basica']))

    await userEvent.click(within(ficha('Casco de cuero')).getByRole('button', { name: 'Equipar' }))

    await within(ficha('Casco de cuero')).findByText('Equipado')
    await userEvent.unhover(ficha('Casco de cuero'))
    expect(heroe()).toHaveAttribute('aria-label', 'El héroe, con: Casco de cuero')
    expect(estreno()).toBeNull()
    expect(destellos()).toHaveLength(0)
  })

  test('si la compra falla, no se estrena nada', async () => {
    acciones.comprarObjeto.mockResolvedValue({ ok: false, error: 'No tienes estrellas suficientes' })
    pintarComoLaPagina(tienda(10))

    await comprarCasco()

    await waitFor(() => expect(acciones.comprarObjeto).toHaveBeenCalled())
    expect(estreno()).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  test('con el movimiento reducido no hay gesto ni cuenta, pero sí la noticia', async () => {
    conMovimientoReducido()
    acciones.comprarObjeto.mockResolvedValue({ ok: true, data: tienda(7, ['casco-basica'], ['casco-basica']) })
    pintarComoLaPagina(tienda(10))

    await comprarCasco()

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Casco de cuero, comprado y puesto'))
    expect(estreno()).toBeNull()
    expect(destellos()).toHaveLength(0)
    // Sin contar: la cifra ya es la final en el primer render tras la compra.
    expect(screen.getByLabelText('7')).toHaveTextContent('7')
  })
})
