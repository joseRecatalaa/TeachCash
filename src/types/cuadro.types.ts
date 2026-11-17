import type { Estadistica } from '@/lib/estadisticas'
import type { EstrellasDto } from './tienda.types'

export interface CuadroDto {
  /** Céntimos con signo: el patrimonio de hoy. */
  patrimonio: number
  /** Céntimos con signo: patrimonio de hoy menos el inicial. */
  ganancia: number
  /** Si ya ha dicho con cuánto empieza. Sin eso, la ganancia es de un cero supuesto. */
  inicialElegido: boolean
  estrellas: EstrellasDto
  /** Los ids de lo que lleva puesto el héroe. */
  equipo: string[]
  estadisticas: Estadistica[]
}
