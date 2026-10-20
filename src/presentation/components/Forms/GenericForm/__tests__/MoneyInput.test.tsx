/**
 * El input de dinero, visto como lo usa una persona: escribe texto en euros y
 * el formulario recibe un ENTERO en céntimos (regla dura 1), o `null` si lo
 * deja vacío.
 */

import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { renderConMantine } from '@/test/render'
import { MoneyInput } from '../MoneyInput'

/**
 * Lo monta controlado, como lo monta el `FieldRenderer`: el valor publicado
 * vuelve a entrar como `value`. Probarlo suelto escondería el caso que importa,
 * que el valor de vuelta no le pise el texto a quien está escribiendo.
 */
function Controlado({
  inicial = null,
  onChange,
}: {
  inicial?: number | null
  onChange: (v: number | null) => void
}) {
  const [valor, setValor] = useState<number | null>(inicial)
  return (
    <MoneyInput
      label="Importe"
      divisa="EUR"
      value={valor}
      onChange={(v) => {
        setValor(v)
        onChange(v)
      }}
    />
  )
}

const pintar = (inicial: number | null = null) => {
  const onChange = vi.fn()
  const r = renderConMantine(<Controlado inicial={inicial} onChange={onChange} />)
  return { ...r, onChange, input: screen.getByRole('textbox', { name: 'Importe' }) }
}

describe('lo que publica', () => {
  test.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234.56', 123456],
    ['12.345,67', 1234567],
    ['-45,90', -4590],
    ['7', 700],
    ['0,5', 50],
  ])('escribir "%s" publica %i céntimos', async (texto, centimos) => {
    const { usuario, input, onChange } = pintar()

    await usuario.type(input, texto)

    expect(onChange).toHaveBeenLastCalledWith(centimos)
  })

  test('nunca publica un decimal ni un texto, ni a medio escribir', async () => {
    const { usuario, input, onChange } = pintar()

    await usuario.type(input, '-1.234,5')

    for (const [valor] of onChange.mock.calls) {
      expect(valor === null || Number.isSafeInteger(valor)).toBe(true)
    }
  })

  test('vaciar el campo publica null, no 0', async () => {
    const { usuario, input, onChange } = pintar(4590)

    await usuario.clear(input)

    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  test('un texto que no es un importe publica null', async () => {
    const { usuario, input, onChange } = pintar()

    await usuario.type(input, 'abc')

    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  test('lo publicado nunca es un importe anterior que ya no se ve', async () => {
    // Si "12,3x" dejara publicado el 1230 de "12,3", el formulario guardaría
    // 12,30 € mientras la pantalla enseña otra cosa. Con null, la validación
    // de obligatorio lo señala.
    const { usuario, input, onChange } = pintar()

    await usuario.type(input, '12,3x')
    await usuario.tab()

    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})

describe('lo que enseña', () => {
  test('un valor inicial se pinta en euros, sin separador de miles', () => {
    // Sin miles a propósito: "1.234,56" es ambiguo al reparsear si alguien
    // borra la coma; "1234,56" no.
    const { input } = pintar(123456)
    expect(input).toHaveValue('1234,56')
  })

  test('al salir del campo el texto se normaliza', async () => {
    const { usuario, input } = pintar()

    await usuario.type(input, '1.234,5')
    await usuario.tab()

    expect(input).toHaveValue('1234,50')
  })

  test('al salir de un campo vacío queda vacío y publica null', async () => {
    const { usuario, input, onChange } = pintar()

    await usuario.type(input, '   ')
    await usuario.tab()

    expect(input).toHaveValue('')
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  test('un texto que no se entiende se deja tal cual al salir', async () => {
    // El error de validación tiene que señalar lo que la persona escribió, no
    // un valor inventado.
    const { usuario, input } = pintar()

    await usuario.type(input, '12,3x')
    await usuario.tab()

    expect(input).toHaveValue('12,3x')
  })

  test('mientras escribe no se reformatea: "1,5" no salta a "1,50"', async () => {
    const { usuario, input } = pintar()

    await usuario.type(input, '1,5')

    expect(input).toHaveValue('1,5')
  })

  test('lleva el símbolo de la divisa', () => {
    pintar()
    expect(screen.getByText('€')).toBeInTheDocument()
  })
})

describe('cambios desde fuera', () => {
  /** El valor lo controla el test, como lo haría un `form.reset` o una carga. */
  function DesdeFuera({ valor }: { valor: number | null }) {
    return <MoneyInput label="Importe" divisa="EUR" value={valor} onChange={() => {}} />
  }

  test('sin foco, un valor nuevo regenera el texto', () => {
    const { rerender } = renderConMantine(<DesdeFuera valor={100} />)

    rerender(<DesdeFuera valor={250} />)

    expect(screen.getByRole('textbox', { name: 'Importe' })).toHaveValue('2,50')
  })

  test('con el foco, un valor nuevo NO le pisa el texto a quien escribe', async () => {
    const { usuario, rerender } = renderConMantine(<DesdeFuera valor={null} />)
    const input = screen.getByRole('textbox', { name: 'Importe' })

    await usuario.type(input, '1,5')
    rerender(<DesdeFuera valor={999} />)

    expect(input).toHaveValue('1,5')
  })

  test('al soltar el foco, el valor de fuera que llegó mientras tanto se aplica', async () => {
    const { usuario, rerender } = renderConMantine(<DesdeFuera valor={null} />)
    const input = screen.getByRole('textbox', { name: 'Importe' })

    await usuario.click(input)
    rerender(<DesdeFuera valor={999} />)
    await act(async () => input.blur())

    expect(input).toHaveValue('9,99')
  })
})
