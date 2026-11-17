/**
 * El Cuadro de mando en pantalla: la señal que no es solo color, lo que se le
 * enseña a quien empieza, el bocadillo de cada pieza del héroe y la ficha de las
 * estadísticas, que es lo que llega al lector de pantalla en lugar del radar.
 */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { calcularEstadisticas } from '@/lib/estadisticas'
import type { CuadroDto } from '@/src/types/cuadro.types'
import { CuadroMando } from '../CuadroMando'

const CUADRO: CuadroDto = {
  patrimonio: 1_248_050,
  ganancia: 148_050,
  inicialElegido: true,
  estrellas: { ganadas: 41, gastadas: 18, disponibles: 23 },
  equipo: ['casco-alta'],
  estadisticas: calcularEstadisticas({
    mundos: { salud: { hechos: 3, total: 9 } },
    ganancia: 148_050,
    mesesEnPositivo: 6,
    precioEquipo: 10,
    maximoEquipable: 75,
  }),
}

const pintar = (cambios: Partial<CuadroDto> = {}) =>
  render(
    <MantineProvider>
      <CuadroMando cuadro={{ ...CUADRO, ...cambios }} />
    </MantineProvider>,
  )

describe('el patrimonio', () => {
  test('la ganancia lleva su signo', () => {
    pintar()
    expect(screen.getByRole('region', { name: 'Patrimonio total' })).toHaveTextContent(/\+\s?1480,50/)
  })

  test('una pérdida también', () => {
    pintar({ ganancia: -5_000 })
    expect(screen.getByRole('region', { name: 'Patrimonio total' })).toHaveTextContent(/[−-]\s?50,00/)
  })

  test('sin cambios lo dice con palabras', () => {
    pintar({ ganancia: 0 })
    expect(screen.getByText('Sin cambios desde que empezaste')).toBeInTheDocument()
  })

  test('quien no ha dicho con cuánto empieza encuentra dónde decirlo', () => {
    pintar({ inicialElegido: false })
    expect(screen.getByRole('link', { name: /¿Con cuánto empiezas\?/ })).toHaveAttribute('href', '/Patrimonio')
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('las estrellas', () => {
  test('dice las que hay para gastar y lleva a la tienda', () => {
    pintar()
    const zona = within(screen.getByRole('region', { name: 'Estrellas' }))
    expect(zona.getByText('23 estrellas para gastar')).toBeInTheDocument()
    expect(zona.getAllByText('23')).toHaveLength(2) // la cifra y su sombra, dentro del dibujo
    expect(zona.getByRole('link', { name: /Ir a la tienda/ })).toHaveAttribute('href', '/Tienda')
  })

  test('sin lo ganado ni lo gastado: eso está en la tienda', () => {
    pintar()
    expect(screen.queryByText(/ganadas/)).not.toBeInTheDocument()
    expect(screen.queryByText(/gastadas/)).not.toBeInTheDocument()
  })

  test('una sola va en singular', () => {
    pintar({ estrellas: { ganadas: 1, gastadas: 0, disponibles: 1 } })
    expect(screen.getByText('1 estrella para gastar')).toBeInTheDocument()
  })

  test('sin ganar ninguna, lleva a los cursos', () => {
    pintar({ estrellas: { ganadas: 0, gastadas: 0, disponibles: 0 } })
    expect(screen.getByRole('link', { name: /Camino del héroe/ })).toHaveAttribute('href', '/CaminoHeroe')
  })
})

describe('el héroe', () => {
  const zona = () => within(screen.getByRole('region', { name: 'Tu héroe' }))

  test('el dibujo dice lo que lleva', () => {
    pintar()
    expect(zona().getByRole('img')).toHaveAttribute('aria-label', 'El héroe, con: Casco de oro')
  })

  test('cada parte del cuerpo se puede señalar, y no hay leyenda ni instrucciones', () => {
    pintar()
    expect(zona().getAllByRole('button')).toHaveLength(7)
    expect(zona().queryByText('Casco de oro')).not.toBeInTheDocument()
    expect(screen.queryByText(/Toca a tu héroe/)).not.toBeInTheDocument()
  })

  test('basta con pasar el ratón por una pieza puesta para ver cuál es', () => {
    const { container } = pintar()
    fireEvent.pointerEnter(zona().getByRole('button', { name: 'Casco' }))
    expect(zona().getByText('Casco de oro')).toBeInTheDocument()
    expect(zona().getByRole('link', { name: /Ver la tienda/ })).toHaveAttribute('href', '/Tienda')
    expect(container.querySelector('[data-anillo]')).not.toBeNull()
  })

  test('en un hueco vacío, dice lo que falta', () => {
    pintar()
    fireEvent.pointerEnter(zona().getByRole('button', { name: 'Armadura' }))
    expect(zona().getByText('Sin armadura')).toBeInTheDocument()
    expect(zona().getByRole('link', { name: /Conseguir en la tienda/ })).toBeInTheDocument()
  })

  test('al salir, se cierra tras un margen para cruzar hasta el bocadillo', () => {
    vi.useFakeTimers()
    pintar()
    const casco = zona().getByRole('button', { name: 'Casco' })
    fireEvent.pointerEnter(casco)
    fireEvent.pointerLeave(casco)
    expect(zona().getByText('Casco de oro')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(500))
    expect(zona().queryByText('Casco de oro')).not.toBeInTheDocument()
  })

  test('si el ratón llega al bocadillo, se queda abierto', () => {
    vi.useFakeTimers()
    pintar()
    const casco = zona().getByRole('button', { name: 'Casco' })
    fireEvent.pointerEnter(casco)
    fireEvent.pointerLeave(casco)
    fireEvent.pointerEnter(zona().getByText('Casco de oro'))
    act(() => vi.advanceTimersByTime(500))
    expect(zona().getByText('Casco de oro')).toBeInTheDocument()
  })

  test('con el teclado, al llegar con el tabulador; y Escape lo cierra', () => {
    pintar()
    fireEvent.focus(zona().getByRole('button', { name: 'Botas' }))
    expect(zona().getByText('Sin botas')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(zona().queryByText('Sin botas')).not.toBeInTheDocument()
  })

  test('con el dedo se toca, y se cierra tocando fuera', () => {
    pintar()
    fireEvent.click(zona().getByRole('button', { name: 'Escudo' }))
    expect(zona().getByText('Sin escudo')).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(zona().queryByText('Sin escudo')).not.toBeInTheDocument()
  })

  test('el héroe no se destiñe: no hay modo gris', () => {
    const { container } = pintar()
    fireEvent.pointerEnter(zona().getByRole('button', { name: 'Casco' }))
    expect(container.querySelector('[data-foco]')).toBeNull()
  })
})

describe('las estadísticas', () => {
  const info = () => screen.getByRole('button', { name: 'Ver la ficha del héroe' })

  test('el lector de pantalla tiene las siete sin abrir nada', () => {
    pintar()
    const zona = within(screen.getByRole('region', { name: 'Estadísticas' }))
    expect(zona.getAllByRole('term')).toHaveLength(7)
    expect(zona.getByText('Vitalidad')).toBeInTheDocument()
    expect(zona.getByText('Lo que lleva equipado')).toBeInTheDocument()
    expect(zona.getByText('33 de 100')).toBeInTheDocument()
  })

  test('el dibujo lleva la clave y la cifra en cada punta', () => {
    pintar()
    const radar = screen.getByRole('region', { name: 'Estadísticas' })
    const etiquetas = [...radar.querySelectorAll('text')].map((t) => t.textContent)
    expect(etiquetas).toHaveLength(7)
    expect(etiquetas[0]).toBe('VIT33')
  })

  test('pasar el ratón por el dibujo no abre nada', () => {
    const { container } = pintar()
    fireEvent.pointerEnter(container.querySelector('svg[aria-hidden="true"]')!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('el botón de información abre la ficha, con su título y sin la coletilla de 0 a 100', () => {
    pintar()
    fireEvent.click(info())
    const ficha = within(screen.getByRole('dialog', { name: 'Ficha del héroe' }))
    expect(ficha.getByRole('heading', { name: 'Ficha del héroe' })).toBeInTheDocument()
    expect(ficha.getByText('Constancia')).toBeInTheDocument()
    expect(ficha.queryByText(/va de 0 a 100/)).not.toBeInTheDocument()
  })

  test('solo se cierra con la cruz: tocar fuera o salir con el ratón no la cierra', () => {
    pintar()
    fireEvent.click(info())
    const ficha = screen.getByRole('dialog')
    fireEvent.pointerDown(document.body)
    fireEvent.pointerLeave(ficha)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(within(ficha).getByRole('button', { name: 'Cerrar la ficha' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(info()).toHaveFocus()
  })

  test('Escape es la cruz del teclado', () => {
    pintar()
    fireEvent.click(info())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
