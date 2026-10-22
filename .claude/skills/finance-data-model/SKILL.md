---
name: finance-data-model
description: Modelo de datos del gestor de finanzas personales — movimientos, categorías y presupuestos — con las convenciones de esquema y consulta del proyecto (Drizzle ORM). Úsala al diseñar o modificar tablas, escribir migraciones, escribir consultas de agregación (saldo, gasto por categoría, totales por periodo), o al decidir cómo modelar un concepto financiero nuevo. Cubre el aislamiento por usuario y por qué el saldo no se guarda.
---

# Modelo de datos

## Entidades

```
User ─┬─< Transaction >── Category
      └─< Budget    (categoría + periodo + límite)   ← no implementado
```

**Dos tablas.** `categories` y `transactions`, y ya está.

No hay tabla de cuentas: la aplicación tiene una cuenta implícita y su saldo es
la suma de los movimientos. No hay columna de moneda: hay una divisa y la decide
`DIVISA_APP` en `lib/money.ts`. No hay transferencias: un movimiento es un gasto
o un ingreso.

> Las tres estuvieron y se quitaron a propósito (ver "Decisiones abiertas" en
> `AGENTS.md`). Si alguien te pide "añadir la cuenta de ahorro" o "registrar un
> traspaso", no es un campo más: es volver a meter el eje que acoplaba el resto
> del modelo. Dilo antes de empezar.

Resiste la tentación de añadir tablas antes de que un caso de uso real lo pida.

## Reglas de esquema

1. **Los importes son `integer`**, en céntimos. Nunca `real`, `float`,
   `numeric` ni `decimal`. → skill `money-and-currency`
2. **La divisa no se guarda.** Sale de `DIVISA_APP`. El día que haya más de una,
   se añade una columna `currency` a `transactions` y un campo a los DTOs; la
   aritmética de `lib/money.ts` ya está lista y sigue lanzando al mezclar dos.
3. **Las fechas de movimiento son `date` de Postgres leídas como texto
   `YYYY-MM-DD`** (`mode: 'string'`), no timestamps. "Comí fuera el día 30" es
   una fecha civil; guardarla como instante UTC hace que en `Europe/Madrid`
   salte al mes siguiente. Los timestamps (`createdAt`) sí son instantes reales:
   `timestamptz`.
4. **Toda tabla de datos de usuario tiene `userId`** y toda consulta filtra por
   él **dentro** de la cláusula `where`, nunca filtrando el resultado después.
   `userId` es `uuid` con clave ajena a `auth.users` de Supabase y
   `on delete cascade`: borrar un usuario (o que el job de limpieza borre un
   invitado caducado) se lleva sus datos. Y lleva **RLS**
   (`soloSuyo('<tabla>')` y `.enableRLS()`): la app no depende de ello —se
   conecta con un rol que se lo salta—, pero es la red para la API REST de
   Supabase, que cualquiera puede llamar con la clave pública.
5. **El saldo no se almacena.** Se deriva de `SUM(amount)`. Con volúmenes de
   finanzas personales (miles de filas) sobra. Si algún día no sobra, ver
   "Saldos materializados" abajo.
6. **Borrado FÍSICO en movimientos**, no lógico: no hay `deletedAt` ni papelera.
   El modal de confirmación de la interfaz es la única red — si algún día hace
   falta deshacer un borrado por error, eso es una papelera nueva, no un intento
   de recuperar la fila.
7. **Todo movimiento tiene categoría.** `categoryId` es `NOT NULL`: no existe el
   estado "sin clasificar". Por eso el repositorio de categorías borra en cascada:
   borrar una categoría en uso borra también sus movimientos, porque no hay a
   dónde reclasificarlos ni papelera donde archivarlos.

## Esquema

La fuente de verdad es `db/schema.ts` (Postgres, `drizzle-orm/pg-core`). Esto es
un extracto; léelo allí antes de tocar nada.

```ts
// db/schema.ts — piezas comunes a toda tabla de datos de usuario
export const idColumn = () =>                     // text con UUID que pone la base
  text('id').primaryKey().default(sql`gen_random_uuid()::text`)
export const userIdColumn = () =>                 // uuid, FK a auth.users, cascade
  uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' })
export const createdAtColumn = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
export const soloSuyo = (tabla: string) => pgPolicy(`${tabla}_solo_suyo`, { … })

export const categories = pgTable('categories', {
  id: idColumn(),
  userId: userIdColumn(),
  name: text('name').notNull(),
  /** income | expense — una categoría no puede ser ambas (check en la base). */
  kind: text('kind').notNull(),
  icon: text('icon'),
  /** CLAVE de la paleta ('cat-1'…'cat-8'), no un color. Ver `lib/colores.ts`. */
  color: text('color'),
  /** Céntimos. Obligatorio en gasto (regla del repositorio), null en ingreso. */
  monthlyBudget: integer('monthly_budget'),
  hidden: boolean('hidden').notNull().default(false),
  createdAt: createdAtColumn(),
}, (t) => [
  unique('categories_user_name').on(t.userId, t.name),
  index('categories_user_idx').on(t.userId),
  check('categories_kind', sql`${t.kind} in ('income', 'expense')`),
  soloSuyo('categories'),
]).enableRLS()

export const transactions = pgTable('transactions', {
  id: idColumn(),
  userId: userIdColumn(),
  /** Obligatoria: no existe el movimiento sin clasificar (regla 7). */
  categoryId: text('category_id').notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  /** Céntimos con signo: negativo = gasto, positivo = ingreso. */
  amount: integer('amount').notNull(),
  /** Fecha civil YYYY-MM-DD. Ver regla 3. */
  date: date('date', { mode: 'string' }).notNull(),
  description: text('description').notNull(),
  notes: text('notes'),
  /** Hash de deduplicación para movimientos importados (v2). */
  importHash: text('import_hash'),
  /** Clave del cliente: convierte el doble clic en un choque contra el índice. */
  idempotencyKey: text('idempotency_key'),
  createdAt: createdAtColumn(),
}, (t) => [
  // El índice que sostiene casi todas las consultas: usuario + rango de fechas.
  index('tx_user_date_idx').on(t.userId, t.date),
  index('tx_category_idx').on(t.categoryId),
  unique('tx_import_hash').on(t.userId, t.importHash),
  unique('tx_idempotency_key').on(t.userId, t.idempotencyKey),
  soloSuyo('transactions'),
]).enableRLS()
```

**Por qué los ids son `text` y no `uuid`:** un id mal formado que llegue del
cliente no casa con nada y el repositorio responde "No encontrado". Con `uuid`,
Postgres reventaría con un error de sintaxis que acabaría como error genérico.
`user_id` sí es `uuid` porque es clave ajena a `auth.users.id`.

**El id y `createdAt` los pone la base.** No se generan en el repositorio.

Dos índices únicos que parecen decorativos y no lo son:

- `tx_import_hash` hace la deduplicación barata: reimportar el mismo extracto
  dos veces choca contra el índice en lugar de duplicar. Ver skill
  `bank-import-es`.
- `tx_idempotency_key` convierte el doble clic en Guardar en un choque en lugar
  de en dos movimientos iguales. En una aplicación de dinero eso no es una
  molestia: es dinero inventado.

Los dos aprovechan que **Postgres trata dos `NULL` como distintos** en un
`unique` (sin `NULLS NOT DISTINCT`), así que no estorban a los movimientos
creados sin clave.

## El saldo es derivado

Es la regla dura 7 y el sitio donde más fácil es romperla sin darse cuenta.

```ts
// La cifra grande de la portada.
const [row] = await db
  .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(Number) })
  .from(transactions)
  .where(eq(transactions.userId, userId))
```

A esa suma se le añade el **patrimonio inicial** (`profiles.initial_net_worth`,
`getPatrimonioInicial`), que es lo que la persona dice tener al empezar. No es
un saldo guardado: es un dato que escribe ella, y el patrimonio sigue siendo
inicial + movimientos, calculado cada vez. Sin fila en `profiles` cuenta como
cero (y la portada lo pregunta). Toda consulta de saldo nueva tiene que sumarlo,
o diverge de `getSaldoActual`. Se descartó anotarlo como un ingreso "Saldo
inicial": inflaba los ingresos del mes en que se anotaba.

Hay un test que comprueba que `getSaldoActual` y el último punto de
`getSerieSaldo` dan la misma cifra: dos caminos distintos hasta el mismo número.
Si alguna vez falla, es que alguien ha materializado un saldo por su cuenta.

> **Nota histórica.** Hasta que el borrado pasó a ser físico, había un filtro
> transversal (`isNull(transactions.deletedAt)`) que tenía que ir en TODA
> consulta de saldo o informe. Y antes de eso, con transferencias, hacían falta
> DOS de esos filtros, y la distinción ("el saldo las incluye, los informes las
> excluyen") era la fuente número uno de informes mal calculados: la cifra
> salía, solo que estaba mal. Hoy no hace falta ninguno — una fila en
> `transactions` siempre cuenta — pero si algún día vuelve un estado que hay que
> excluir (una papelera, transferencias), vuelve también ese filtro y hay que
> aplicarlo en TODAS las agregaciones, sin excepciones.

## Consultas

Toda consulta arranca por el usuario de la sesión:

```ts
export async function getGastoPorCategoria(userId: string, periodo: Period) {
  const { from, to } = monthRange(periodo)    // lib/dates.ts, sin un solo Date
  return db
    .select({
      categoriaId: categories.id,
      total: sql<number>`sum(${transactions.amount})`.mapWith(Number),
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(
      eq(transactions.userId, userId),        // primero, siempre
      gte(transactions.date, from),           // rango de fechas: usa el índice
      lte(transactions.date, to),
      lt(transactions.amount, 0),             // solo gastos
    ))
    .groupBy(categories.id)
}
```

- **`.mapWith(Number)` en TODO agregado.** postgres-js devuelve `sum()` y
  `count()` como texto (son `bigint`/`numeric`), y `sql<number>` no convierte
  nada: solo le promete un tipo al compilador. Sin `mapWith`, `'100' + '50'`
  da `'10050'` y el tipo sigue diciendo `number`.
- **Mes = rango de fechas**, no `like` sobre la fecha: la columna es `date`, no
  texto. Para agrupar por mes, `to_char(date, 'YYYY-MM')` en SQL.
- **Las búsquedas de texto, con `ilike`.** En Postgres `like` distingue
  mayúsculas.

- **`leftJoin` con categorías, no `innerJoin`.** `categoryId` es `NOT NULL` y la
  FK garantiza que la categoría existe, así que un `innerJoin` sería igual de
  correcto hoy — pero un `leftJoin` no puede dejar una fila fuera del informe en
  silencio, y esa garantía cuesta cero.
- **Agrega en SQL, no en JavaScript.** Traerse 5.000 movimientos para sumarlos
  en memoria funciona hasta que deja de funcionar.
- `sum()` sobre un conjunto vacío devuelve `NULL`, no `0`. Trátalo
  (`coalesce`, `?? 0`) o el importe llegará como `null` a la UI.
- Los `sql<number>` de Drizzle no validan nada en runtime: el tipo es una
  promesa tuya al compilador. Si la columna fuera float, o el driver devolviera
  texto (que lo hace: ver `mapWith` arriba), el tipo diría `number` igual y el
  bug pasaría.
- **El color de la categoría viaja con la agregación.** El gráfico no lo inventa
  por posición: el color sigue a la entidad, así que filtrar no puede repintar
  las categorías que quedan.

## Presupuestos (diseñado, sin implementar)

La tabla `budgets` no existe todavía. Cuando se implemente:

```ts
export const budgets = pgTable('budgets', {
  id: idColumn(),
  userId: userIdColumn(),
  categoryId: text('category_id').notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  /** Periodo YYYY-MM. Un presupuesto por categoría y mes. */
  period: text('period').notNull(),
  /** Límite en céntimos, siempre positivo. */
  limitAmount: integer('limit_amount').notNull(),
  createdAt: createdAtColumn(),
}, (t) => [
  unique('budget_unique').on(t.userId, t.categoryId, t.period),
  soloSuyo('budgets'),
]).enableRLS()
```

> Hoy ya existe un presupuesto **fijo** por categoría (`categories.monthly_budget`)
> que usa Planificación. Esta tabla sería el paso a presupuestos por mes.

El "consumido" es derivado: `|SUM(amount)|` de esa categoría en ese periodo,
sobre movimientos vivos.

Decisiones que hay que fijar de forma explícita porque no tienen respuesta obvia:

- **Categorías hijas**: ¿el presupuesto de "Comida" incluye "Restaurantes"?
  Recomendación: sí, agrega el subárbol. Si no, el usuario tiene que
  presupuestar cada hoja.
- **Sin presupuesto ≠ presupuesto 0.** Una categoría sin fila en `budgets` no
  está "al 100 % consumida"; no tiene presupuesto. Distínguelo en la UI.
- **Periodos futuros**: el presupuesto de un mes que aún no ha empezado no debe
  mostrarse como cumplido.

## Migraciones

- Genera con `drizzle-kit generate`, revisa el SQL a mano, y **súbelo al
  repositorio**. Nunca `drizzle-kit push` contra una base de datos con datos
  reales.
- Un cambio de tipo en una columna de importe (float → integer) necesita
  migración de datos con `ROUND(amount * 100)`, no solo cambio de tipo.
- `pnpm db:migrate` aplica contra Supabase por el **Session pooler**
  (`DATABASE_URL_MIGRATIONS`, puerto 5432); el Transaction pooler no admite lo
  que lanzan las migraciones.
- El plan gratuito de Supabase no da backups descargables: antes de una
  migración destructiva, haz un `pg_dump`.
- Las migraciones no tocan el esquema `auth`, que es de Supabase. Lo que haga
  falta ahí (como el job de `pg_cron` de `db/sql/limpieza-invitados.sql`) se
  ejecuta a mano en el SQL Editor.
- Si una migración usa algo nuevo de `auth`, añádelo al stub de `db/testing.ts`
  o los tests no podrán migrar.

## Saldos materializados

Solo si el `SUM` se vuelve lento de verdad (no antes). Entonces:

- La columna de saldo se actualiza **en la misma transacción** que el
  movimiento, nunca en un paso posterior.
- Debe existir un test que recalcule desde cero y compare. El día que
  diverjan, el usuario ve un saldo falso y deja de confiar en la aplicación.
- Añade un comando de reconciliación que recalcule todos los saldos.
