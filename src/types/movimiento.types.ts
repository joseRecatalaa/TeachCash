/**
 * DTOs de Movimiento. Ver `categoria.types.ts` para la convención de los tres.
 *
 * Dos reglas duras del proyecto se ven aquí:
 *   - `importe` es un entero en céntimos (regla 1).
 *   - `fecha` es una fecha civil 'YYYY-MM-DD', nunca un `Date` ni un instante
 *     (regla 5). Un `Date` aquí haría que un gasto del día 1 saltase al mes
 *     anterior según el huso de quien lo mire.
 *
 * No llevan divisa: la aplicación trabaja en una sola y la decide `DIVISA_APP`
 * en `lib/money.ts`. Es el único sitio del que hay que tirar si algún día hay
 * más de una.
 */

import type { CivilDate } from '@/lib/dates'

export interface MovimientoListDto {
  id: string
  fecha: CivilDate
  descripcion: string
  /** Céntimos CON SIGNO: negativo = gasto, positivo = ingreso. */
  importe: number
  categoriaId: string
  categoriaNombre: string
  /** Clave de la paleta de la categoría. Cadena vacía = sin asignar. */
  categoriaColor: string
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
