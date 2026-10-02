/**
 * Esquema de datos. Ver skill `finance-data-model`.
 *
 * Reglas que no se negocian:
 * - Los importes son `integer` en céntimos. Nunca real/float/numeric.
 * - La aplicación trabaja en UNA sola divisa, y no se guarda: la decide
 *   `DIVISA_APP` en `lib/money.ts`. Por eso no hay columna de moneda en ninguna
 *   tabla — el día que haya más de una, se añade aquí y allí a la vez.
 * - Las fechas de movimiento son `date` de Postgres, leídas como texto
 *   'YYYY-MM-DD' (fecha civil, `mode: 'string'`). Nunca un `Date` de JS.
 *   Los timestamps (createdAt) sí son instantes reales.
 * - Toda tabla de datos de usuario lleva `userId`, con clave ajena a
 *   `auth.users` de Supabase y `on delete cascade`: borrar un usuario (o que el
 *   job de limpieza borre a un invitado caducado) se lleva sus datos.
 * - Toda tabla de datos de usuario lleva RLS. La app NO depende de ello —se
 *   conecta con un rol que se lo salta y filtra por `userId` en cada `where`
 *   (regla dura 4)—: es la red para la API REST de Supabase, que cualquiera
 *   puede llamar con la clave pública.
 * - Los movimientos se borran de forma FÍSICA. No hay papelera ni deshacer:
 *   el modal de confirmación es la única red, y por eso es obligatorio.
 * - Todo movimiento tiene categoría. No existe el movimiento sin clasificar.
 *
 * No hay tabla de cuentas: hay UNA cuenta implícita y su saldo es la suma de los
 * movimientos (regla dura 7 — los saldos son derivados, no se guardan).
 */

import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase'

/**
 * Los ids son `text` con un UUID que pone la base, y no `uuid`: así un id mal
 * formado que llegue del cliente simplemente no casa con nada y el repositorio
 * responde "No encontrado", en vez de que Postgres reviente con un error de
 * sintaxis de UUID que acabaría como "error inesperado".
 */
export const idColumn = () =>
  text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()::text`)

/** `uuid` porque es la clave ajena a `auth.users.id`, que lo es. */
export const userIdColumn = () =>
  uuid('user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' })

export const createdAtColumn = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow()

/**
 * Cada usuario ve y toca solo lo suyo. `(select auth.uid())` y no `auth.uid()`
 * a secas: así Postgres lo evalúa una vez por consulta y no una vez por fila.
 * Los invitados (usuarios anónimos de Supabase) también tienen el rol
 * `authenticated`, así que esta misma política los cubre.
 */
export const soloSuyo = (tabla: string) =>
  pgPolicy(`${tabla}_solo_suyo`, {
    for: 'all',
    to: authenticatedRole,
    using: sql`${authUid} = user_id`,
    withCheck: sql`${authUid} = user_id`,
  })

export const categories = pgTable(
  'categories',
  {
    id: idColumn(),
    userId: userIdColumn(),
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
     * (ver `asegurarCatalogoInicial`); las que crea el usuario, visibles.
     */
    hidden: boolean('hidden').notNull().default(false),
    createdAt: createdAtColumn(),
  },
  (t) => [
    unique('categories_user_name').on(t.userId, t.name),
    index('categories_user_idx').on(t.userId),
    check('categories_kind', sql`${t.kind} in ('income', 'expense')`),
    soloSuyo('categories'),
  ],
).enableRLS()

export const transactions = pgTable(
  'transactions',
  {
    id: idColumn(),
    userId: userIdColumn(),
    /**
     * Obligatoria: todo movimiento está clasificado, sin estado intermedio.
     * `cascade` es la red: `categoriasRepository.remove` ya borra los
     * movimientos a mano y dentro de una transacción.
     */
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    /** Céntimos CON SIGNO: negativo = gasto, positivo = ingreso. */
    amount: integer('amount').notNull(),
    /** Fecha civil 'YYYY-MM-DD'. Nunca un timestamp, nunca un `Date` de JS. */
    date: date('date', { mode: 'string' }).notNull(),
    description: text('description').notNull(),
    notes: text('notes'),
    /** Hash de deduplicación para movimientos importados (v2). */
    importHash: text('import_hash'),
    /** Clave del cliente: convierte el doble clic en un choque contra el índice. */
    idempotencyKey: text('idempotency_key'),
    createdAt: createdAtColumn(),
  },
  (t) => [
    // El índice que sostiene casi todas las consultas: usuario + rango de fechas.
    index('tx_user_date_idx').on(t.userId, t.date),
    index('tx_category_idx').on(t.categoryId),
    unique('tx_import_hash').on(t.userId, t.importHash),
    unique('tx_idempotency_key').on(t.userId, t.idempotencyKey),
    soloSuyo('transactions'),
  ],
).enableRLS()

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert

export const CATEGORY_KINDS = ['income', 'expense'] as const
export type CategoryKind = (typeof CATEGORY_KINDS)[number]
