/**
 * DTOs de los informes.
 *
 * No siguen el patrón de tres DTOs por entidad porque los informes no son un
 * CRUD: cada consulta tiene su propia forma de salida.
 *
 * Viven aquí y no junto a su repositorio porque los consumen los gráficos, que
 * están en `presentation`. La capa `types` es la única que todas las demás
 * pueden importar.
 *
 * Todos los importes son ENTEROS EN CÉNTIMOS con su divisa al lado, igual que
 * en el resto del proyecto (reglas duras 1 y 2).
 */

import type { CivilDate, Period } from '@/lib/dates'
import type { Currency } from '@/lib/money'

export interface GastoPorCategoriaDto {
  categoriaId: string
  categoriaNombre: string
  /** Céntimos, MAGNITUD POSITIVA. El gráfico pinta barras, no deudas. */
  total: number
  divisa: Currency
}

export interface TotalesPeriodoDto {
  periodo: Period
  /** Céntimos, positivo. */
  ingresos: number
  /** Céntimos, POSITIVO (magnitud del gasto), no el negativo de la base. */
  gastos: number
  /** Céntimos CON SIGNO: ingresos - gastos. */
  neto: number
  divisa: Currency
}

export interface PuntoSaldoDto {
  fecha: CivilDate
  /** Céntimos con signo. */
  saldo: number
  divisa: Currency
}
