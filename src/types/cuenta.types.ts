/**
 * DTOs de Cuenta. Tres por entidad, siempre:
 *   ListDto  — lo que se pinta en la tabla
 *   SaveDto  — lo que se edita en el formulario (sin id)
 *   FormDto  — SaveDto + id, para la edición
 *
 * Que sean tres y no uno es lo que evita que la tabla arrastre campos que no
 * pinta y que el formulario reciba campos que no edita.
 *
 * Dos reglas duras se ven ya aquí (AGENTS.md):
 *   - Todo importe es un ENTERO EN CÉNTIMOS. `saldo: 123456` son 1.234,56 €.
 *     Nunca un decimal.
 *   - La divisa viaja al lado, en su propio campo: un importe sin divisa no
 *     significa nada.
 */

import type { Currency } from '@/lib/money'

export interface CuentaListDto {
  id: string
  nombre: string
  /** Enum como string: las opciones vienen del metadata. */
  tipo: string
  divisa: Currency
  /** Céntimos. Saldo derivado: apertura + movimientos vivos. */
  saldo: number
  /** Céntimos. */
  saldoInicial: number
  archivada: boolean
}

export interface CuentaSaveDto {
  nombre: string
  tipo: string
  divisa: Currency
  /** Céntimos. Negativo es válido: una tarjeta puede nacer en descubierto. */
  saldoInicial: number
}

export interface CuentaFormDto extends CuentaSaveDto {
  id: string
}
