'use client'

/**
 * El input de dinero.
 *
 * Este componente existe porque la regla dura 1 del proyecto no se puede
 * cumplir con un `<NumberInput>`: ese devuelve un `number` decimal, y en cuanto
 * un importe es decimal empiezan los descuadres de un céntimo que nadie sabe de
 * dónde salen.
 *
 * Aquí el contrato es estricto:
 *   - **hacia fuera** (`value` / `onChange`) circula SIEMPRE un entero en la
 *     unidad mínima de la divisa, o `null` si el campo está vacío o lo
 *     escrito no es un importe;
 *   - **hacia dentro** (lo que se ve y se teclea) circula texto, que es lo único
 *     que una persona escribe.
 *
 * El texto se guarda en estado propio mientras el campo tiene el foco: sin eso,
 * reformatear en cada tecla haría imposible escribir "1,5" (al teclear la coma
 * el valor se normalizaría a "1,50" y el cursor saltaría al final).
 */

import { useState } from 'react'
import { TextInput, type TextInputProps } from '@mantine/core'
import { formatAmountForInput, parseMoney } from '@/lib/format'
import { money, type Currency } from '@/lib/money'

export interface MoneyInputProps
  extends Omit<TextInputProps, 'value' | 'onChange' | 'defaultValue'> {
  /** Entero en la unidad mínima. `null` = vacío. */
  value: number | null
  onChange: (value: number | null) => void
  /** Decide la escala (EUR → 2 decimales) y el símbolo del sufijo. */
  divisa: Currency
}

const SIMBOLOS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' }

const aTexto = (value: number | null, divisa: Currency): string =>
  value === null ? '' : formatAmountForInput(money(value, divisa))

export function MoneyInput({ value, onChange, divisa, ...props }: MoneyInputProps) {
  const [texto, setTexto] = useState(() => aTexto(value, divisa))
  const [enfocado, setEnfocado] = useState(false)
  const [anterior, setAnterior] = useState({ value, divisa })

  // El valor puede cambiar por fuera: la carga de datos en modo edición, un
  // reset del formulario, o un cambio de la divisa del contexto. Cuando
  // pasa, el texto se regenera.
  //
  // Se ajusta DURANTE EL RENDER y no en un `useEffect` — es el patrón que
  // recomienda React para derivar estado de props, y evita el pintado
  // intermedio con el texto viejo que daría el efecto.
  //
  // Mientras el campo tiene el foco NO se pisa el texto: sería arrancarle las
  // teclas de las manos a quien está escribiendo.
  if (!enfocado && (anterior.value !== value || anterior.divisa !== divisa)) {
    setAnterior({ value, divisa })
    setTexto(aTexto(value, divisa))
  }

  /**
   * Publica un valor y lo apunta como ya conocido. Sin apuntarlo, al soltar el
   * foco el bloque de arriba lo tomaría por un cambio llegado de fuera y
   * regeneraría el texto: "12,3x" se convertía en "12,30" sin que nadie lo
   * pidiera.
   */
  const publicar = (siguiente: number | null) => {
    setAnterior({ value: siguiente, divisa })
    onChange(siguiente)
  }

  const handleChange = (siguiente: string) => {
    setTexto(siguiente)
    // Un texto a medio escribir ("1.", "-") o que no es un importe publica
    // `null`: todavía no hay importe. No es un error —la validación va al
    // salir del campo—, pero tampoco se deja publicado el importe anterior,
    // que el formulario guardaría mientras la pantalla enseña otra cosa.
    publicar(parseMoney(siguiente, divisa)?.amount ?? null)
  }

  const handleBlur = () => {
    setEnfocado(false)
    if (texto.trim() === '') {
      setTexto('')
      return
    }
    const importe = parseMoney(texto, divisa)
    // Al salir del campo el texto se normaliza a la forma canónica. Si no se
    // pudo parsear se deja tal cual: el error de validación tiene que poder
    // señalar lo que la persona escribió de verdad, no un valor inventado.
    if (importe) setTexto(aTexto(importe.amount, divisa))
  }

  return (
    <TextInput
      {...props}
      value={texto}
      inputMode="decimal"
      // No `type="number"`: los navegadores lo tratan como float y aplican la
      // coma/punto de SU locale, no de es-ES.
      onFocus={(e) => {
        setEnfocado(true)
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        handleBlur()
        props.onBlur?.(e)
      }}
      onChange={(e) => handleChange(e.currentTarget.value)}
      rightSection={
        <span aria-hidden style={{ opacity: 0.6, fontSize: '0.85em' }}>
          {SIMBOLOS[divisa] ?? divisa}
        </span>
      }
    />
  )
}
