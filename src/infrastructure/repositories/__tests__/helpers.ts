/**
 * Andamiaje común de los tests de repositorio.
 *
 * Postgres real (PGlite) con las migraciones reales aplicadas. Nada de mockear el ORM: los
 * bugs de agregación viven exactamente en el SQL que un mock no llega a
 * ejecutar. → skill `testing-finance`
 *
 * Lo único que se sustituye es de DÓNDE sale la conexión: `@/db` exporta una
 * única `db` compartida, y aquí se cambia por la base desechable del test.
 */

import { expect } from 'vitest'
import { eq } from 'drizzle-orm'
import { categories, transactions } from '@/db/schema'
import type { Database } from '@/db/client'
import { USER_A, USER_B } from '@/db/testing'
import { RepositoryError } from '../types'

export { USER_A, USER_B }

const FECHA_ALTA = new Date('2026-01-01T00:00:00Z')
const IMPORTE_POR_DEFECTO = -1000

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
 *
 * La categoría por defecto es del TIPO que corresponde al signo: un ingreso en
 * una categoría de gasto es un dato que el repositorio nunca dejaría escribir,
 * y sembrarlo así escondería cualquier bug de una consulta que cruce por `kind`.
 */
export async function seedMovimiento(
  db: Database,
  id: string,
  userId: string,
  overrides: Partial<typeof transactions.$inferInsert> = {},
): Promise<string> {
  const kind = (overrides.amount ?? IMPORTE_POR_DEFECTO) > 0 ? 'income' : 'expense'
  const categoryId = overrides.categoryId ?? `cat-default-${kind}-${userId}`

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
        name: kind === 'income' ? 'Ingresos por defecto' : 'Gastos por defecto',
        kind,
        createdAt: FECHA_ALTA,
      })
    }
  }

  await db.insert(transactions).values({
    id,
    userId,
    amount: IMPORTE_POR_DEFECTO,
    date: '2026-03-15',
    description: `Movimiento ${id}`,
    createdAt: FECHA_ALTA,
    ...overrides,
    categoryId,
  })
  return id
}

/**
 * Espera que la promesa falle con un `RepositoryError` QUE SEÑALE `campo`.
 *
 * Un `rejects.toThrow()` a secas pasa con cualquier error —una FK, un typo en
 * el payload, un `TypeError`— y entonces el test "rechaza el importe" puede
 * estar en verde porque falla otra cosa. Esto ata el fallo a su causa.
 */
export async function esperarErrorDeCampo(
  promesa: Promise<unknown>,
  campo: string,
): Promise<RepositoryError> {
  const error = await promesa.then(
    () => {
      throw new Error(`Se esperaba un error en «${campo}» y la operación tuvo éxito`)
    },
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(RepositoryError)
  expect((error as RepositoryError).fieldErrors).toHaveProperty(campo)
  return error as RepositoryError
}
