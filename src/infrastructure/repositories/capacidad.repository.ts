/**
 * El freno general: cuánto ocupa la base entera.
 *
 * SOLO SERVIDOR. La base del plan gratuito tiene un tamaño fijo, y si se llena
 * la aplicación cae para todo el mundo. Las cuotas por usuario lo hacen
 * difícil; esto lo hace imposible: pasado `MAX_TAMANO_BASE`, no se crean más
 * invitados, movimientos ni categorías. Leer, editar y borrar siguen
 * funcionando, y borrar es justo lo que libera sitio.
 *
 * Se mira en cada alta y no se cachea: `pg_database_size` lee el tamaño de los
 * ficheros, cuesta milisegundos, y una caché por proceso dejaría pasar altas
 * durante su vida en cada instancia.
 */

import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { registrarEvento } from '@/lib/log'
import { MAX_TAMANO_BASE } from '@/src/types/limites.types'
import { RepositoryError } from './types'

export const BASE_LLENA = 'Ahora mismo no se pueden guardar datos nuevos. Vuelve a probarlo más tarde.'

/** ¿Queda sitio en la base para datos nuevos? */
export async function hayEspacioEnLaBase(): Promise<boolean> {
  const [{ bytes }] = await db
    .select({ bytes: sql<number>`pg_database_size(current_database())`.mapWith(Number) })
    .from(sql`(select 1) as una`)
  if (bytes < MAX_TAMANO_BASE) return true
  // Es una alerta: o hay un ataque, o el plan se ha quedado pequeño.
  registrarEvento('capacidad', 'bloqueo', { motivo: 'base-llena' })
  return false
}

/** Lanza un error legible si la base está llena. */
export async function assertBaseConSitio(): Promise<void> {
  if (!(await hayEspacioEnLaBase())) throw new RepositoryError(BASE_LLENA)
}
