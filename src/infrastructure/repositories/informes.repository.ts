/**
 * Repositorio de Informes: las agregaciones.
 *
 * SOLO SERVIDOR. No implementa `EntityRepository` porque los informes no son un
 * CRUD: son consultas de solo lectura con su propia forma. Sus hooks se escriben
 * a mano en `src/application/hooks/useInformes.ts` y sus acciones en
 * `informes.actions.ts`; nada de esto pasa por el dispatcher genérico.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * La regla que atraviesa este fichero entero:
 *   - el SALDO de una cuenta INCLUYE las transferencias;
 *   - los INFORMES (gasto por categoría, ingresos vs gastos, totales del mes)
 *     las EXCLUYEN.
 * Mover 500 € al ahorro no es un gasto, aunque en la tabla se parezca mucho.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Solo se agrega UNA divisa por consulta (regla dura 2). Un eje que suma euros
 * y dólares no significa nada.
 */

import { and, asc, eq, gte, isNull, like, lt, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { accounts, categories, transactions } from '@/db/schema'
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
import type { Currency } from '@/lib/money'
import type {
  GastoPorCategoriaDto,
  PuntoSaldoDto,
  TotalesPeriodoDto,
} from '@/src/types/informe.types'

/** Movimientos que cuentan como flujo real: ni transferencias ni borrados. */
const flujoReal = () => and(isNull(transactions.transferId), isNull(transactions.deletedAt))

/** Movimientos vivos, transferencias incluidas. Para saldos. */
const vivos = () => isNull(transactions.deletedAt)

// ─────────────────────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────────────────────

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
  divisa: Currency = 'EUR',
): Promise<GastoPorCategoriaDto[]> {
  const rows = await db
    .select({
      categoriaId: categories.id,
      categoriaNombre: categories.name,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        // 'YYYY-MM-%' sobre una columna de texto: usa el índice (user_id, date).
        like(transactions.date, `${periodo}-%`),
        eq(accounts.currency, divisa),
        lt(transactions.amount, 0),
        flujoReal(),
      ),
    )
    .groupBy(categories.id)
    // Por magnitud del gasto, no alfabético ni por orden de la base.
    .orderBy(asc(sql`sum(${transactions.amount})`))

  return rows.map((r) => ({
    categoriaId: r.categoriaId ?? '',
    categoriaNombre: r.categoriaNombre ?? 'Sin categoría',
    total: Math.abs(r.total ?? 0),
    divisa,
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
  options: { meses?: number; hasta?: Period; divisa?: Currency } = {},
): Promise<TotalesPeriodoDto[]> {
  const divisa = options.divisa ?? 'EUR'
  const meses = options.meses ?? 12
  const hasta = options.hasta ?? periodOf(today())

  const rows = await db
    .select({
      periodo: sql<string>`substr(${transactions.date}, 1, 7)`,
      ingresos: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
      gastos: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(and(eq(transactions.userId, userId), eq(accounts.currency, divisa), flujoReal()))
    .groupBy(sql`substr(${transactions.date}, 1, 7)`)

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
    resultado.push({ periodo: p, ingresos, gastos, neto: ingresos - gastos, divisa })
  }
  return resultado
}

/** Totales de un mes concreto. Sin transferencias. */
export async function getTotalesDelMes(
  userId: string,
  periodo: Period,
  divisa: Currency = 'EUR',
): Promise<TotalesPeriodoDto> {
  const [row] = await db
    .select({
      ingresos: sql<number>`coalesce(sum(case when ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
      gastos: sql<number>`coalesce(sum(case when ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.userId, userId),
        like(transactions.date, `${periodo}-%`),
        eq(accounts.currency, divisa),
        flujoReal(),
      ),
    )

  const ingresos = row?.ingresos ?? 0
  const gastos = row?.gastos ?? 0
  return { periodo, ingresos, gastos, neto: ingresos - gastos, divisa }
}

/**
 * Evolución del saldo, un punto POR DÍA.
 *
 * Los días sin movimiento heredan el saldo anterior. Una línea con puntos solo
 * donde hubo movimiento dibuja pendientes falsas entre fechas distantes.
 *
 * Aquí SÍ entran las transferencias: mueven el saldo de verdad.
 */
export async function getSerieSaldo(
  userId: string,
  options: { desde: CivilDate; hasta: CivilDate; cuentaId?: string; divisa?: Currency },
): Promise<PuntoSaldoDto[]> {
  const divisa = options.divisa ?? 'EUR'
  const ambito = options.cuentaId ? eq(accounts.id, options.cuentaId) : undefined

  // Punto de partida: saldos de apertura + todo lo anterior al rango.
  const [apertura] = await db
    .select({ total: sql<number>`coalesce(sum(${accounts.openingBalance}), 0)` })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.currency, divisa), ambito))

  const [previo] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(accounts.currency, divisa),
        lt(transactions.date, options.desde),
        vivos(),
        ambito,
      ),
    )

  const deltas = await db
    .select({ fecha: transactions.date, total: sql<number>`sum(${transactions.amount})` })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(accounts.currency, divisa),
        gte(transactions.date, options.desde),
        lte(transactions.date, options.hasta),
        vivos(),
        ambito,
      ),
    )
    .groupBy(transactions.date)

  const porFecha = new Map(deltas.map((d) => [d.fecha, d.total ?? 0]))
  let acumulado = (apertura?.total ?? 0) + (previo?.total ?? 0)

  return eachDay(options.desde, options.hasta).map((fecha) => {
    acumulado += porFecha.get(fecha) ?? 0
    return { fecha, saldo: acumulado, divisa }
  })
}

/** Fecha del primer movimiento. Sirve para no pintar meses anteriores al alta. */
export async function getPrimeraFecha(userId: string): Promise<CivilDate | null> {
  const [row] = await db
    .select({ fecha: sql<string | null>`min(${transactions.date})` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), vivos()))
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
