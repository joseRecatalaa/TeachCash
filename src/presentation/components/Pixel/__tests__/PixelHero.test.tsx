/**
 * Lo que decide `PixelHero` y no el CSS: que la pose llegue al `data-pose`,
 * que todas las capas existan sea cual sea la pose (la pantalla de carga las
 * anima) y que mirar a la izquierda lo voltee sobre su propio ancho.
 */

import { describe, expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { ANCHO_HEROE, PixelHero, type PoseHeroe } from '../PixelHero'

const pintar = (ui: React.ReactElement) => render(<svg>{ui}</svg>).container.querySelector('svg > g')!

describe('PixelHero', () => {
  test.each<PoseHeroe>(['quieto', 'camina', 'celebra'])('la pose %s llega al data-pose', (pose) => {
    const heroe = pintar(<PixelHero pose={pose} />)
    expect(heroe.getAttribute('data-pose')).toBe(pose)
  })

  test('pinta las mismas capas en todas las poses', () => {
    const capas = (pose: PoseHeroe) => pintar(<PixelHero pose={pose} />).querySelectorAll('g').length
    expect(capas('camina')).toBe(capas('quieto'))
    expect(capas('celebra')).toBe(capas('quieto'))
  })

  test('por defecto mira a la derecha, sin voltear', () => {
    expect(pintar(<PixelHero />).getAttribute('transform')).toBeNull()
  })

  test('mirando a la izquierda se voltea sobre su ancho', () => {
    expect(pintar(<PixelHero mirando="izq" />).getAttribute('transform')).toBe(
      `translate(${ANCHO_HEROE} 0) scale(-1 1)`,
    )
  })

  test('engancha las clases de la escena a sus capas', () => {
    const heroe = pintar(<PixelHero clases={{ salta: 'mi-salto', lleva: 'mi-billete' }} />)
    expect(heroe.querySelector('.mi-salto')).not.toBeNull()
    expect(heroe.querySelector('.mi-billete')).not.toBeNull()
  })
})
