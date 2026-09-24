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
3. **Las fechas de movimiento son texto `YYYY-MM-DD`**, no timestamps. "Comí
   fuera el día 30" es una fecha civil; guardarla como instante UTC hace que en
   `Europe/Madrid` salte al mes siguiente. Los timestamps (`createdAt`) sí son
   instantes reales y van en epoch/UTC.
4. **Toda tabla de datos de usuario tiene `userId`** y toda consulta filtra por
   él **dentro** de la cláusula `where`, nunca filtrando el resultado después.
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

```ts
// db/schema.ts
import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  /** income | expense — una categoría no puede ser ambas. */
  kind: text('kind').notNull(),
  icon: text('icon'),
  /** CLAVE de la paleta ('cat-1'…'cat-8'), no un color. Ver `lib/colores.ts`. */
  color: text('color'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (t) => [
  unique('categories_user_name').on(t.userId, t.name),
  index('categories_user_idx').on(t.userId),
])

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  /** Obligatoria: no existe el movimiento sin clasificar (regla 7). */
  categoryId: text('category_id').notNull().references(() => categories.id),
  /** Céntimos con signo: negativo = gasto, positivo = ingreso. */
  amount: integer('amount').notNull(),
  /** Fecha civil YYYY-MM-DD. Ver regla 3. */
  date: text('date').notNull(),
  description: text('description').notNull(),
  notes: text('notes'),
  /** Hash de deduplicación para movimientos importados (v2). */
  importHash: text('import_hash'),
  /** Clave del cliente: convierte el doble clic en un choque contra el índice. */
  idempotencyKey: text('idempotency_key'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (t) => [
  // El índice que sostiene casi todas las consultas: usuario + rango de fechas.
  index('tx_user_date_idx').on(t.userId, t.date),
  index('tx_category_idx').on(t.categoryId),
  unique('tx_import_hash').on(t.userId, t.importHash),
  unique('tx_idempotency_key').on(t.userId, t.idempotencyKey),
])
```

Dos índices únicos que parecen decorativos y no lo son:

- `tx_import_hash` hace la deduplicación barata: reimportar el mismo extracto
  dos veces choca contra el índice en lugar de duplicar. Ver skill
  `bank-import-es`.
- `tx_idempotency_key` convierte el doble clic en Guardar en un choque en lugar
  de en dos movimientos iguales. En una aplicación de dinero eso no es una
  molestia: es dinero inventado.

Los dos aprovechan que **SQLite trata dos `NULL` como distintos**, así que no
estorban a los movimientos creados sin clave.

## El saldo es derivado

Es la regla dura 7 y el sitio donde más fácil es romperla sin darse cuenta.

```ts
// La cifra grande de la portada.
const [row] = await db
  .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
  .from(transactions)
  .where(eq(transactions.userId, userId))
```

No hay saldo de apertura en ninguna parte: el saldo arranca en cero el día del
primer movimiento. Para partir del saldo real del banco se anota un ingreso más
("Saldo inicial"). Es una decisión, no un olvido — es lo que hace imposible que
el saldo diverja de los movimientos que lo explican.

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
export async function getGastoPorCategoria(userId: string, periodo: string) {
  return db
    .select({
      categoriaId: categories.id,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(
      eq(transactions.userId, userId),        // primero, siempre
      like(transactions.date, `${periodo}-%`), // 'YYYY-MM-%' — usa el índice
      lt(transactions.amount, 0),             // solo gastos
    ))
    .groupBy(categories.id)
}
```

- **`leftJoin` con categorías, no `innerJoin`.** `categoryId` es `NOT NULL` y la
  FK garantiza que la categoría existe, así que un `innerJoin` sería igual de
  correcto hoy — pero un `leftJoin` no puede dejar una fila fuera del informe en
  silencio, y esa garantía cuesta cero.
- **Agrega en SQL, no en JavaScript.** Traerse 5.000 movimientos para sumarlos
  en memoria funciona hasta que deja de funcionar.
- `sum()` sobre un conjunto vacío devuelve `NULL`, no `0`. Trátalo
  (`coalesce`, `?? 0`) o el importe llegará como `null` a la UI.
- Los `sql<number>` de Drizzle no validan nada en runtime: el tipo es una
  promesa tuya al compilador. Si la columna fuera float, el tipo diría `number`
  igual y el bug pasaría.
- **El color de la categoría viaja con la agregación.** El gráfico no lo inventa
  por posición: el color sigue a la entidad, así que filtrar no puede repintar
  las categorías que quedan.

## Presupuestos (diseñado, sin implementar)

La tabla `budgets` no existe todavía. Cuando se implemente:

```ts
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
- SQLite tiene soporte limitado de `ALTER TABLE`; Drizzle lo resuelve con
  crear-copiar-renombrar. Revisa que la migración generada preserve índices.

## Saldos materializados

Solo si el `SUM` se vuelve lento de verdad (no antes). Entonces:

- La columna de saldo se actualiza **en la misma transacción** que el
  movimiento, nunca en un paso posterior.
- Debe existir un test que recalcule desde cero y compare. El día que
  diverjan, el usuario ve un saldo falso y deja de confiar en la aplicación.
- Añade un comando de reconciliación que recalcule todos los saldos.
