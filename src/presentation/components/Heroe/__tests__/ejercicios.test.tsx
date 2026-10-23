/**
 * Los dos ejercicios que no son elegir una opción: ordenar (con botones, no
 * arrastrando) y emparejar (una definición ya usada no se puede repetir).
 */

import { useState } from 'react'
import { describe, expect, test } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderConMantine } from '@/test/render'
import type { Pregunta } from '@/src/types/heroe.types'
import { Ejercicio } from '../ejercicios/Ejercicio'
import type { Respuesta } from '../reproductor/respuestas'

const base = { id: 'p', explicacion: 'Porque.' }

function Probar({ pregunta, inicial }: { pregunta: Pregunta; inicial: Respuesta }) {
  const [valor, setValor] = useState<Respuesta>(inicial)
  return (
    <>
      <Ejercicio pregunta={pregunta} valor={valor} alCambiar={setValor} bloqueado={false} />
      <output data-testid="valor">{JSON.stringify(valor)}</output>
    </>
  )
}

const valor = () => JSON.parse(screen.getByTestId('valor').textContent ?? 'null')

describe('Ordenar', () => {
  const pregunta: Pregunta = { ...base, tipo: 'ordenar', enunciado: 'Ordena', pasos: ['uno', 'dos', 'tres'] }

  test('subir y bajar cambian el orden; en los extremos no se puede', async () => {
    const { usuario } = renderConMantine(<Probar pregunta={pregunta} inicial={[2, 0, 1]} />)

    const pasos = () => within(screen.getByRole('list', { name: 'Ordena' })).getAllByRole('listitem')
    expect(pasos().map((p) => p.textContent)).toEqual(['1tres', '2uno', '3dos'])
    expect(screen.getByRole('button', { name: 'Subir: tres' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bajar: dos' })).toBeDisabled()

    await usuario.click(screen.getByRole('button', { name: 'Bajar: tres' }))
    await usuario.click(screen.getByRole('button', { name: 'Bajar: tres' }))

    expect(valor()).toEqual([0, 1, 2])
  })
})

describe('Emparejar', () => {
  const pregunta: Pregunta = {
    ...base,
    tipo: 'emparejar',
    enunciado: 'Empareja',
    pares: [
      { concepto: 'TAE', definicion: 'Lo que rinde de verdad' },
      { concepto: 'TIN', definicion: 'El tipo pactado' },
      { concepto: 'FGD', definicion: 'Protege 100.000 €' },
    ],
  }

  test('cada concepto con su desplegable; una definición elegida se deshabilita en los demás', async () => {
    const { usuario } = renderConMantine(<Probar pregunta={pregunta} inicial={[null, null, null]} />)

    await usuario.click(screen.getByRole('combobox', { name: 'TAE' }))
    await usuario.click(await screen.findByRole('option', { name: 'Lo que rinde de verdad' }))
    expect(valor()).toEqual([0, null, null])

    await usuario.click(screen.getByRole('combobox', { name: 'TIN' }))
    expect(await screen.findByRole('option', { name: 'Lo que rinde de verdad' })).toHaveAttribute('data-combobox-disabled', 'true')
  })
})
