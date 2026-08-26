/**
 * Lecturas de categorías. Sin 'use server'.
 */

import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { categories, type CategoryKind } from '@/db/schema'

export type CategoryView = {
  id: string
  name: string
  kind: CategoryKind
  parentId: string | null
  icon: string | null
  color: string | null
}

const toView = (r: typeof categories.$inferSelect): CategoryView => ({
  id: r.id,
  name: r.name,
  kind: r.kind as CategoryKind,
  parentId: r.parentId,
  icon: r.icon,
  color: r.color,
})

export async function listCategories(
  userId: string,
  options: { kind?: CategoryKind } = {},
): Promise<CategoryView[]> {
  const rows = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        options.kind ? eq(categories.kind, options.kind) : undefined,
      ),
    )
    .orderBy(asc(categories.name))

  return rows.map(toView)
}

export async function getCategory(userId: string, id: string): Promise<CategoryView | null> {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1)

  return rows[0] ? toView(rows[0]) : null
}

/** Índice id → categoría, para pintar tablas sin una consulta por fila. */
export async function categoryMap(userId: string): Promise<Map<string, CategoryView>> {
  const list = await listCategories(userId)
  return new Map(list.map((c) => [c.id, c]))
}
