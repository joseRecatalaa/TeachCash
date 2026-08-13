/**
 * Esquema de datos. Ver skill `finance-data-model`.
 *
 * Reglas que no se negocian:
 * - Los importes son `integer` en céntimos. Nunca real/float/numeric.
 * - La divisa vive en la CUENTA; un movimiento hereda la de la suya.
 * - Las fechas de movimiento son texto 'YYYY-MM-DD' (fecha civil).
 *   Los timestamps (createdAt, deletedAt) sí son instantes reales.
 * - Toda tabla de datos de usuario lleva `userId`.
 * - Los movimientos se borran de forma lógica (`deletedAt`), no física.
 */

import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    /** checking | savings | card | cash | investment */
    type: text('type').notNull(),
    currency: text('currency').notNull().default('EUR'),
    /** Saldo el día que la cuenta entra en la aplicación, en céntimos. */
    openingBalance: integer('opening_balance').notNull().default(0),
    /** Archivar no borra: los movimientos siguen contando en el histórico. */
    archivedAt: integer('archived_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('accounts_user_idx').on(t.userId)],
)

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
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id),
    /** Nullable: un movimiento sin clasificar es válido. */
    categoryId: text('category_id').references(() => categories.id),
    /** Céntimos CON SIGNO: negativo = gasto, positivo = ingreso. */
    amount: integer('amount').notNull(),
    /** Fecha civil 'YYYY-MM-DD'. Nunca un timestamp. */
    date: text('date').notNull(),
    description: text('description').notNull(),
    notes: text('notes'),
    /** Une las dos patas de una transferencia. Null = movimiento normal. */
    transferId: text('transfer_id'),
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
    index('tx_account_idx').on(t.accountId),
    index('tx_category_idx').on(t.categoryId),
    // Para encontrar la otra pata de una transferencia sin recorrer la tabla.
    index('tx_transfer_idx').on(t.transferId),
    unique('tx_import_hash').on(t.userId, t.importHash),
    unique('tx_idempotency_key').on(t.userId, t.idempotencyKey),
  ],
)

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert

export const ACCOUNT_TYPES = ['checking', 'savings', 'card', 'cash', 'investment'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const CATEGORY_KINDS = ['income', 'expense'] as const
export type CategoryKind = (typeof CATEGORY_KINDS)[number]
