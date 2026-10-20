/**
 * El selector de color de una categoría, usado como lo usa quien navega con
 * teclado o lector de pantalla: cada chapa se encuentra por el NOMBRE de su
 * color, y lo que se guarda es la clave ('cat-3'), nunca el color.
 */

import { describe, expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderConMantine } from '@/test/render'
import { CLAVES_COLOR, NOMBRE_COLOR } from '@/lib/colores'
import type { FieldRenderArgs } from '@/src/presentation/components/Forms/GenericForm/types'
import { SelectorColor } from '../SelectorColor'

const pintar = (color = '') => {
  const setFieldValue = vi.fn()
  const args = {
    form: { setFieldValue } as unknown as FieldRenderArgs['form'],
    values: { color },
    context: { mode: 'create', divisa: 'EUR' },
    mode: 'create',
  } satisfies FieldRenderArgs
  return { ...renderConMantine(<SelectorColor {...args} />), setFieldValue }
}

describe('SelectorColor', () => {
  test('ofrece los ocho colores como radios con su nombre', () => {
    pintar()

    const grupo = screen.getByRole('radiogroup', { name: 'Color de la categoría' })
    expect(grupo).toBeInTheDocument()
    const nombres = screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))
    expect(nombres).toEqual(CLAVES_COLOR.map((c) => NOMBRE_COLOR[c]))
  })

  test('elegir un color por su nombre guarda su CLAVE', async () => {
    const { usuario, setFieldValue } = pintar()

    await usuario.click(screen.getByRole('radio', { name: 'Lila' }))

    expect(setFieldValue).toHaveBeenCalledWith('color', 'cat-3')
  })

  test('el elegido se anuncia como marcado, y solo él', () => {
    pintar('cat-5')

    expect(screen.getByRole('radio', { name: 'Ámbar' })).toBeChecked()
    expect(screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
  })

  test('pulsar el ya elegido lo desmarca: "sin color" es alcanzable', async () => {
    const { usuario, setFieldValue } = pintar('cat-5')

    await usuario.click(screen.getByRole('radio', { name: 'Ámbar' }))

    expect(setFieldValue).toHaveBeenCalledWith('color', '')
  })

  test('las chapas son botones de tipo button: elegir no envía el formulario', () => {
    pintar()
    for (const chapa of screen.getAllByRole('radio')) expect(chapa).toHaveAttribute('type', 'button')
  })
})
