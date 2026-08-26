/**
 * DTOs de Movimiento. Ver `cuenta.types.ts` para la convención de los tres DTOs.
 *
 * Dos reglas duras del proyecto se ven aquí:
 *   - `importe` es un entero en céntimos (regla 1).
 *   - `fecha` es una fecha civil 'YYYY-MM-DD', nunca un `Date` ni un instante
 *     (regla 5). Un `Date` aquí haría que un gasto del día 1 saltase al mes
 *     anterior según el huso de quien lo mire.
 */

import type { CivilDate } from '@/lib/dates'
import type { Currency } from '@/lib/money'

export interface MovimientoListDto {
  id: string
  fecha: CivilDate
  descripcion: string
  /** Céntimos CON SIGNO: negativo = gasto, positivo = ingreso. */
  importe: number
  divisa: Currency
  cuentaId: string
  cuentaNombre: string
  categoriaId: string
  categoriaNombre: string
  /** No vacío = es una pata de transferencia. No se edita como movimiento suelto. */
  transferenciaId: string
  notas: string
}

/**
 * En el formulario el importe se escribe SIN signo y el sentido se elige aparte
 * (`sentido`). Pedirle a alguien que teclee "-45,90" para anotar una compra es
 * pedirle que recuerde una convención interna de la base de datos.
 *
 * El signo lo resuelve el repositorio: `importe * (sentido === 'expense' ? -1 : 1)`.
 */
export interface MovimientoSaveDto {
  cuentaId: string
  categoriaId: string
  /** Céntimos, SIEMPRE POSITIVO. El signo lo pone `sentido`. */
  importe: number
  /** expense | income. */
  sentido: string
  fecha: CivilDate
  descripcion: string
  notas: string
  /**
   * Clave de idempotencia, solo en el ALTA. Se genera una por formulario
   * abierto: convierte el doble clic en un choque contra el índice único en vez
   * de en dos movimientos iguales. La edición la ignora.
   */
  idempotencyKey?: string
}

export interface MovimientoFormDto extends MovimientoSaveDto {
  id: string
}

/**
 * Una transferencia no es un movimiento: es DOS, atadas por `transferId`, que se
 * escriben en la misma transacción. Por eso tiene su propio DTO y su propia
 * acción, en vez de colgar de `MovimientoSaveDto`.
 */
export interface TransferenciaSaveDto {
  cuentaOrigenId: string
  cuentaDestinoId: string
  /** Céntimos, siempre positivo: cada pata le pone su signo. */
  importe: number
  fecha: CivilDate
  descripcion: string
  notas: string
}
