/**
 * El registro de errores del servidor.
 *
 * Un error de Drizzle lleva en el mensaje los PARÁMETROS de la consulta: el
 * importe, la descripción, las notas. Eso es dato personal y financiero, y un
 * log no es sitio para él (se guarda más tiempo, lo lee más gente y acaba en
 * servicios de terceros). Lo que se comprueba aquí es que llega lo necesario
 * para depurar —qué falló y dónde— y nada de lo que la persona escribió.
 */

import { describe, expect, test, vi } from 'vitest'
import { DrizzleQueryError } from 'drizzle-orm'
import { describirError, registrarError } from '../log'

const IMPORTE = -987654
const DESCRIPCION = 'Farmacia de la calle Mayor'

/** Lo que lanza Drizzle cuando Postgres rechaza un insert. */
const errorDeDrizzle = () => {
  const causa = Object.assign(new Error('new row violates check constraint "chk"'), {
    code: '23514',
    detail: `Failing row contains (${IMPORTE}, ${DESCRIPCION}).`,
  })
  return new DrizzleQueryError(
    'insert into "transactions" ("amount", "description") values ($1, $2)',
    [IMPORTE, DESCRIPCION],
    causa,
  )
}

/** Todo lo que acabó en `console.error`, como un solo texto. */
const capturar = (accion: () => void): string => {
  const espia = vi.spyOn(console, 'error').mockImplementation(() => {})
  accion()
  return JSON.stringify(espia.mock.calls)
}

describe('registrarError', () => {
  test('no escribe los parámetros de la consulta ni el detalle de la fila', () => {
    const log = capturar(() => registrarError('entity.actions', errorDeDrizzle()))

    expect(log).not.toContain(String(Math.abs(IMPORTE)))
    expect(log).not.toContain(DESCRIPCION)
  })

  test('sí escribe lo que sirve para depurar: contexto, consulta, código y causa', () => {
    const log = capturar(() => registrarError('entity.actions', errorDeDrizzle()))

    expect(log).toContain('[entity.actions]')
    expect(log).toContain('insert into')
    expect(log).toContain('23514')
    expect(log).toContain('violates check constraint')
  })

  test('la pila se queda sin su primera línea, que repite el mensaje', () => {
    const descrito = describirError(errorDeDrizzle())
    expect(JSON.stringify(descrito)).not.toContain(DESCRIPCION)
    expect(descrito.pila?.every((l) => l.startsWith('at '))).toBe(true)
  })

  test('un error que no es Error se registra sin romperse', () => {
    expect(describirError('texto suelto')).toEqual({ nombre: 'string', mensaje: 'texto suelto' })
    expect(describirError(null)).toEqual({ nombre: 'null', mensaje: 'null' })
  })
})
