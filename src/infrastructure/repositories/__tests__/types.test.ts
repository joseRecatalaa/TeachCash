import { describe, expect, test } from 'vitest'
import { fromFieldErrors, RepositoryError } from '../types'

/**
 * El mensaje de cabecera de un error de validación. Es lo que sale en la
 * notificación del formulario, así que tiene que decir qué hacer.
 */
describe('fromFieldErrors', () => {
  test('con UN campo mal, la cabecera es su mensaje', () => {
    const error = fromFieldErrors({ importe: ['El importe debe ser mayor que cero'] })

    expect(error).toBeInstanceOf(RepositoryError)
    expect(error.message).toBe('El importe debe ser mayor que cero')
    expect(error.fieldErrors).toEqual({ importe: 'El importe debe ser mayor que cero' })
  })

  test('con varios, un genérico: enseñar uno al azar es peor que ninguno', () => {
    const error = fromFieldErrors({ importe: ['Mal'], fecha: ['Fecha no válida'] })

    expect(error.message).toBe('Revisa los campos marcados')
    expect(error.fieldErrors).toEqual({ importe: 'Mal', fecha: 'Fecha no válida' })
  })

  test('de cada campo, solo el primer mensaje; los campos sin mensajes no cuentan', () => {
    const error = fromFieldErrors({ nombre: ['Primero', 'Segundo'], notas: [], color: undefined })

    expect(error.fieldErrors).toEqual({ nombre: 'Primero' })
    expect(error.message).toBe('Primero')
  })

  test('un mensaje explícito manda sobre el calculado', () => {
    expect(fromFieldErrors({ a: ['x'] }, 'Otro').message).toBe('Otro')
  })
})
