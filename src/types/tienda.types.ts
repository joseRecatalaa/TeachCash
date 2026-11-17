import type { Objeto } from '@/lib/tienda'

/**
 * Las estrellas del usuario. Las ganadas salen del progreso y las gastadas de
 * sus compras: ninguna se guarda como saldo (regla dura 7).
 */
export interface EstrellasDto {
  ganadas: number
  gastadas: number
  /** Nunca negativo, aunque se retire un nivel del contenido y bajen las ganadas. */
  disponibles: number
}

export interface ObjetoTiendaDto extends Objeto {
  comprado: boolean
  equipado: boolean
}

export interface TiendaDto {
  estrellas: EstrellasDto
  objetos: ObjetoTiendaDto[]
  /** Los ids de lo que lleva puesto. */
  equipo: string[]
}
