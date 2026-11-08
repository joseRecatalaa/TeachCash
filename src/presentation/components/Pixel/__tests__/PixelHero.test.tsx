/**
 * Lo que decide `PixelHero` y no el CSS: que la pose llegue al `data-pose`,
 * que todas las capas existan sea cual sea la pose (la pantalla de carga las
 * anima) y que mirar a la izquierda lo voltee sobre su propio ancho.
 *
 * Y el equipo: qué piezas se pintan, en qué orden y pegadas a qué parte del
 * cuerpo. Que el guante no lleve la clase del brazo no da ningún error: el
 * brazo se balancea al andar y el guante se queda flotando en su sitio.
 */

import { describe, expect, test } from 'vitest'
import { render } from '@testing-library/react'
import { ANCHO_HEROE, PixelHero, type PoseHeroe } from '../PixelHero'
import { EQUIPO_ESPADA, EQUIPO_MARTILLO } from '../spritesEquipo'
import styles from '../pixel.module.css'

const pintar = (ui: React.ReactElement) => render(<svg>{ui}</svg>).container.querySelector('svg > g')!

describe('PixelHero', () => {
  test.each<PoseHeroe>(['quieto', 'agacha', 'camina', 'celebra'])('la pose %s llega al data-pose', (pose) => {
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

const TODO = ['casco-media', 'armadura-media', 'guantes-media', 'botas-media', 'espada-media', 'escudo-media', 'alas-media']

const piezas = (heroe: Element) => [...heroe.querySelectorAll('[data-hueco]')]

describe('PixelHero con equipo', () => {
  test('sin equipo no pinta ninguna pieza', () => {
    expect(piezas(pintar(<PixelHero />))).toEqual([])
  })

  test('cada pieza, con la calidad que se compró', () => {
    const heroe = pintar(<PixelHero equipo={['casco-alta', 'alas-basica']} />)
    expect(piezas(heroe).map((g) => `${g.getAttribute('data-hueco')}:${g.getAttribute('data-calidad')}`)).toEqual([
      'alas:basica',
      'casco:alta',
    ])
  })

  test('lo que no está en el catálogo no se pinta', () => {
    expect(piezas(pintar(<PixelHero equipo={['retirado']} />))).toEqual([])
  })

  /*
   * El orden de pintado, de atrás adelante. Las botas son tres (un fotograma por
   * paso); el escudo, dos (delante y, al celebrar, a la espalda); los guantes,
   * tres (una por mano y otra en el puño en alto). El arma va antes que el brazo
   * derecho, para que la mano se cierre sobre ella, y el casco, antes que el
   * brazo en alto, que pasa por delante de la cabeza.
   */
  test('las capas van en su orden, sea cual sea el orden en que llegan', () => {
    const orden = (equipo: string[]) => piezas(pintar(<PixelHero equipo={equipo} />)).map((g) => g.getAttribute('data-hueco'))
    const esperado = ['botas', 'botas', 'botas', 'alas', 'escudo', 'armadura', 'guantes', 'escudo', 'arma', 'guantes', 'casco', 'guantes']
    expect(orden(TODO)).toEqual(esperado)
    expect(orden([...TODO].reverse())).toEqual(esperado)
  })

  test('el arma va detrás del brazo derecho y el casco detrás del brazo en alto', () => {
    const heroe = pintar(<PixelHero equipo={TODO} />)
    const todas = [...heroe.querySelectorAll('g')]
    const indice = (el: Element | null) => todas.indexOf(el as SVGGElement)
    const brazoDer = heroe.querySelector(`.${styles.brazoDer}:not([data-hueco])`)
    expect(indice(heroe.querySelector('[data-hueco="arma"]'))).toBeLessThan(indice(brazoDer))
    expect(indice(heroe.querySelector('[data-hueco="casco"]'))).toBeLessThan(indice(heroe.querySelector(`.${styles.lleva}`)))
  })

  test('cada pieza lleva la clase de la parte del cuerpo que la mueve', () => {
    const heroe = pintar(<PixelHero equipo={TODO} />)
    const clases = (hueco: string) =>
      piezas(heroe)
        .filter((g) => g.getAttribute('data-hueco') === hueco)
        .map((g) => g.getAttribute('class') ?? '')
    const [botas, paso1, paso2] = clases('botas')
    expect(botas).toContain(styles.piernas)
    expect(paso1).toContain(styles.paso1)
    expect(paso2).toContain(styles.paso2)
    const [espalda, delante] = clases('escudo')
    expect(espalda).toContain(styles.escudoEspalda)
    expect(delante).toContain(styles.brazoIzq)
    const [guanteIzq, guanteDer] = clases('guantes')
    expect(guanteIzq).toContain(styles.brazoIzq)
    expect(guanteDer).toContain(styles.brazoDer)
    expect(clases('arma')[0]).toContain(styles.brazoDer)
    // El tercer guante va dentro del brazo en alto, y aparece con él.
    expect(heroe.querySelector(`.${styles.lleva} [data-hueco="guantes"]`)).not.toBeNull()
  })

  test('lo de cintura para arriba respira; las botas, no', () => {
    const heroe = pintar(<PixelHero equipo={TODO} />)
    const respira = heroe.querySelector(`.${styles.respira}`)!
    for (const g of piezas(heroe)) {
      expect(respira.contains(g)).toBe(g.getAttribute('data-hueco') !== 'botas')
    }
  })

  test('el martillo y la espada comparten hueco pero no dibujo', () => {
    const trazo = (equipo: string[]) => pintar(<PixelHero equipo={equipo} />).querySelector('[data-hueco="arma"] path')!.getAttribute('d')
    expect(trazo(['espada-alta'])).not.toBe(trazo(['martillo-alta']))
    expect(EQUIPO_ESPADA).not.toBe(EQUIPO_MARTILLO)
  })

  test('con equipo, pinta las mismas capas en todas las poses', () => {
    const capas = (pose: PoseHeroe) => pintar(<PixelHero pose={pose} equipo={TODO} />).querySelectorAll('g').length
    expect(capas('camina')).toBe(capas('quieto'))
    expect(capas('celebra')).toBe(capas('quieto'))
  })
})
