/**
 * Repositorio del perfil: lo que la persona elige sobre sí misma.
 *
 * SOLO SERVIDOR. No implementa `EntityRepository`: es UNA fila por usuario, sin
 * listado ni borrado, y no pasa por el dispatcher genérico. Sus acciones van en
 * `perfil.actions.ts`.
 *
 * Hoy guarda solo el patrimonio inicial. Que no haya fila es "aún no lo ha
 * elegido", y por eso `getPatrimonioInicial` distingue `null` de `0`: el cero
 * es una respuesta, el `null` es la pregunta sin contestar.
 */

import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { IMPORTE_MAXIMO } from '@/src/types/limites.types'
import { RepositoryError } from './types'

/** El patrimonio inicial, en céntimos con signo, o `null` si aún no se ha elegido. */
export async function getPatrimonioInicial(userId: string): Promise<number | null> {
  const [fila] = await db
    .select({ inicial: profiles.initialNetWorth })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)
  return fila?.inicial ?? null
}

/**
 * Con signo y acotado por los dos lados: se puede empezar debiendo dinero, pero
 * no más de lo que cabe en un importe. Sin el tope, un valor fuera de `int4`
 * llega a Postgres y vuelve como error genérico en vez de como error del campo.
 */
const PatrimonioSchema = z.object({
  patrimonioInicial: z
    .number({ error: 'Escribe un importe' })
    .int('Escribe un importe')
    .min(-IMPORTE_MAXIMO, 'Importe demasiado grande')
    .max(IMPORTE_MAXIMO, 'Importe demasiado grande'),
})

/**
 * Guarda (o cambia) el patrimonio inicial. `values` llega del cliente sin
 * tipar y nunca se esparce sobre la tabla: se valida y se escribe campo a campo.
 */
export async function guardarPatrimonioInicial(
  userId: string,
  values: unknown,
): Promise<number> {
  const r = PatrimonioSchema.safeParse(values)
  if (!r.success) {
    throw new RepositoryError('Revisa el importe', {
      patrimonioInicial: r.error.issues[0]?.message ?? 'Importe no válido',
    })
  }

  const { patrimonioInicial } = r.data
  await db
    .insert(profiles)
    .values({ userId, initialNetWorth: patrimonioInicial })
    // Upsert por la clave primaria, que ES el usuario: el `where` del update lo
    // pone la propia fila en conflicto, y esa fila solo puede ser la suya.
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { initialNetWorth: patrimonioInicial, updatedAt: sql`now()` },
    })
  return patrimonioInicial
}
