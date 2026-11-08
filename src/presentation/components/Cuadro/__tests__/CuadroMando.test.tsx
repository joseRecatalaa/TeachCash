/**
 * El Cuadro de mando en pantalla: la señal que no es solo color, lo que se le
 * enseña a quien empieza y la lista legible de las estadísticas, que es lo que
 * llega al lector de pantalla en lugar del radar.
 */

import { describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { calcularEstadisticas } from '@/lib/estadisticas'
import type { CuadroDto } from '@/src/types/cuadro.types'
import { CuadroMando } from '../CuadroMando'

vi.mock('recharts', async (original) => ({
  ...(await original<typeof import('recharts')>()),
  // Recharts mide el DOM, y en jsdom todo mide cero.
  ResponsiveContainer: () => null,
}))

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

describe('las estrellas', () => {
  test('dice las que hay para gastar y lleva a la tienda', () => {
    pintar()
    const tarjeta = within(screen.getByRole('region', { name: 'Estrellas' }))
    expect(tarjeta.getByText('23')).toBeInTheDocument()
    expect(tarjeta.getByText('41 ganadas · 18 gastadas')).toBeInTheDocument()
    expect(tarjeta.getByRole('link', { name: /tienda/ })).toHaveAttribute('href', '/Tienda')
  })

  test('sin ganar ninguna, lleva a los cursos', () => {
    pintar({ estrellas: { ganadas: 0, gastadas: 0, disponibles: 0 } })
    expect(screen.getByRole('link', { name: /Camino del héroe/ })).toHaveAttribute('href', '/CaminoHeroe')
  })
})

describe('el héroe', () => {
  test('dice lo que lleva y lo que le falta', () => {
    pintar()
    const tarjeta = within(screen.getByRole('region', { name: 'Tu héroe' }))
    expect(tarjeta.getByRole('img')).toHaveAttribute('aria-label', 'El héroe, con: Casco de oro')
    expect(tarjeta.getByText('Casco de oro')).toBeInTheDocument()
    expect(tarjeta.getAllByText('Sin equipar')).toHaveLength(6)
  })
})

describe('las estadísticas', () => {
  test('la lista dice las siete, con su cifra y de dónde sale cada una', () => {
    pintar()
    const tarjeta = within(screen.getByRole('region', { name: 'Estadísticas' }))
    expect(tarjeta.getAllByRole('term')).toHaveLength(7)
    expect(tarjeta.getByText('Vitalidad')).toBeInTheDocument()
    expect(tarjeta.getByText('Lo que lleva equipado')).toBeInTheDocument()
    expect(tarjeta.getByText('33')).toBeInTheDocument()
  })
})
