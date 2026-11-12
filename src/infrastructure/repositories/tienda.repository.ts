/**
 * Repositorio de la tienda del héroe: las estrellas y lo que se compra con ellas.
 *
 * SOLO SERVIDOR. No implementa `EntityRepository` ni está en `REPOSITORIES`: no
 * es un CRUD, igual que el progreso del héroe. Sus acciones van en
 * `tienda.actions.ts`.
 *
 * Tres cosas se garantizan aquí y no en la interfaz (regla dura 6): que el precio
 * es el del catálogo (el cliente solo manda el id), que hay estrellas para
 * pagarlo y que hay un objeto equipado por hueco.
 */

import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { heroItems } from '@/db/schema'
import { CATALOGO, idsDelHueco, objetoPorId, type Hueco, type Objeto } from '@/lib/tienda'
import type { EstrellasDto, TiendaDto } from '@/src/types/tienda.types'
import { getEstrellasGanadas } from './heroe.repository'
import { bloquearUsuario, type Transaccion } from './transaccion'
import { NOT_FOUND, RepositoryError } from './types'

const unObjeto = (itemId: string): Objeto => {
  const objeto = objetoPorId(itemId)
  if (!objeto) throw new RepositoryError(NOT_FOUND)
  return objeto
}

const estrellas = (ganadas: number, gastadas: number): EstrellasDto => ({
  ganadas,
  gastadas,
  // Se puede quedar por debajo de cero si se retira un nivel del contenido: lo
  // gastado no se devuelve, y no hay estrellas negativas que enseñar.
  disponibles: Math.max(0, ganadas - gastadas),
})

const sumaGastada = sql<number>`coalesce(sum(${heroItems.pricePaid}), 0)`.mapWith(Number)

/**
 * El saldo de estrellas, para enseñarlo. `comprar` no lo usa para decidir: vuelve
 * a sumar lo gastado dentro de su transacción, con el candado puesto. Sin eso, dos
 * clics seguidos verían el mismo saldo y gastarían dos veces las mismas estrellas.
 */
export async function getEstrellas(userId: string): Promise<EstrellasDto> {
  const [ganadas, [fila]] = await Promise.all([
    getEstrellasGanadas(userId),
    db.select({ gastadas: sumaGastada }).from(heroItems).where(eq(heroItems.userId, userId)),
  ])
  return estrellas(ganadas, fila.gastadas)
}

/** Los ids de lo que lleva puesto. Un objeto retirado del catálogo no tiene dibujo y no cuenta. */
export async function getEquipo(userId: string): Promise<string[]> {
  const filas = await db
    .select({ itemId: heroItems.itemId })
    .from(heroItems)
    .where(and(eq(heroItems.userId, userId), eq(heroItems.equipped, true)))
  return filas.map((f) => f.itemId).filter((id) => objetoPorId(id) !== undefined)
}

export async function getTienda(userId: string): Promise<TiendaDto> {
  const [saldo, filas] = await Promise.all([
    getEstrellas(userId),
    db
      .select({ itemId: heroItems.itemId, equipped: heroItems.equipped })
      .from(heroItems)
      .where(eq(heroItems.userId, userId)),
  ])
  const compradas = new Map(filas.map((f) => [f.itemId, f.equipped]))
  return {
    estrellas: saldo,
    objetos: CATALOGO.map((o) => ({
      ...o,
      comprado: compradas.has(o.id),
      equipado: compradas.get(o.id) === true,
    })),
    equipo: CATALOGO.filter((o) => compradas.get(o.id) === true).map((o) => o.id),
  }
}

const quitarDelHueco = (tx: Transaccion, userId: string, hueco: Hueco) =>
  tx
    .update(heroItems)
    .set({ equipped: false })
    .where(and(eq(heroItems.userId, userId), inArray(heroItems.itemId, idsDelHueco(hueco))))

/**
 * Compra un objeto y se lo pone, sustituyendo a lo que hubiera en su hueco.
 *
 * Las ganadas se leen ANTES de la transacción: solo pueden subir (la mejor marca
 * no baja), así que un valor un instante viejo nunca deja gastar de más.
 */
export async function comprar(userId: string, itemId: string): Promise<TiendaDto> {
  const objeto = unObjeto(itemId)
  const ganadas = await getEstrellasGanadas(userId)

  await db.transaction(async (tx) => {
    await bloquearUsuario(tx, userId)

    const [ya] = await tx
      .select({ itemId: heroItems.itemId })
      .from(heroItems)
      .where(and(eq(heroItems.userId, userId), eq(heroItems.itemId, itemId)))
    if (ya) throw new RepositoryError('Ya tienes este objeto')

    const [{ gastadas }] = await tx
      .select({ gastadas: sumaGastada })
      .from(heroItems)
      .where(eq(heroItems.userId, userId))
    if (ganadas - gastadas < objeto.precio) {
      throw new RepositoryError('No tienes estrellas suficientes')
    }

    await quitarDelHueco(tx, userId, objeto.hueco)
    await tx.insert(heroItems).values({ userId, itemId, pricePaid: objeto.precio, equipped: true })
  })

  return getTienda(userId)
}

/** Se pone un objeto ya comprado. Uno que no es suyo responde como uno que no existe. */
export async function equipar(userId: string, itemId: string): Promise<TiendaDto> {
  const objeto = unObjeto(itemId)

  await db.transaction(async (tx) => {
    await bloquearUsuario(tx, userId)
    const [suyo] = await tx
      .select({ itemId: heroItems.itemId })
      .from(heroItems)
      .where(and(eq(heroItems.userId, userId), eq(heroItems.itemId, itemId)))
    if (!suyo) throw new RepositoryError(NOT_FOUND)

    await quitarDelHueco(tx, userId, objeto.hueco)
    await tx
      .update(heroItems)
      .set({ equipped: true })
      .where(and(eq(heroItems.userId, userId), eq(heroItems.itemId, itemId)))
  })

  return getTienda(userId)
}

/** Se quita un objeto y lo conserva. Baja el Poder; las estrellas no vuelven. */
export async function quitar(userId: string, itemId: string): Promise<TiendaDto> {
  unObjeto(itemId)
  const filas = await db
    .update(heroItems)
    .set({ equipped: false })
    .where(and(eq(heroItems.userId, userId), eq(heroItems.itemId, itemId)))
    .returning({ itemId: heroItems.itemId })
  if (filas.length === 0) throw new RepositoryError(NOT_FOUND)
  return getTienda(userId)
}
