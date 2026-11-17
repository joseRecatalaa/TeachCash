/**
 * Repositorio del perfil: lo que la persona elige sobre sí misma.
 *
 * SOLO SERVIDOR. No implementa `EntityRepository`: es UNA fila por usuario, sin
 * listado ni borrado, y no pasa por el dispatcher genérico. Sus acciones van en
 * `perfil.actions.ts`.
 *
 * Guarda dos cifras del patrimonio, y no son la misma:
 *
 * - la BASE (`net_worth_without_movements`): patrimonio = base + suma de movimientos. La
 *   persona nunca la escribe; sale de restar los movimientos al total que pone.
 * - el PRIMERO (`first_net_worth`): el total que puso la primera vez. No cambia
 *   al editar y es contra lo que se mide el "desde que empezaste".
 *
 * Que no haya fila es "aún no lo ha elegido", y por eso las lecturas distinguen
 * `null` de `0`: el cero es una respuesta, el `null` es la pregunta sin
 * contestar.
 */

import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { profiles, transactions } from '@/db/schema'
import { IMPORTE_MAXIMO } from '@/src/types/limites.types'
import { RepositoryError } from './types'

/** Lo que cabe en un `integer` de Postgres: la base es total - movimientos y puede salirse. */
const INT4_MAXIMO = 2_147_483_647

/** El PRIMER patrimonio que eligió, en céntimos con signo, o `null` si aún no lo ha elegido. */
export async function getPatrimonioInicial(userId: string): Promise<number | null> {
  const [fila] = await db
    .select({ primero: profiles.firstNetWorth })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)
  return fila?.primero ?? null
}

/**
 * La base a la que se suman los movimientos, o `null` sin elegir. Solo para
 * quien calcula el saldo (`informes.repository.ts`): no es una cifra que se
 * enseñe.
 */
export async function getBasePatrimonio(userId: string): Promise<number | null> {
  const [fila] = await db
    .select({ base: profiles.netWorthWithoutMovements })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)
  return fila?.base ?? null
}

/**
 * Con signo y acotado por los dos lados: se puede deber dinero, pero no más de
 * lo que cabe en un importe. Sin el tope, un valor fuera de `int4` llega a
 * Postgres y vuelve como error genérico en vez de como error del campo.
 */
const PatrimonioSchema = z.object({
  patrimonio: z
    .number({ error: 'Escribe un importe' })
    .int('Escribe un importe')
    .min(-IMPORTE_MAXIMO, 'Importe demasiado grande')
    .max(IMPORTE_MAXIMO, 'Importe demasiado grande'),
})

/**
 * Fija el patrimonio de HOY: lo que se escribe es el total, movimientos
 * incluidos, y la base se recalcula para que base + movimientos dé justo eso.
 * La primera vez, ese total queda además como el primer patrimonio; las
 * siguientes, no se toca.
 *
 * `values` llega del cliente sin tipar y nunca se esparce sobre la tabla: se
 * valida y se escribe campo a campo. Devuelve el total guardado.
 */
export async function guardarPatrimonio(userId: string, values: unknown): Promise<number> {
  const r = PatrimonioSchema.safeParse(values)
  if (!r.success) {
    throw new RepositoryError('Revisa el importe', {
      patrimonio: r.error.issues[0]?.message ?? 'Importe no válido',
    })
  }
  const { patrimonio } = r.data

  // En una transacción para que la suma y la escritura vean lo mismo: un
  // movimiento que entrase entre las dos descuadraría el total por su importe.
  await db.transaction(async (tx) => {
    // Siempre una fila (agregado sin GROUP BY); `coalesce` evita el null y
    // `mapWith` el texto que devuelve postgres-js para un `sum`.
    const [{ movimientos }] = await tx
      .select({
        movimientos: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(Number),
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))

    const base = patrimonio - movimientos
    if (Math.abs(base) > INT4_MAXIMO) {
      throw new RepositoryError('Revisa el importe', {
        patrimonio: 'Importe demasiado lejos de lo anotado en movimientos',
      })
    }

    await tx
      .insert(profiles)
      .values({ userId, netWorthWithoutMovements: base, firstNetWorth: patrimonio })
      // Upsert por la clave primaria, que ES el usuario: el `where` del update lo
      // pone la propia fila en conflicto, y esa fila solo puede ser la suya. El
      // primer patrimonio no está en el `set`: solo se escribe al nacer la fila.
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { netWorthWithoutMovements: base, updatedAt: sql`now()` },
      })
  })
  return patrimonio
}
