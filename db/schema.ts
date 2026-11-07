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
  primaryKey,
  smallint,
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

/**
 * Como `soloSuyo`, pero sin escribir: cada usuario LEE lo suyo y nada más. Para
 * lo que solo debe escribir el servidor, porque lo calcula él: el progreso del
 * héroe (corrige las partidas) y sus compras (cobra las estrellas). Con
 * `soloSuyo`, cualquiera podría regalarse estrellas u objetos llamando a la API
 * REST de Supabase con su propia sesión. La app no se entera: su rol se salta RLS.
 */
export const soloLeerLoSuyo = (tabla: string) =>
  pgPolicy(`${tabla}_solo_leer_lo_suyo`, {
    for: 'select',
    to: authenticatedRole,
    using: sql`${authUid} = user_id`,
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

/**
 * Una fila por usuario con lo que la persona ELIGE sobre sí misma. Hoy, solo
 * el patrimonio con el que empieza.
 *
 * `patrimonio_inicial` no es un saldo guardado (regla dura 7): es el punto de
 * partida que escribe la persona, y el patrimonio sigue siendo derivado
 * —inicial + suma de movimientos—. Se descartó anotarlo como un ingreso
 * "Saldo inicial": inflaba los ingresos del mes en que se anotaba y los
 * gráficos de ingresos frente a gastos.
 *
 * Que NO haya fila significa "aún no lo ha elegido", y es lo que hace que la
 * portada lo pregunte. Por eso la columna es NOT NULL: el cero es una elección.
 */
export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    /** Céntimos CON SIGNO: se puede empezar debiendo dinero. */
    initialNetWorth: integer('initial_net_worth').notNull(),
    createdAt: createdAtColumn(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  () => [soloSuyo('profiles')],
).enableRLS()

/**
 * El progreso del Camino del héroe: una fila por usuario y nivel jugado.
 *
 * Solo el progreso: el CONTENIDO de los niveles vive en JSON en el repo
 * (`content/heroe/`) y `level_id` es su id estable (`ahorro/02-interes`).
 * Por eso no hay clave ajena hacia ningún nivel: si un nivel desaparece del
 * contenido, su fila se queda huérfana y simplemente no se enseña.
 *
 * Guarda la MEJOR marca, no la última: repetir un nivel puede subir las
 * estrellas pero nunca bajarlas (`greatest()` en el upsert). Lo que se ve en
 * el mapa —niveles hechos, estrellas totales, siguiente nivel— es derivado
 * (regla dura 7) y se calcula desde aquí.
 *
 * El invitado conserva su progreso al crear cuenta, porque el `user_id` no
 * cambia, y el job de limpieza lo borra por la cascada.
 */
export const heroProgress = pgTable(
  'hero_progress',
  {
    userId: userIdColumn(),
    levelId: text('level_id').notNull(),
    /** La mejor marca, 0-3. Cero = jugado y no superado. */
    stars: smallint('stars').notNull().default(0),
    /** Aciertos de la mejor partida. */
    bestScore: smallint('best_score').notNull().default(0),
    attempts: integer('attempts').notNull().default(0),
    /** La PRIMERA vez que se superó. `null` = aún no. Desbloquea el siguiente. */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.levelId] }),
    check('hero_progress_stars', sql`${t.stars} between 0 and 3`),
    soloLeerLoSuyo('hero_progress'),
  ],
).enableRLS()

/**
 * Lo que un usuario ha comprado en la tienda del héroe, una fila por objeto.
 *
 * `item_id` es el id estable del catálogo (`lib/tienda.ts`), sin clave ajena
 * porque el catálogo vive en código. `price_paid` se guarda porque las estrellas
 * gastadas son la suma de lo que se pagó: si cambiara con el precio del catálogo,
 * subir un precio le quitaría estrellas a quien ya compró.
 *
 * Las estrellas disponibles son derivadas (regla dura 7): las ganadas, de
 * `hero_progress`, menos esta suma.
 */
export const heroItems = pgTable(
  'hero_items',
  {
    userId: userIdColumn(),
    itemId: text('item_id').notNull(),
    pricePaid: integer('price_paid').notNull(),
    /** Lo lleva puesto. Hay uno por hueco; lo garantiza el repositorio. */
    equipped: boolean('equipped').notNull().default(true),
    createdAt: createdAtColumn(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemId] }),
    check('hero_items_price', sql`${t.pricePaid} >= 0`),
    soloLeerLoSuyo('hero_items'),
  ],
).enableRLS()

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert

export const CATEGORY_KINDS = ['income', 'expense'] as const
export type CategoryKind = (typeof CATEGORY_KINDS)[number]
