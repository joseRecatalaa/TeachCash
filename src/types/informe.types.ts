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
 * Todos los importes son ENTEROS EN CÉNTIMOS (regla dura 1) en la divisa de la
 * aplicación, que no viaja en el DTO: la pone `DIVISA_APP` al formatear.
 */

import type { CivilDate, Period } from '@/lib/dates'

/**
 * La ventana por defecto de los informes de la portada: un año. La comparten
 * la serie de saldo y "ingresos frente a gastos", y la etiqueta que lo dice en
 * pantalla; si divergieran, el rótulo "últimos 12 meses" mentiría.
 */
export const INFORME_MESES_POR_DEFECTO = 12

/**
 * El mes más antiguo al que se puede ir con las flechas de Inicio. Es un tope
 * de NAVEGACIÓN, no de datos: la aplicación arrancó en 2026 y antes no hay nada
 * que enseñar. Por eso no se impone en el servidor —un movimiento de 2025 sigue
 * siendo válido y sigue sumando al patrimonio—.
 */
export const INICIO_MES_MINIMO: Period = '2026-01'

export interface GastoPorCategoriaDto {
  categoriaId: string
  categoriaNombre: string
  /** Clave de la paleta ('cat-1'…). Cadena vacía = se reparte por posición. */
  categoriaColor: string
  /** Céntimos, MAGNITUD POSITIVA. El gráfico pinta barras, no deudas. */
  total: number
}

export interface TotalesPeriodoDto {
  periodo: Period
  /** Céntimos, positivo. */
  ingresos: number
  /** Céntimos, POSITIVO (magnitud del gasto), no el negativo de la base. */
  gastos: number
  /** Céntimos CON SIGNO: ingresos - gastos. */
  neto: number
}

export interface PuntoSaldoDto {
  fecha: CivilDate
  /** Céntimos con signo. */
  saldo: number
}
