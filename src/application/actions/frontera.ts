/**
 * Los esquemas de la frontera: lo que una Server Action acepta de fuera.
 *
 * El tipo de TypeScript de un argumento no existe en tiempo de ejecución. Cada
 * export de un fichero 'use server' es un POST público (regla dura 3) y quien
 * lo llama puede mandar cualquier cosa: un `pageSize` de mil millones, un id
 * que es un objeto, un rango de fechas de diez mil años. Aquí se decide qué
 * pasa la puerta; los repositorios validan después el CONTENIDO de lo que se
 * escribe (los `values`), que es otra cosa.
 *
 * Fichero aparte y sin 'use server' porque un fichero 'use server' solo puede
 * exportar funciones async: un esquema exportado rompería el build.
 */

import { z } from 'zod'
import { daysBetween, isCivilDate, isPeriod } from '@/lib/dates'
import { NOT_FOUND, RepositoryError, type ListParams } from '@/src/infrastructure/repositories'
import {
  BUSQUEDA_MAX,
  ID_MAX,
  INFORME_MESES_MAX,
  SERIE_SALDO_MAX_DIAS,
  TAMANO_PAGINA_MAXIMO,
} from '@/src/types/limites.types'

/** Cuántos filtros de columna como mucho. Las tablas tienen menos columnas. */
const FILTROS_MAX = 20

const texto = (max: number) => z.string().max(max)

/**
 * Lo que manda la tabla. Los filtros llegan como texto o número (el data
 * provider no convierte los números) y salen siempre como texto: el
 * repositorio compara con igualdad y no necesita saber de qué tipo eran.
 */
const ListParamsSchema = z.object({
  filters: z
    .record(
      texto(ID_MAX),
      z.union([texto(BUSQUEDA_MAX), z.number().finite().transform(String)]).optional(),
    )
    .refine((f) => Object.keys(f).length <= FILTROS_MAX)
    .optional(),
  search: texto(BUSQUEDA_MAX).optional(),
  paginate: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(TAMANO_PAGINA_MAXIMO).optional(),
  sortBy: texto(ID_MAX).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
})

const IdSchema = z.string().min(1).max(ID_MAX)

const fechaCivil = z.string().refine(isCivilDate)

/**
 * Un rango de la serie de saldo: o los dos extremos o ninguno (entonces lo
 * decide el servidor), en orden y de como mucho `SERIE_SALDO_MAX_DIAS` días.
 * La serie tiene un punto por día: sin tope, una sola petición del año 1 al
 * 9999 tarda segundos y genera millones de objetos.
 */
const RangoSerieSchema = z
  .object({ desde: fechaCivil.optional(), hasta: fechaCivil.optional() })
  .refine((r) => (r.desde === undefined) === (r.hasta === undefined))
  .refine((r) => {
    if (r.desde === undefined || r.hasta === undefined) return true
    // Zod 4 evalúa este refine aunque las fechas ya hayan fallado su propia
    // comprobación, y `daysBetween` lanza con una fecha imposible.
    if (!isCivilDate(r.desde) || !isCivilDate(r.hasta)) return false
    const dias = daysBetween(r.desde, r.hasta) + 1
    return dias >= 1 && dias <= SERIE_SALDO_MAX_DIAS
  })

const PeriodoSchema = z.string().refine(isPeriod)

const MesesSchema = z.number().int().min(1).max(INFORME_MESES_MAX)

/**
 * Valida o lanza un `RepositoryError` con `mensaje`. Es un error de negocio, así
 * que `run` se lo enseña a quien llama tal cual, sin pasar por el genérico.
 */
function validar<T>(esquema: z.ZodType<T>, valor: unknown, mensaje: string): T {
  const r = esquema.safeParse(valor)
  if (!r.success) throw new RepositoryError(mensaje)
  return r.data
}

export const validarListParams = (params: unknown): ListParams =>
  validar(ListParamsSchema, params ?? {}, 'Parámetros de consulta no válidos')

/**
 * Un id que no es una cadena razonable no existe: "No encontrado", el mismo
 * mensaje que un id bien formado que no es tuyo (no se distingue, para no dar
 * pistas a quien prueba ids).
 */
export const validarId = (id: unknown): string => validar(IdSchema, id, NOT_FOUND)

export const validarRangoSerie = (rango: unknown): { desde?: string; hasta?: string } =>
  validar(RangoSerieSchema, rango ?? {}, 'Rango de fechas no válido')

export const validarPeriodo = (periodo: unknown): string =>
  validar(PeriodoSchema, periodo, 'Periodo no válido')

export const validarMeses = (meses: unknown): number =>
  validar(MesesSchema, meses, 'Número de meses no válido')
