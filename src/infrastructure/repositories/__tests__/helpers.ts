/**
 * Andamiaje común de los tests de repositorio.
 *
 * SQLite real con las migraciones reales aplicadas. Nada de mockear el ORM: los
 * bugs de agregación viven exactamente en el SQL que un mock no llega a
 * ejecutar. → skill `testing-finance`
 *
 * Lo único que se sustituye es de DÓNDE sale la conexión: `@/db` exporta una
 * única `db` compartida, y aquí se cambia por la base desechable del test.
 */

import { eq } from 'drizzle-orm'
import { categories, transactions } from '@/db/schema'
import type { Database } from '@/db/client'

/** Estado compartido con el mock de `@/db`. Se rellena en cada `beforeEach`. */
export type Harness = { db: Database; userId: string | null }

export const USER_A = 'user-a'
export const USER_B = 'user-b'

const FECHA_ALTA = new Date('2026-01-01T00:00:00Z')

export async function seedCategoria(
  db: Database,
  id: string,
  userId: string,
  overrides: Partial<typeof categories.$inferInsert> = {},
): Promise<string> {
  await db.insert(categories).values({
    id,
    userId,
    name: `Categoría ${id}`,
    kind: 'expense',
    createdAt: FECHA_ALTA,
    ...overrides,
  })
  return id
}

/**
 * Sin `categoryId` explícito en `overrides`, crea (si hace falta) y usa una
 * categoría por defecto del mismo usuario: un movimiento siempre necesita una
 * categoría, y a la mayoría de estos tests no les importa cuál.
 */
export async function seedMovimiento(
  db: Database,
  id: string,
  userId: string,
  overrides: Partial<typeof transactions.$inferInsert> = {},
): Promise<string> {
  const categoryId = overrides.categoryId ?? `cat-default-${userId}`

  if (!overrides.categoryId) {
    const existe = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1)
    if (existe.length === 0) {
      await db.insert(categories).values({
        id: categoryId,
        userId,
        name: 'Categoría por defecto',
        kind: 'expense',
        createdAt: FECHA_ALTA,
      })
    }
  }

  await db.insert(transactions).values({
    id,
    userId,
    amount: -1000,
    date: '2026-03-15',
    description: `Movimiento ${id}`,
    createdAt: FECHA_ALTA,
    ...overrides,
    categoryId,
  })
  return id
}
