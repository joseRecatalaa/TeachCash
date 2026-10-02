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
import type {
  GastoPorCategoriaDto,
  PuntoSaldoDto,
  TotalesPeriodoDto,
} from '@/src/types/informe.types'

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
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
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
    categoriaId: r.categoriaId ?? '',
    categoriaNombre: r.categoriaNombre ?? 'Sin categoría',
    categoriaColor: r.categoriaColor ?? '',
    total: Math.abs(r.total ?? 0),
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
  const meses = options.meses ?? 12
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

  const ingresos = row?.ingresos ?? 0
  const gastos = row?.gastos ?? 0
  return { periodo, ingresos, gastos, neto: ingresos - gastos }
}

/**
 * El saldo de la cuenta: la suma de todo lo anotado.
 *
 * Arranca en cero el día del primer movimiento. Si hace falta partir del saldo
 * real del banco, se anota como un ingreso más ("Saldo inicial"): no hay un
 * campo de apertura escondido en ninguna parte, y esa es justo la razón de que
 * el saldo no pueda divergir de sus movimientos.
 */
export async function getSaldoActual(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(Number) })
    .from(transactions)
    .where(eq(transactions.userId, userId))
  return row?.total ?? 0
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
  // Punto de partida: todo lo anterior al rango. Sin esto, una serie de los
  // últimos tres meses arrancaría en cero y dibujaría un salto que no existió.
  const [previo] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(Number) })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), lt(transactions.date, options.desde)))

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

  const porFecha = new Map(deltas.map((d) => [d.fecha, d.total ?? 0]))
  let acumulado = previo?.total ?? 0

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
  return row?.fecha ?? null
}

/**
 * Rango por defecto de la evolución de saldo: los últimos `meses` meses, sin
 * empezar antes del primer movimiento.
 */
export async function getRangoPorDefecto(
  userId: string,
  meses = 12,
  hoy: CivilDate = today(),
): Promise<{ desde: CivilDate; hasta: CivilDate }> {
  const inicioVentana = monthRange(addMonths(periodOf(hoy), -(meses - 1))).from
  const primera = await getPrimeraFecha(userId)
  const desde = primera && compareDates(primera, inicioVentana) > 0 ? primera : inicioVentana
  return { desde, hasta: hoy }
}
