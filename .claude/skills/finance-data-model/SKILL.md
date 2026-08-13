---
name: finance-data-model
description: Modelo de datos del gestor de finanzas personales — cuentas, movimientos, transferencias, categorías, presupuestos y recurrentes — con las convenciones de esquema y consulta del proyecto (Drizzle ORM). Úsala al diseñar o modificar tablas, escribir migraciones, escribir consultas de agregación (saldos, gasto por categoría, informes por periodo), o al decidir cómo modelar un concepto financiero nuevo. Cubre el aislamiento por usuario y el tratamiento de transferencias en los informes.
---

# Modelo de datos

## Entidades

```
User ─┬─< Account ──< Transaction >── Category
      ├─< Budget    (categoría + periodo + límite)
      └─< RecurringRule (plantilla que genera Transactions)
```

Cinco tablas cubren el 95% de un gestor personal. Resiste la tentación de
añadir más antes de que un caso de uso real lo pida.

## Reglas de esquema

1. **Los importes son `integer`**, en céntimos. Nunca `real`, `float`,
   `numeric` ni `decimal`. → skill `money-and-currency`
2. **La divisa vive en la cuenta**, no en el movimiento. Un movimiento hereda la
   divisa de su cuenta. Si algún día hay movimientos en divisa distinta a la de
   la cuenta, se añaden `originalAmount` + `originalCurrency` + tasa, sin tocar
   `amount`.
3. **Las fechas de movimiento son texto `YYYY-MM-DD`**, no timestamps. "Comí
   fuera el día 30" es una fecha civil; guardarla como instante UTC hace que en
   `Europe/Madrid` salte al mes siguiente. Los timestamps (`createdAt`) sí son
   instantes reales y van en epoch/UTC.
4. **Toda tabla de datos de usuario tiene `userId`** y toda consulta filtra por
   él **dentro** de la cláusula `where`, nunca filtrando el resultado después.
5. **Los saldos no se almacenan.** Se derivan de `SUM(amount)`. Con volúmenes de
   finanzas personales (miles de filas) sobra. Si algún día no sobra, ver
   "Saldos materializados" abajo.
6. **Borrado lógico en movimientos** (`deletedAt`), no físico: el usuario que
   borra sin querer un movimiento importado quiere recuperarlo, y el borrado
   duro rompe la deduplicación de importaciones.

## Esquema

```ts
// db/schema.ts
import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  /** checking | savings | card | cash | investment */
  type: text('type').notNull(),
  currency: text('currency').notNull().default('EUR'),
  /** Saldo al abrir la cuenta en la app, en céntimos. */
  openingBalance: integer('opening_balance').notNull().default(0),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (t) => [index('accounts_user_idx').on(t.userId)])

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  /** Jerarquía de un solo nivel: null = categoría raíz. */
  parentId: text('parent_id'),
  /** income | expense — una categoría no puede ser ambas. */
  kind: text('kind').notNull(),
  icon: text('icon'),
  color: text('color'),
}, (t) => [unique('categories_user_name').on(t.userId, t.name, t.parentId)])

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  categoryId: text('category_id').references(() => categories.id),
  /** Céntimos con signo: negativo = gasto, positivo = ingreso. */
  amount: integer('amount').notNull(),
  /** Fecha civil YYYY-MM-DD. Ver regla 3. */
  date: text('date').notNull(),
  description: text('description').notNull(),
  notes: text('notes'),
  /** Une las dos patas de una transferencia. Ver "Transferencias". */
  transferId: text('transfer_id'),
  /** Hash de deduplicación para movimientos importados. */
  importHash: text('import_hash'),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (t) => [
  // El índice que sostiene casi todas las consultas: usuario + rango de fechas.
  index('tx_user_date_idx').on(t.userId, t.date),
  index('tx_account_idx').on(t.accountId),
  unique('tx_import_hash').on(t.userId, t.importHash),
])

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  /** Periodo YYYY-MM. Un presupuesto por categoría y mes. */
  period: text('period').notNull(),
  /** Límite en céntimos, siempre positivo. */
  limitAmount: integer('limit_amount').notNull(),
}, (t) => [unique('budget_unique').on(t.userId, t.categoryId, t.period)])
```

`unique('tx_import_hash')` es lo que hace la deduplicación barata: reimportar el
mismo extracto dos veces choca contra el índice en lugar de duplicar. Ver skill
`bank-import-es`.

## Transferencias

**El concepto que más informes rompe.** Mover 500 € de la cuenta corriente al
ahorro no es un gasto ni un ingreso, pero ingenuamente aparece como ambos.

Modelo: **dos movimientos que comparten `transferId`**, uno negativo en origen y
otro positivo en destino, creados en la misma transacción de base de datos.

```ts
await db.transaction(async (tx) => {
  const transferId = crypto.randomUUID()
  await tx.insert(transactions).values([
    { ...base, id: crypto.randomUUID(), accountId: from, amount: -amount, transferId },
    { ...base, id: crypto.randomUUID(), accountId: to,   amount:  amount, transferId },
  ])
})
```

Consecuencias que hay que respetar en **toda** consulta de informe:

- Saldo de una cuenta: **incluye** transferencias.
- Gasto/ingreso por categoría, totales del mes, presupuestos: **excluyen**
  transferencias → `WHERE transfer_id IS NULL`.

Escríbelo como helper una sola vez, para no acordarte cada vez:

```ts
const isRealFlow = () => and(isNull(transactions.transferId), isNull(transactions.deletedAt))
```

Si la transferencia cruza divisas, las dos patas tienen importes distintos y no
suman cero. Es correcto: cada pata está en la divisa de su cuenta.

## Consultas

Toda consulta arranca por el usuario de la sesión:

```ts
// features/transactions/queries.ts
export async function getMonthlySpendByCategory(userId: string, period: string) {
  return db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),        // primero, siempre
      like(transactions.date, `${period}-%`), // 'YYYY-MM-%' — usa el índice
      isNull(transactions.transferId),        // sin transferencias
      isNull(transactions.deletedAt),
      lt(transactions.amount, 0),             // solo gastos
    ))
    .groupBy(transactions.categoryId)
}
```

- **Agrega en SQL, no en JavaScript.** Traerse 5.000 movimientos para sumarlos
  en memoria funciona hasta que deja de funcionar.
- `sum()` sobre un conjunto vacío devuelve `NULL`, no `0`. Trátalo
  (`?? 0`) o el importe llegará como `null` a la UI.
- Los `sql<number>` de Drizzle no validan nada en runtime: el tipo es una
  promesa tuya al compilador. Si la columna fuera float, el tipo diría `number`
  igual y el bug pasaría.

## Presupuestos

Un presupuesto es (categoría, periodo, límite). El "consumido" es derivado:

```
consumido = |SUM(amount)| de esa categoría en ese periodo, sin transferencias
```

Decisiones que hay que fijar de forma explícita porque no tienen respuesta obvia:

- **Categorías hijas**: ¿el presupuesto de "Comida" incluye "Restaurantes"?
  Recomendación: sí, agrega el subárbol. Si no, el usuario tiene que
  presupuestar cada hoja.
- **Sin presupuesto ≠ presupuesto 0.** Una categoría sin fila en `budgets` no
  está "al 100% consumida"; no tiene presupuesto. Distínguelo en la UI.
- **Periodos futuros**: el presupuesto de un mes que aún no ha empezado no debe
  mostrarse como cumplido.

## Recurrentes

Una `RecurringRule` es una plantilla (importe, categoría, cuenta, regla de
repetición, próxima fecha). **No generes movimientos futuros en la base de
datos**: proyecta en memoria para las vistas de previsión, y materializa el
movimiento solo cuando llega su fecha. Si no, editar la regla obliga a limpiar
filas ya generadas y a decidir qué hacer con las que el usuario ya tocó.

Guarda `lastGeneratedDate` en la regla: es lo que hace la generación idempotente
si se ejecuta dos veces el mismo día.

## Migraciones

- Genera con `drizzle-kit generate`, revisa el SQL a mano, y **súbelo al
  repositorio**. Nunca `drizzle-kit push` contra una base de datos con datos
  reales.
- Un cambio de tipo en una columna de importe (float → integer) necesita
  migración de datos con `ROUND(amount * 100)`, no solo cambio de tipo.
- SQLite tiene soporte limitado de `ALTER TABLE`; Drizzle lo resuelve con
  crear-copiar-renombrar. Revisa que la migración generada preserve índices.

## Saldos materializados

Solo si el `SUM` se vuelve lento de verdad (no antes). Entonces:

- La columna de saldo se actualiza **en la misma transacción** que el
  movimiento, nunca en un paso posterior.
- Debe existir un test que recalcule desde cero y compare. El día que
  diverjan, el usuario ve un saldo falso y deja de confiar en la aplicación.
- Añade un comando de reconciliación que recalcule todos los saldos.