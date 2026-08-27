/**
 * Esquema de datos. Ver skill `finance-data-model`.
 *
 * Reglas que no se negocian:
 * - Los importes son `integer` en céntimos. Nunca real/float/numeric.
 * - La aplicación trabaja en UNA sola divisa, y no se guarda: la decide
 *   `DIVISA_APP` en `lib/money.ts`. Por eso no hay columna de moneda en ninguna
 *   tabla — el día que haya más de una, se añade aquí y allí a la vez.
 * - Las fechas de movimiento son texto 'YYYY-MM-DD' (fecha civil).
 *   Los timestamps (createdAt, deletedAt) sí son instantes reales.
 * - Toda tabla de datos de usuario lleva `userId`.
 * - Los movimientos se borran de forma lógica (`deletedAt`), no física.
 *
 * No hay tabla de cuentas: hay UNA cuenta implícita y su saldo es la suma de los
 * movimientos (regla dura 7 — los saldos son derivados, no se guardan).
 */

import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    /** Jerarquía de un solo nivel: null = categoría raíz. */
    parentId: text('parent_id'),
    /** income | expense — una categoría no puede ser las dos cosas. */
    kind: text('kind').notNull(),
    icon: text('icon'),
    /** Clave de la paleta categórica: 'cat-1'…'cat-8'. Ver `lib/colores.ts`. */
    color: text('color'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  // OJO: SQLite considera dos NULL como distintos, así que este UNIQUE no impide
  // dos categorías raíz con el mismo nombre (parent_id NULL). La comprobación de
  // duplicados en la raíz se hace en la acción, no se puede delegar aquí.
  (t) => [
    unique('categories_user_name').on(t.userId, t.name, t.parentId),
    index('categories_user_idx').on(t.userId),
  ],
)

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    /** Nullable: un movimiento sin clasificar es válido. */
    categoryId: text('category_id').references(() => categories.id),
    /** Céntimos CON SIGNO: negativo = gasto, positivo = ingreso. */
    amount: integer('amount').notNull(),
    /** Fecha civil 'YYYY-MM-DD'. Nunca un timestamp. */
    date: text('date').notNull(),
    description: text('description').notNull(),
    notes: text('notes'),
    /** Hash de deduplicación para movimientos importados (v2). */
    importHash: text('import_hash'),
    /** Clave del cliente: convierte el doble clic en un choque contra el índice. */
    idempotencyKey: text('idempotency_key'),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    // El índice que sostiene casi todas las consultas: usuario + rango de fechas.
    index('tx_user_date_idx').on(t.userId, t.date),
    index('tx_category_idx').on(t.categoryId),
    unique('tx_import_hash').on(t.userId, t.importHash),
    unique('tx_idempotency_key').on(t.userId, t.idempotencyKey),
  ],
)

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert

export const CATEGORY_KINDS = ['income', 'expense'] as const
export type CategoryKind = (typeof CATEGORY_KINDS)[number]
