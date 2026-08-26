'use server'

/**
 * Mutaciones de categorías. Solo acciones en este fichero.
 */

import { revalidatePath } from 'next/cache'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { categories, transactions } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { fail, field, invalid, NOT_FOUND, ok, optionalField, type ActionState } from '@/lib/forms'
import { CreateCategory, UpdateCategory } from './schema'

const revalidateCategories = () => {
  revalidatePath('/categorias')
  revalidatePath('/movimientos')
  revalidatePath('/informes')
}

/**
 * El UNIQUE de la tabla incluye `parent_id`, y SQLite considera dos NULL como
 * distintos: dos categorías raíz con el mismo nombre no chocarían nunca. Por eso
 * el duplicado se comprueba aquí y no se delega en la base de datos.
 */
async function nameTaken(
  userId: string,
  name: string,
  parentId: string | null,
  exceptId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        sql`lower(${categories.name}) = lower(${name})`,
        parentId === null ? isNull(categories.parentId) : eq(categories.parentId, parentId),
      ),
    )

  return rows.some((r) => r.id !== exceptId)
}

export async function createCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const parsed = CreateCategory.safeParse({
    name: field(formData, 'name'),
    kind: field(formData, 'kind'),
    parentId: optionalField(formData, 'parentId'),
    icon: optionalField(formData, 'icon'),
  })
  if (!parsed.success) return invalid(z.flattenError(parsed.error).fieldErrors)

  // La categoría padre tiene que ser de este usuario y del mismo tipo: si no,
  // "Restaurantes" podría acabar colgando de una categoría de ingresos.
  if (parsed.data.parentId) {
    const parent = await db
      .select({ id: categories.id, kind: categories.kind, parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.id, parsed.data.parentId), eq(categories.userId, session.user.id)))
      .limit(1)

    if (parent.length === 0) return invalid({ parentId: [NOT_FOUND] })
    if (parent[0].kind !== parsed.data.kind) {
      return invalid({ parentId: ['La categoría padre es de otro tipo'] })
    }
    // Jerarquía de un solo nivel: sin esto aparecen árboles que ninguna consulta
    // de informe sabe agregar.
    if (parent[0].parentId !== null) {
      return invalid({ parentId: ['Solo se admite un nivel de subcategorías'] })
    }
  }

  if (await nameTaken(session.user.id, parsed.data.name, parsed.data.parentId)) {
    return invalid({ name: ['Ya existe una categoría con ese nombre'] })
  }

  await db.insert(categories).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    parentId: parsed.data.parentId,
    icon: parsed.data.icon,
    color: null,
    createdAt: new Date(),
  })

  revalidateCategories()
  return ok('Categoría creada')
}

export async function updateCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const parsed = UpdateCategory.safeParse({
    id: field(formData, 'id'),
    name: field(formData, 'name'),
    parentId: optionalField(formData, 'parentId'),
    icon: optionalField(formData, 'icon'),
  })
  if (!parsed.success) return invalid(z.flattenError(parsed.error).fieldErrors)

  // Una categoría no puede ser su propia padre.
  if (parsed.data.parentId === parsed.data.id) {
    return invalid({ parentId: ['Una categoría no puede depender de sí misma'] })
  }

  if (await nameTaken(session.user.id, parsed.data.name, parsed.data.parentId, parsed.data.id)) {
    return invalid({ name: ['Ya existe una categoría con ese nombre'] })
  }

  const updated = await db
    .update(categories)
    .set({ name: parsed.data.name, parentId: parsed.data.parentId, icon: parsed.data.icon })
    .where(and(eq(categories.id, parsed.data.id), eq(categories.userId, session.user.id)))
    .returning({ id: categories.id })

  if (updated.length === 0) return fail(NOT_FOUND)

  revalidateCategories()
  return ok('Categoría actualizada')
}

/**
 * Solo se borra una categoría que no esté en uso. Borrarla con movimientos
 * dentro los dejaría sin clasificar en silencio, y el usuario no se enteraría
 * hasta ver un informe con un hueco.
 */
export async function deleteCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const id = field(formData, 'id')
  if (!id) return fail(NOT_FOUND)

  const [{ used }] = await db
    .select({ used: sql<number>`count(*)` })
    .from(transactions)
    .where(and(eq(transactions.categoryId, id), eq(transactions.userId, session.user.id)))

  if (used > 0) {
    return fail('La categoría tiene movimientos. Reasígnalos antes de borrarla.')
  }

  const [{ children }] = await db
    .select({ children: sql<number>`count(*)` })
    .from(categories)
    .where(and(eq(categories.parentId, id), eq(categories.userId, session.user.id)))

  if (children > 0) return fail('La categoría tiene subcategorías.')

  const deleted = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, session.user.id)))
    .returning({ id: categories.id })

  if (deleted.length === 0) return fail(NOT_FOUND)

  revalidateCategories()
  return ok('Categoría eliminada')
}
