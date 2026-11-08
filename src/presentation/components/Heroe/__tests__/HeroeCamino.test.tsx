/**
 * El héroe del Camino lleva lo que la tienda dice que tiene equipado, sin una
 * consulta propia; sin la tienda, sale sin equipo y no rompe nada. Y la pantalla
 * de carga no lleva equipo nunca: sale antes de que haya sesión.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { nuevoQueryClient } from '@/test/render'
import { CLAVE_TIENDA } from '@/src/application/hooks/useCuadro'
import type { TiendaDto } from '@/src/types/tienda.types'
import { PixelScene } from '../../Splash/PixelScene'
import { EquipoDelCamino } from '../EquipoDelCamino'
import { HeroeCamino } from '../HeroeCamino'

const acciones = vi.hoisted(() => ({
  fetchTienda: vi.fn(),
  comprarObjeto: vi.fn(),
  equiparObjeto: vi.fn(),
  quitarObjeto: vi.fn(),
}))
vi.mock('@/src/application/actions/tienda.actions', () => acciones)
vi.mock('@/src/application/actions/cuadro.actions', () => ({ fetchCuadro: vi.fn() }))

const tienda = (equipo: string[]): TiendaDto => ({
  estrellas: { ganadas: 0, gastadas: 0, disponibles: 0 },
  equipo,
  objetos: [],
})

const huecos = (raiz: ParentNode) => [...raiz.querySelectorAll('[data-hueco]')].map((g) => g.getAttribute('data-hueco'))

beforeEach(() => vi.clearAllMocks())

describe('HeroeCamino', () => {
  test('lleva el equipo de la tienda', async () => {
    acciones.fetchTienda.mockResolvedValue({ ok: true, data: tienda(['casco-alta', 'espada-basica']) })
    const { container } = render(
      <QueryClientProvider client={nuevoQueryClient()}>
        <EquipoDelCamino>
          <svg>
            <HeroeCamino pose="agacha" />
          </svg>
        </EquipoDelCamino>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(huecos(container)).toEqual(['arma', 'casco']))
    expect(acciones.fetchTienda).toHaveBeenCalledTimes(1)
  })

  test('todos los héroes del módulo comparten una sola consulta', async () => {
    acciones.fetchTienda.mockResolvedValue({ ok: true, data: tienda(['casco-alta']) })
    const { container } = render(
      <QueryClientProvider client={nuevoQueryClient()}>
        <EquipoDelCamino>
          <svg>
            <HeroeCamino />
            <HeroeCamino pose="celebra" />
          </svg>
        </EquipoDelCamino>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(huecos(container)).toEqual(['casco', 'casco']))
    expect(acciones.fetchTienda).toHaveBeenCalledTimes(1)
  })

  test('si la tienda falla, sale sin equipo y sin error', async () => {
    acciones.fetchTienda.mockResolvedValue({ ok: false, error: 'No hay sesión' })
    const queryClient = nuevoQueryClient()
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <EquipoDelCamino>
          <svg>
            <HeroeCamino />
          </svg>
        </EquipoDelCamino>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(queryClient.getQueryState(CLAVE_TIENDA)?.status).toBe('error'))
    expect(huecos(container)).toEqual([])
    expect(container.querySelector('[data-pose]')).not.toBeNull()
  })

  test('sin proveedor (fuera del Camino) sale sin equipo', () => {
    const { container } = render(
      <svg>
        <HeroeCamino />
      </svg>,
    )
    expect(huecos(container)).toEqual([])
  })

  test('la pantalla de carga no lleva equipo, aunque lo haya', async () => {
    acciones.fetchTienda.mockResolvedValue({ ok: true, data: tienda(['casco-alta']) })
    const queryClient = nuevoQueryClient()
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <EquipoDelCamino>
          <PixelScene />
        </EquipoDelCamino>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(queryClient.getQueryState(CLAVE_TIENDA)?.status).toBe('success'))
    expect(container.querySelector('[data-pose]')).not.toBeNull()
    expect(huecos(container)).toEqual([])
  })
})
