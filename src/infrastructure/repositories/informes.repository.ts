/**
 * Repositorio de Informes: las agregaciones.
 *
 * SOLO SERVIDOR. No implementa `EntityRepository` porque los informes no son un
 * CRUD: son consultas de solo lectura con su propia forma. Sus hooks se escriben
 * a mano en `src/application/hooks/useInformes.ts` y sus acciones en
 * `informes.actions.ts`; nada de esto pasa por el dispatcher genérico.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * La regla que atraviesa este fichero entero (regla dura 7):
 *   el SALDO NO SE GUARDA. Es la suma de los movimientos vivos, y punto.
 * Por eso `getSaldoActual` y el último punto de `getSerieSaldo` tienen que dar
 * exactamente la misma cifra: hay un test que lo comprueba, y si algún día deja
 * de cumplirse es que alguien ha materializado un saldo por su cuenta.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Todos los importes son céntimos en la divisa de la aplicación (`DIVISA_APP`).
 *
 * Todo agregado lleva `.mapWith(Number)`. En Postgres, `sum` sobre `integer`
 * devuelve `bigint`, y el driver entrega `bigint` como TEXTO para no perder
 * precisión. Sin la conversión, `saldo + importe` concatena cadenas y la cifra
 * que sale en pantalla parece un número — que es lo peligroso.
 * Un saldo en céntimos cabe de sobra: `Number` es exacto hasta 2^53.
 */

import { and, asc, eq, gte, lt, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { categories, transactions } from '@/db/schema'
import {
  addMonths,
  compareDates,
  eachDay,
  monthRange,
  periodOf,
  today,
  type CivilDate,
  type Period,
} from '@/lib/dates'
import {
  INFORME_MESES_POR_DEFECTO,
  type GastoPorCategoriaDto,
  type PuntoSaldoDto,
  type TotalesPeriodoDto,
} from '@/src/types/informe.types'
import { getPatrimonioInicial } from './perfiles.repository'

// ─────────────────────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────────────────────

/** Las fechas de un mes, como rango: así puede usar el índice (user_id, date). */
const delMes = (periodo: Period) => {
  const { from, to } = monthRange(periodo)
  return and(gte(transactions.date, from), lte(transactions.date, to))
}

/** 'YYYY-MM' de una fecha civil. Lo calcula la base, sin pasar por ningún huso. */
const periodoDe = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`

const SUMA_INGRESOS = sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`
const SUMA_GASTOS = sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`

/**
 * En qué se va el dinero durante un periodo.
 *
 * Devuelve el importe como MAGNITUD POSITIVA: la base lo guarda negativo, pero
 * un gráfico de "gasto por categoría" con barras hacia abajo se lee mal. El
 * cambio de signo se hace aquí, una vez, y no en cada gráfico.
 */
export async function getGastoPorCategoria(
  userId: string,
  periodo: Period,
): Promise<GastoPorCategoriaDto[]> {
  const rows = await db
    .select({
      categoriaId: categories.id,
      categoriaNombre: categories.name,
      categoriaColor: categories.color,
      total: sql<number>`sum(${transactions.amount})`.mapWith(Number),
    })
    .from(transactions)
    // `innerJoin`: `category_id` es NOT NULL con clave ajena, así que todo
    // movimiento tiene su categoría y un `leftJoin` solo añadiría nulos que no
    // pueden darse (y `?? 'Sin categoría'` que nunca se pintarían).
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        delMes(periodo),
        lt(transactions.amount, 0),
      ),
    )
    .groupBy(categories.id)
    // Por magnitud del gasto, no alfabético ni por orden de la base.
    .orderBy(asc(sql`sum(${transactions.amount})`))

  return rows.map((r) => ({
    categoriaId: r.categoriaId,
    categoriaNombre: r.categoriaNombre,
    // El color sí puede faltar: es opcional en la categoría.
    categoriaColor: r.categoriaColor ?? '',
    total: Math.abs(r.total),
  }))
}

/**
 * Ingresos y gastos mes a mes.
 *
 * Solo desde el primer movimiento del usuario: si empezó en marzo, enero y
 * febrero no son meses de gasto cero, son meses que no existen. Los huecos
 * interiores sí se rellenan con cero — ahí el usuario ya estaba usando la app.
 */
export async function getIngresosVsGastos(
  userId: string,
  options: { meses?: number; hasta?: Period } = {},
): Promise<TotalesPeriodoDto[]> {
  const meses = options.meses ?? INFORME_MESES_POR_DEFECTO
  const hasta = options.hasta ?? periodOf(today())

  const rows = await db
    .select({
      periodo: periodoDe,
      ingresos: SUMA_INGRESOS.mapWith(Number),
      gastos: SUMA_GASTOS.mapWith(Number),
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .groupBy(periodoDe)

  if (rows.length === 0) return []

  const porPeriodo = new Map(rows.map((r) => [r.periodo, r]))
  const primeroConDatos = rows.map((r) => r.periodo).sort()[0]
  const inicioVentana = addMonths(hasta, -(meses - 1))
  const inicio = inicioVentana > primeroConDatos ? inicioVentana : primeroConDatos

  const resultado: TotalesPeriodoDto[] = []
  for (let p = inicio; p <= hasta; p = addMonths(p, 1)) {
    const row = porPeriodo.get(p)
    // Un mes sin fila es un hueco interior: cero, no "sin datos".
    const ingresos = row?.ingresos ?? 0
    const gastos = row?.gastos ?? 0
    resultado.push({ periodo: p, ingresos, gastos, neto: ingresos - gastos })
  }
  return resultado
}

/** Totales de un mes concreto. */
export async function getTotalesDelMes(
  userId: string,
  periodo: Period,
): Promise<TotalesPeriodoDto> {
  const [row] = await db
    .select({
      ingresos: SUMA_INGRESOS.mapWith(Number),
      gastos: SUMA_GASTOS.mapWith(Number),
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), delMes(periodo)))

  // Un agregado sin GROUP BY devuelve siempre UNA fila, y `coalesce` la deja
  // en cero: no hay caso "sin fila" que cubrir.
  const { ingresos, gastos } = row
  return { periodo, ingresos, gastos, neto: ingresos - gastos }
}

/**
 * El patrimonio: el inicial que eligió la persona más todo lo anotado.
 *
 * Sigue siendo derivado (regla dura 7). El inicial no es un saldo guardado sino
 * el punto de partida que escribe la persona (`profiles`); sin elegirlo, cuenta
 * como cero. Lo que no se guarda en ninguna parte es la suma.
 */
export async function getSaldoActual(userId: string): Promise<number> {
  const [[row], inicial] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(Number) })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
    getPatrimonioInicial(userId),
  ])
  // Siempre una fila (agregado sin GROUP BY), y `coalesce` evita el null.
  return (inicial ?? 0) + row.total
}

/**
 * Evolución del saldo, un punto POR DÍA.
 *
 * Los días sin movimiento heredan el saldo anterior. Una línea con puntos solo
 * donde hubo movimiento dibuja pendientes falsas entre fechas distantes.
 */
export async function getSerieSaldo(
  userId: string,
  options: { desde: CivilDate; hasta: CivilDate },
): Promise<PuntoSaldoDto[]> {
  // Punto de partida: el patrimonio inicial más todo lo anterior al rango. Sin
  // esto, una serie de los últimos tres meses arrancaría en cero y dibujaría un
  // salto que no existió; y sin el inicial, su último punto dejaría de
  // coincidir con `getSaldoActual`.
  const [[previo], inicial] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(Number) })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), lt(transactions.date, options.desde))),
    getPatrimonioInicial(userId),
  ])

  const deltas = await db
    .select({ fecha: transactions.date, total: sql<number>`sum(${transactions.amount})`.mapWith(Number) })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, options.desde),
        lte(transactions.date, options.hasta),
      ),
    )
    .groupBy(transactions.date)

  // `sum` de un grupo que existe nunca es null; el previo, por `coalesce`, tampoco.
  const porFecha = new Map(deltas.map((d) => [d.fecha, d.total]))
  let acumulado = (inicial ?? 0) + previo.total

  return eachDay(options.desde, options.hasta).map((fecha) => {
    acumulado += porFecha.get(fecha) ?? 0
    return { fecha, saldo: acumulado }
  })
}

/** Fecha del primer movimiento. Sirve para no pintar meses anteriores al alta. */
export async function getPrimeraFecha(userId: string): Promise<CivilDate | null> {
  const [row] = await db
    // ::text — un `date` sin columna detrás no pasa por el `mode: 'string'` del
    // esquema, y según el driver volvería como `Date` (regla dura 5).
    .select({ fecha: sql<string | null>`min(${transactions.date})::text` })
    .from(transactions)
    .where(eq(transactions.userId, userId))
  return row.fecha
}

/** Fecha del último movimiento. */
export async function getUltimaFecha(userId: string): Promise<CivilDate | null> {
  const [row] = await db
    // ::text, por lo mismo que en `getPrimeraFecha`.
    .select({ fecha: sql<string | null>`max(${transactions.date})::text` })
    .from(transactions)
    .where(eq(transactions.userId, userId))
  return row.fecha
}

/**
 * Rango por defecto de la evolución de saldo: los últimos `meses` meses, sin
 * empezar antes del primer movimiento.
 *
 * Termina en `max(hoy, último movimiento)`, no en hoy a secas. Las fechas se
 * aceptan hasta el "hoy" de la zona más adelantada (`latestToday`), que en
 * Madrid puede ser mañana; si la serie cortara en hoy, su último punto no
 * incluiría ese movimiento y dejaría de coincidir con `getSaldoActual` — y esa
 * coincidencia es la prueba de que el saldo es derivado (regla dura 7).
 */
export async function getRangoPorDefecto(
  userId: string,
  meses = INFORME_MESES_POR_DEFECTO,
  hoy: CivilDate = today(),
): Promise<{ desde: CivilDate; hasta: CivilDate }> {
  const inicioVentana = monthRange(addMonths(periodOf(hoy), -(meses - 1))).from
  const [primera, ultima] = await Promise.all([getPrimeraFecha(userId), getUltimaFecha(userId)])
  const desde = primera && compareDates(primera, inicioVentana) > 0 ? primera : inicioVentana
  const hasta = ultima && compareDates(ultima, hoy) > 0 ? ultima : hoy
  return { desde, hasta }
}
