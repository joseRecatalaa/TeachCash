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
import { anonimizarIp, describirError, registrarError, registrarEvento } from '../log'

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

describe('registrarEvento', () => {
  const capturarAviso = (accion: () => void) => {
    const espia = vi.spyOn(console, 'warn').mockImplementation(() => {})
    accion()
    return espia.mock.calls.map((c) => JSON.parse(String(c[0])))
  }

  test('una línea JSON por evento, con tipo, nombre, momento y resultado', () => {
    const [linea] = capturarAviso(() =>
      registrarEvento('login', 'fallo', { userId: 'u-1', motivo: 'credenciales' }),
    )
    expect(linea).toMatchObject({
      tipo: 'seguridad',
      evento: 'login',
      resultado: 'fallo',
      userId: 'u-1',
      motivo: 'credenciales',
    })
    expect(Number.isNaN(Date.parse(linea.momento))).toBe(false)
  })

  test('la IP se guarda recortada, nunca entera', () => {
    const [linea] = capturarAviso(() => registrarEvento('invitado', 'ok', { ip: '203.0.113.77' }))
    expect(linea.ip).toBe('203.0.113.0')
  })

  test('sin datos extra también se registra', () => {
    const [linea] = capturarAviso(() => registrarEvento('logout', 'ok'))
    expect(linea).toMatchObject({ evento: 'logout', resultado: 'ok' })
    expect(linea).not.toHaveProperty('ip')
  })
})

describe('anonimizarIp', () => {
  test.each([
    ['203.0.113.77', '203.0.113.0'],
    ['2001:db8:85a3:8d3:1319:8a2e:370:7348', '2001:db8:85a3::'],
    ['2001:db8::1', '2001:db8::'],
    ['::1', '::'],
    // eslint-disable-next-line sonarjs/no-hardcoded-ip -- IP de documentación (RFC 5737)
    ['::ffff:198.51.100.9', '198.51.100.0'],
    ['desconocida', 'desconocida'],
    ['no es una ip; drop table', 'desconocida'],
  ])('%s → %s', (ip, esperado) => {
    expect(anonimizarIp(ip)).toBe(esperado)
  })
})
