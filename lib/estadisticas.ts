/**
 * Las siete estadísticas del héroe, de 0 a 100. Derivadas y nunca guardadas
 * (regla dura 7): se calculan en cada lectura desde el progreso, los movimientos
 * y lo que lleva puesto.
 *
 * Funciones puras: la lectura de los datos está en `cuadro.repository.ts`.
 *
 * El importe entra en céntimos y sale convertido en puntos, que no son dinero:
 * el redondeo de aquí no se traslada nunca a ninguna cifra de dinero.
 */

export type ClaveEstadistica = 'VIT' | 'DEF' | 'ATQ' | 'RES' | 'RIQ' | 'CON' | 'POD'

export interface Estadistica {
  clave: ClaveEstadistica
  nombre: string
  /** De dónde sale, para que se pueda leer sin saberse las reglas. */
  fuente: string
  valor: number
}

export interface DatosEstadisticas {
  /** Niveles superados y totales de cada mundo, por el id del mundo. */
  mundos: Readonly<Record<string, { hechos: number; total: number } | undefined>>
  /** Céntimos con signo: patrimonio de hoy menos el inicial. */
  ganancia: number
  /** Cuántos de los últimos `MESES_CONSTANCIA` meses cerraron en positivo. */
  mesesEnPositivo: number
  /** Lo que vale lo que lleva puesto, en estrellas. */
  precioEquipo: number
  maximoEquipable: number
}

export const MESES_CONSTANCIA = 12

/**
 * Riqueza va por tramos: [céntimos de ganancia, puntos].
 *
 * Ni un porcentaje ni los euros en lineal sirven. Con un porcentaje, quien
 * empieza en 0 € divide entre cero y quien empieza con 100.000 € apenas se
 * mueve; en lineal, los primeros 1.000 € de alguien no se notarían nunca.
 */
export const TRAMOS_RIQUEZA: readonly (readonly [number, number])[] = [
  [0, 0],
  [10_000, 20],
  [100_000, 40],
  [500_000, 60],
  [2_000_000, 80],
  [10_000_000, 100],
]

const proporcion = (parte: number, total: number) =>
  total <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((parte * 100) / total)))

/** Los puntos de Riqueza, interpolando dentro del tramo. Perder dinero es 0: no hay puntos negativos. */
export function puntosRiqueza(ganancia: number): number {
  if (ganancia <= 0) return 0
  for (let i = 1; i < TRAMOS_RIQUEZA.length; i++) {
    const [desde, puntosDesde] = TRAMOS_RIQUEZA[i - 1]
    const [hasta, puntosHasta] = TRAMOS_RIQUEZA[i]
    if (ganancia <= hasta) {
      return puntosDesde + Math.round(((ganancia - desde) * (puntosHasta - puntosDesde)) / (hasta - desde))
    }
  }
  return 100
}

export function calcularEstadisticas(d: DatosEstadisticas): Estadistica[] {
  const delMundo = (id: string) => {
    const mundo = d.mundos[id]
    return mundo ? proporcion(mundo.hechos, mundo.total) : 0
  }
  return [
    { clave: 'VIT', nombre: 'Vitalidad', fuente: 'Cursos de Salud financiera', valor: delMundo('salud') },
    { clave: 'DEF', nombre: 'Defensa', fuente: 'Cursos de Ahorro', valor: delMundo('ahorro') },
    { clave: 'ATQ', nombre: 'Ataque', fuente: 'Cursos de Inversión', valor: delMundo('inversion') },
    { clave: 'RES', nombre: 'Resistencia', fuente: 'Cursos de Deuda y crédito', valor: delMundo('deuda') },
    { clave: 'RIQ', nombre: 'Riqueza', fuente: 'Ganancia de patrimonio', valor: puntosRiqueza(d.ganancia) },
    {
      clave: 'CON',
      nombre: 'Constancia',
      fuente: `Meses con ganancia, de los últimos ${MESES_CONSTANCIA}`,
      valor: proporcion(d.mesesEnPositivo, MESES_CONSTANCIA),
    },
    { clave: 'POD', nombre: 'Poder', fuente: 'Lo que lleva equipado', valor: proporcion(d.precioEquipo, d.maximoEquipable) },
  ]
}
