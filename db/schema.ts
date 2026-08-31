/**
 * Esquema de datos. Ver skill `finance-data-model`.
 *
 * Reglas que no se negocian:
 * - Los importes son `integer` en céntimos. Nunca real/float/numeric.
 * - La aplicación trabaja en UNA sola divisa, y no se guarda: la decide
 *   `DIVISA_APP` en `lib/money.ts`. Por eso no hay columna de moneda en ninguna
 *   tabla — el día que haya más de una, se añade aquí y allí a la vez.
 * - Las fechas de movimiento son texto 'YYYY-MM-DD' (fecha civil).
 *   Los timestamps (createdAt) sí son instantes reales.
 * - Toda tabla de datos de usuario lleva `userId`.
 * - Los movimientos se borran de forma FÍSICA. No hay papelera ni deshacer:
 *   el modal de confirmación es la única red, y por eso es obligatorio.
 * - Todo movimiento tiene categoría. No existe el movimiento sin clasificar.
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
    /** income | expense — una categoría no puede ser las dos cosas. */
    kind: text('kind').notNull(),
    icon: text('icon'),
    /** Clave de la paleta categórica: 'cat-1'…'cat-8'. Ver `lib/colores.ts`. */
    color: text('color'),
    /**
     * Céntimos, positivo. Obligatorio si `kind = 'expense'`; siempre `null` en
     * ingreso. Nullable a nivel de columna a propósito: las categorías creadas
     * antes de esta funcionalidad no tienen uno hasta que alguien las edita —
     * la obligatoriedad es una regla de negocio del repositorio, no una
     * constraint de base.
     */
    monthlyBudget: integer('monthly_budget'),
    /**
     * Una categoría oculta no se ofrece en los `<Select>` de movimiento ni
     * aparece en Planificación mensual, pero sigue siendo el destino válido de
     * los movimientos que ya la usan. Las categorías de fábrica nacen ocultas
     * (ver `db/seed.mts`); las que crea el usuario, visibles.
     */
    hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    unique('categories_user_name').on(t.userId, t.name),
    index('categories_user_idx').on(t.userId),
  ],
)

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    /** Obligatoria: todo movimiento está clasificado, sin estado intermedio. */
    categoryId: text('category_id').notNull().references(() => categories.id),
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
