/**
 * El menú de módulos, usado como lo usa cada tipo de persona: con ratón (se
 * abre al pasar y se cierra al salir), con el dedo (la pestaña es un botón) y
 * con teclado (Escape cierra y devuelve el foco).
 */

import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { renderConMantine } from '@/test/render'
import { SideMenu } from '../SideMenu'
import { EVENTO_FIN_SPLASH } from '../../Splash/SplashScreen'

const pestana = () => screen.getByRole('button', { name: /menú de módulos/ })

afterEach(() => {
  vi.useRealTimers()
  window.sessionStorage.clear()
  delete document.documentElement.dataset.splash
})

describe('SideMenu', () => {
  test('nace escondido: la pestaña dice que está cerrado y el panel es inerte', () => {
    renderConMantine(<SideMenu />)

    expect(pestana()).toHaveAttribute('aria-expanded', 'false')
    const panel = document.getElementById(pestana().getAttribute('aria-controls') ?? '')
    expect(panel).toHaveAttribute('inert')
  })

  test('con ratón, pasar por encima lo abre y salir lo cierra', async () => {
    const { usuario } = renderConMantine(<SideMenu />)

    await usuario.hover(pestana())
    expect(pestana()).toHaveAttribute('aria-expanded', 'true')
    expect(pestana()).toHaveAccessibleName('Cerrar el menú de módulos')

    await usuario.unhover(pestana())
    await waitFor(() => expect(pestana()).toHaveAttribute('aria-expanded', 'false'))
  })

  test('con ratón, hacer clic en la pestaña ya abierta por hover NO la cierra', async () => {
    const { usuario } = renderConMantine(<SideMenu />)

    // `click` pasa antes por encima: el hover abre y el clic no debe alternar.
    await usuario.click(pestana())

    expect(pestana()).toHaveAttribute('aria-expanded', 'true')
  })

  test('sin ratón, la pestaña abre y cierra al pulsarla', async () => {
    const { usuario } = renderConMantine(<SideMenu />)

    // Un toque: `pointerenter` táctil no debe abrir, o el click lo cerraría.
    await usuario.pointer({ keys: '[TouchA]', target: pestana() })
    expect(pestana()).toHaveAttribute('aria-expanded', 'true')

    await usuario.pointer({ keys: '[TouchA]', target: pestana() })
    expect(pestana()).toHaveAttribute('aria-expanded', 'false')
  })

  test('Escape lo cierra y el foco vuelve a la pestaña', async () => {
    const { usuario } = renderConMantine(<SideMenu />)

    pestana().focus()
    await usuario.keyboard('{Enter}')
    expect(pestana()).toHaveAttribute('aria-expanded', 'true')

    await usuario.tab()
    await usuario.keyboard('{Escape}')

    expect(pestana()).toHaveAttribute('aria-expanded', 'false')
    expect(pestana()).toHaveFocus()
  })

  test('un toque fuera del menú lo cierra', async () => {
    const { usuario } = renderConMantine(
      <>
        <SideMenu />
        <p>contenido</p>
      </>,
    )

    await usuario.click(pestana())
    await usuario.pointer({ keys: '[TouchA]', target: screen.getByText('contenido') })

    expect(pestana()).toHaveAttribute('aria-expanded', 'false')
  })

  test('Gestión de patrimonio es un enlace a Inicio, marcado como actual', () => {
    renderConMantine(<SideMenu />)

    const enlace = screen.getByRole('link', { name: /Gestión de patrimonio/ })
    expect(enlace).toHaveAttribute('href', '/')
    expect(enlace).toHaveAttribute('aria-current', 'page')
  })

  test('Camino del héroe NO es un enlace: está deshabilitado y lo dice', () => {
    renderConMantine(<SideMenu />)

    expect(screen.queryByRole('link', { name: /Camino del héroe/ })).not.toBeInTheDocument()
    const modulo = screen.getByText('Camino del héroe').closest('[aria-disabled]')
    expect(modulo).toHaveAttribute('aria-disabled', 'true')
    expect(modulo).toHaveTextContent('Próximamente')
  })

  test('es un `nav` con su propio nombre, distinto del de la Navbar', () => {
    renderConMantine(<SideMenu />)

    // Los E2E encuentran la Navbar por "Principal": dos `nav` con el mismo
    // nombre los harían fallar por ambigüedad.
    expect(screen.getByRole('navigation', { name: 'Módulos' })).toBeInTheDocument()
  })

  describe('el asomo', () => {
    // Con temporizadores falsos, sin `userEvent`: aquí no se interactúa.
    const raiz = () => pestana().parentElement!
    const montar = () => render(<MantineProvider env="test"><SideMenu /></MantineProvider>)

    test('al terminar la pantalla de carga se asoma un momento y vuelve', () => {
      vi.useFakeTimers()
      montar()

      expect(raiz()).toHaveAttribute('data-asomando', 'false')
      act(() => {
        window.dispatchEvent(new Event(EVENTO_FIN_SPLASH))
        vi.advanceTimersByTime(800)
      })
      expect(raiz()).toHaveAttribute('data-asomando', 'true')
      // Asomarse no es abrirse: quien no lo ha pedido no tiene el menú encima.
      expect(pestana()).toHaveAttribute('aria-expanded', 'false')

      act(() => vi.advanceTimersByTime(1500))
      expect(raiz()).toHaveAttribute('data-asomando', 'false')
    })

    test('si la pantalla de carga ya se vio, se asoma sin esperarla', () => {
      vi.useFakeTimers()
      document.documentElement.dataset.splash = 'visto'
      montar()

      act(() => vi.advanceTimersByTime(800))
      expect(raiz()).toHaveAttribute('data-asomando', 'true')
    })

    test('si la pantalla de carga terminó ANTES de montarse el menú, también se asoma', () => {
      vi.useFakeTimers()
      // Primera visita: el evento sonó mientras se creaba el invitado.
      window.sessionStorage.setItem('gf-splash-visto', '1')
      montar()

      act(() => vi.advanceTimersByTime(800))
      expect(raiz()).toHaveAttribute('data-asomando', 'true')
    })

    test('una vez por sesión: al recargar ya no se asoma', () => {
      vi.useFakeTimers()
      window.sessionStorage.setItem('tc-menu-asomado', '1')
      document.documentElement.dataset.splash = 'visto'
      montar()

      act(() => vi.advanceTimersByTime(3000))
      expect(raiz()).toHaveAttribute('data-asomando', 'false')
    })
  })
})
