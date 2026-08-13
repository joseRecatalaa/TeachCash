# Plan de implementación — v1

Estado: **aprobado, sin empezar**. Fecha: 2026-08-13.

Este documento es la referencia de ejecución. Cada fase tiene ficheros concretos,
decisiones ya cerradas y un criterio de verificación que hay que cumplir **antes**
de pasar a la siguiente. No se avanza con una fase en amarillo.

---

## 1. Objetivo

Una aplicación de finanzas personales de uso local, sin login, donde pueda:

- registrar mis cuentas (corriente, ahorro, tarjeta, efectivo) y sus saldos;
- anotar movimientos (gastos e ingresos) y transferencias entre mis cuentas;
- clasificarlos por categoría;
- ver **cuánto dinero tengo en total** (patrimonio, por divisa);
- ver gráficos: evolución del saldo, en qué se me va el dinero, ingresos vs gastos.

Los datos viven en un fichero SQLite local. Nada sale de la máquina.

### Alcance cerrado de la v1

| Dentro | Fuera (v2) |
|---|---|
| Cuentas: crear, editar, archivar | Presupuestos |
| Movimientos: crear, editar, borrar (lógico), filtrar | Importación de extractos (CSV / Norma 43) |
| Transferencias entre cuentas propias | Movimientos recurrentes |
| Categorías: catálogo por defecto + CRUD | Login real / multiusuario |
| Dashboard con patrimonio total y gráficos | Multidivisa con conversión |
| Informe mensual por categoría | Exportar a CSV |

La v2 no obliga a reescribir nada: el esquema ya contempla `transferId`,
`importHash` y `deletedAt`, y toda la capa de datos ya recibe un `userId`.

---

## 2. Decisiones cerradas

Se anotan aquí y se trasladan a `my-app/AGENTS.md` § "Decisiones abiertas" al terminar.

| Decisión | Elección | Motivo |
|---|---|---|
| Persistencia | **SQLite + Drizzle ORM**, driver `@libsql/client` | Cero infraestructura, binarios precompilados en Windows, migrable a Turso sin tocar consultas. Ver § 3.1 |
| Auth | **Sesión falsa**: `getSession()` devuelve un `userId` fijo | Aísla el cambio futuro a un único fichero, `lib/auth.ts` |
| Gráficos | **Recharts 3** | Ejes, tooltips y responsive resueltos; compatible con React 19 |
| Tests | **Vitest + fast-check**, SQLite en memoria | `lib/` y agregaciones: donde los fallos son silenciosos |
| Divisa | Solo **EUR** en la UI de la v1 | Pero la aritmética y los agregados ya agrupan por divisa; nunca se suma mezclando |
| Fechas | Texto `YYYY-MM-DD` para movimientos; epoch para `createdAt` | Regla dura 5 de AGENTS.md |

### Sesión falsa — cómo se hace bien

```ts
// lib/auth.ts — el ÚNICO sitio que sabe quién es el usuario.
const DEMO_USER_ID = 'local-user'

export type Session = { user: { id: string } }

// async a propósito: cuando llegue auth de verdad, ninguna firma cambia.
export async function getSession(): Promise<Session | null> {
  return { user: { id: DEMO_USER_ID } }
}

export async function requireSession(): Promise<Session> {
  const s = await getSession()
  if (!s) throw new Error('No autorizado')   // en acciones se devuelve estado, no se lanza
  return s
}
```

**El resto del código se escribe como si el login existiera**: toda consulta filtra
por `userId` en el `where`, toda acción llama a `getSession()` primero. No se
"simplifica" quitando el `userId` porque ahora mismo solo haya uno — eso es
exactamente el atajo que obliga a reescribir la capa de datos entera en v2.

---

## 3. Riesgos conocidos y cómo se sortean

Puntos donde esto se rompe de forma no obvia. Se comprueban en la Fase 0, no al final.

### 3.1 El driver de SQLite — resuelto en Fase 0

`better-sqlite3` **no sirve en esta máquina**. Al instalarlo, npm no encontró
binario precompilado para Node 24 y cayó a compilar desde fuente; `node-gyp` falló
porque no hay Visual Studio con el workload de C++. No es un problema de pnpm ni de
permisos: es que no hay toolchain de C++, y ponerlo son varios GB de instalación
para una dependencia.

Se descartaron por orden:

- **`node:sqlite`** (integrado en Node 24, verificado que funciona): `drizzle-orm`
  0.45.2 **no trae driver** para él. Solo existe `sqlite-proxy`, que no soporta
  transacciones — y las transferencias las necesitan de forma innegociable.
- **`@libsql/client`** ← **elegido**. Bindings nativos distribuidos como
  dependencias opcionales **ya compiladas** por plataforma
  (`@libsql/win32-x64-msvc`): no compila nada. Driver de primera clase en Drizzle
  (`drizzle-orm/libsql/node`) con transacciones reales. Y es el mismo cliente que
  habla con Turso, así que "migrable a Turso" pasa de promesa a cambiar una URL.

Verificado en Fase 0 con una prueba real, no con un `import`: escritura de las dos
patas de una transferencia en una transacción, rollback al fallar, y suma cero.

`pnpm approve-builds` sigue haciendo falta, pero para **esbuild** (lo necesita
vitest), no para el driver. Queda anotado en `pnpm-workspace.yaml`
(`onlyBuiltDependencies`), que se commitea — así no depende de que alguien
conteste un prompt interactivo.

### 3.2 Resto de riesgos

1. **Bindings nativos + Turbopack.** Hay que declarar
   `serverExternalPackages: ['@libsql/client']` en `next.config.ts` o el bundler
   intentará empaquetar el `.node` y romperá el build.
   (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`)
2. **Espacio no separable antes del `€`.** `Intl.NumberFormat('es-ES')` produce
   `1.234,56 €` con U+00A0 (o U+202F según ICU). El `parseMoney` debe limpiarlo;
   el test de ida y vuelta formatear→parsear es el que lo detecta.
5. **`params` es una promesa** en Next 16. Olvidar el `await` no falla: da
   `undefined` y una consulta vacía. Se revisa en cada `[id]/page.tsx`.
6. **Recompilación en dev abre conexiones nuevas.** El cliente de base de datos se
   cachea en `globalThis` o cada HMR deja un handle abierto sobre el fichero.

---

## 4. Fases

### Fase 0 — Base técnica ✅ COMPLETADA

**Qué:** dejar el proyecto capaz de abrir una base de datos y ejecutar tests.

Desde `my-app/`:

```bash
pnpm add drizzle-orm @libsql/client zod recharts
pnpm add -D drizzle-kit vitest fast-check cross-env
```

`onlyBuiltDependencies: [esbuild]` va en `pnpm-workspace.yaml` **antes** de
instalar: evita el prompt interactivo de `pnpm approve-builds` y queda versionado.

Ficheros:

- `my-app/next.config.ts` → añadir `serverExternalPackages: ['@libsql/client']`.
  **No** se activa `cacheComponents`: en finanzas casi nada debe cachearse y los
  datos son por usuario. Sin caché, cada petición lee datos frescos, que es lo
  correcto aquí.
- `my-app/.gitignore` → añadir `/data/`, `*.db`, `*.db-shm`, `*.db-wal`.
- `my-app/vitest.config.mts` → `environment: 'node'` y
  `resolve.tsconfigPaths: true` para el alias `@/`. Extensión `.mts` a propósito:
  con `.ts` el cargador nativo de Vite avisa de ESM en un fichero tratado como
  CommonJS. El plugin `vite-tsconfig-paths` **no** hace falta: Vite 7 resuelve los
  paths del tsconfig de forma nativa.
- `my-app/package.json` → scripts nuevos:
  ```json
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:tz": "cross-env TZ=Pacific/Kiritimati vitest run",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "node db/migrate.ts",
  "db:seed": "node db/seed.ts",
  "db:studio": "drizzle-kit studio"
  ```
  `node db/*.ts` funciona directo: Node 24 hace type stripping. Los scripts de
  `db/` usan **imports relativos**, no `@/`, porque fuera de Next no hay alias.
  (`test:tz` necesita `cross-env` en Windows; si molesta, se deja el script fuera
  y se ejecuta a mano.)

**Verificación (hecha):** un script temporal abrió `file:./data/tmp-check.db`,
escribió las dos patas de una transferencia dentro de una `db.transaction`,
comprobó que un fallo a mitad hace rollback completo y que las dos patas suman
cero. `pnpm test` y `pnpm typecheck` en verde. El script se borró.

Probar el driver con un `import` no habría valido: el import funciona y es la
transacción lo que se rompe con el driver equivocado.

---

### Fase 1 — `lib/`: dinero, formato, fechas

**Qué:** el núcleo aritmético. Es la fase con más test por línea de todo el proyecto,
porque un fallo aquí corrompe todos los datos aguas abajo.

- `lib/money.ts` — tipo `Money`, `money()`, `add`, `sub`, `neg`, `mul`, `sum`,
  `allocate`. Tal cual la skill `money-and-currency`. `money()` valida
  `Number.isSafeInteger` y lanza: esa red es la que caza el día que alguien meta
  un `precio * 1.21` sin redondear.
- `lib/format.ts` — `formatMoney` (con caché de `Intl.NumberFormat`), `parseMoney`,
  `formatDate`, `formatPeriod`. **Separación:** `money.ts` es aritmética pura y no
  importa de `format.ts`; `format.ts` importa de `money.ts`. (La skill muestra los
  tests importando ambos desde `@/lib/money`; se ajustan los imports, no la
  estructura.)
- `lib/dates.ts` — trabajo con fechas civiles como **cadenas**, nunca `Date`:
  ```ts
  export type CivilDate = string        // 'YYYY-MM-DD'
  export type Period = string           // 'YYYY-MM'
  today(): CivilDate                    // usa Intl con timeZone 'Europe/Madrid'
  periodOf(d: CivilDate): Period
  monthRange(p: Period): { from: CivilDate; to: CivilDate }
  lastNMonths(n: number, from?: Period): Period[]
  eachDay(from: CivilDate, to: CivilDate): CivilDate[]
  addMonths(p: Period, n: number): Period
  ```
  `addMonths` y `monthRange` se calculan con aritmética de enteros sobre año/mes,
  **no** con `new Date(y, m+1, 0)`, para que el día 31 en un mes de 30 y el 29 de
  febrero no dependan del huso horario del proceso.

**Tests** (`lib/__tests__/`):

- Propiedades con fast-check: `sum(allocate(t, w)) === t`;
  `parseMoney(formatMoney(m)) === m`; `sub(add(a,b),b) === a`.
- Casos límite obligatorios de `testing-finance`: cero y `-0`; negativo con
  redondeo; reparto entre 3, entre 7 y con peso 0; lista vacía; divisas distintas
  → lanza.
- Fechas: día 31 en mes de 30; 29 de febrero; movimiento del día 1 y del último
  del mes caen en su mes; días de cambio de hora (marzo y octubre) no saltan;
  la suite pasa con `TZ=Pacific/Kiritimati`.

**Verificación:** `pnpm test` en verde, incluida la variante con `TZ` forzado, y
`node .claude/skills/money-and-currency/scripts/audit-money.mjs my-app` sin hallazgos.

---

### Fase 2 — `db/`: esquema, migraciones, semilla

**Qué:** la base de datos, con las reglas de `finance-data-model`.

- `db/schema.ts` — tres tablas en la v1: `accounts`, `categories`, `transactions`.
  Copiadas de la skill, con dos añadidos:
  - `transactions.idempotencyKey` (texto, nullable) + índice único
    `(userId, idempotencyKey)` — defensa real contra el doble clic, según
    `server-action-safety`.
  - `transactions.transferId` ya presente desde el minuto uno: las transferencias
    entran en la v1.

  **`budgets` no se crea todavía.** La tabla llega con su feature en v2; una tabla
  vacía en la migración inicial solo es deuda. El diseño ya está fijado en la skill.

  Recordatorios de esquema que no se negocian: importes `integer` en céntimos;
  divisa en la **cuenta**, no en el movimiento; `date` como `text`; `userId` en
  todas las tablas; borrado lógico con `deletedAt`.

- `db/index.ts` — cliente único:
  ```ts
  // Singleton cacheado en globalThis: en dev, cada HMR crearía otra conexión.
  // PRAGMA journal_mode = WAL   (lecturas concurrentes con la escritura)
  // PRAGMA foreign_keys = ON    (SQLite las ignora por defecto)
  ```
  Ruta del fichero desde `process.env.DATABASE_PATH ?? './data/finanzas.db'`.
- `drizzle.config.ts` — dialecto `sqlite`, salida `db/migrations`.
- `db/migrations/` — generadas con `drizzle-kit generate`, **revisadas a mano** y
  commiteadas. Nunca `drizzle-kit push`.
- `db/migrate.ts` — aplica migraciones pendientes; se ejecuta también al arrancar
  en dev para no olvidarse.
- `db/seed.ts` — idempotente (`onConflictDoNothing`): crea el catálogo de
  categorías por defecto en español (gasto: Alimentación, Hogar, Suministros,
  Transporte, Salud, Ocio, Restaurantes, Compras, Educación, Suscripciones,
  Impuestos, Otros; ingreso: Nómina, Autónomo, Intereses, Reembolsos, Otros
  ingresos) para el usuario demo.

**Verificación:** `pnpm db:generate && pnpm db:migrate && pnpm db:seed` deja un
fichero `data/finanzas.db` con las categorías; ejecutar `db:seed` dos veces no
duplica; `drizzle-kit studio` abre y muestra las tablas.

---

### Fase 3 — `features/accounts`

- `features/accounts/queries.ts`
  - `listAccounts(userId)` — cuentas activas con **saldo derivado**:
    `openingBalance + SUM(amount)` con `LEFT JOIN` a movimientos no borrados. El
    saldo **incluye** transferencias. Agregado en SQL, no en JavaScript.
    `sum()` sobre conjunto vacío devuelve `NULL` → `?? 0` siempre.
  - `getAccount(userId, id)` — filtrado por `userId` dentro del `where`.
  - `getNetWorth(userId)` — patrimonio **agrupado por divisa**, nunca un total
    único. Devuelve `Money[]`. Esto es el "cuánto dinero tengo en total".
- `features/accounts/schema.ts` — Zod: `name` 1-60, `type` enum
  (`checking|savings|card|cash|investment`), `currency` enum, `openingBalance`
  entero en céntimos vía `parseMoney`.
- `features/accounts/actions.ts` — `'use server'`, solo mutaciones:
  `createAccount`, `updateAccount`, `archiveAccount`. Las cuatro comprobaciones en
  orden: autenticar → validar → autorizar (propiedad en el `where`) → mutar y
  `revalidatePath`.
- `features/accounts/components/` — `AccountForm` (`'use client'`,
  `useActionState`), `AccountCard`, `AccountList`.

**Nota sobre archivar:** archivar no borra; la cuenta desaparece de los selectores
de movimiento nuevo pero sus movimientos siguen contando en el histórico. No se
permite archivar dejando movimientos huérfanos porque no se borra nada.

---

### Fase 4 — `features/categories`

CRUD sencillo sobre el catálogo sembrado. Jerarquía de un solo nivel
(`parentId`). Una categoría es `income` **o** `expense`, no ambas — el selector de
categoría en el formulario de movimiento filtra por el signo del importe.

Borrar una categoría en uso: se impide (los movimientos quedarían sin clasificar
en silencio). Se ofrece renombrar o reasignar.

---

### Fase 5 — `features/transactions`

El corazón de la aplicación.

- `queries.ts`
  - `listTransactions(userId, filtros)` — filtros: rango de fechas, cuenta,
    categoría, texto. Paginación por cursor sobre `(date, id)`. Se apoya en el
    índice `tx_user_date_idx`.
  - `getMonthlySpendByCategory(userId, period)` — `WHERE transferId IS NULL AND
    deletedAt IS NULL AND amount < 0`, agrupado por categoría, ordenado
    descendente por magnitud.
  - `getIncomeVsExpense(userId, periods[])` — dos sumas por mes.
  - `getBalanceSeries(userId, from, to, accountId?)` — saldo acumulado **por día**,
    rellenando los días sin movimiento con el saldo anterior. Sin ese relleno la
    línea dibuja pendientes falsas entre fechas distantes.
- `schema.ts` — Zod. `amount` entero distinto de cero; `date` con regex
  `^\d{4}-\d{2}-\d{2}$`; `description` 1-200.
- `actions.ts` — `'use server'`:
  - `createTransaction` — valida cuenta **y** categoría como propias del usuario.
  - `updateTransaction`, `deleteTransaction` (marca `deletedAt`, no borra).
  - `createTransfer` — **dos filas con el mismo `transferId`**, negativa en origen
    y positiva en destino, creadas en **una sola** `db.transaction`. Valida **las
    dos** cuentas como propias: es el punto que se escapa siempre.
  - `deleteTransfer` — borra lógicamente **ambas patas**; nunca deja una huérfana.

**El helper que evita acordarse cada vez:**

```ts
// Movimientos que cuentan como flujo real: ni transferencias ni borrados.
const isRealFlow = () => and(isNull(transactions.transferId), isNull(transactions.deletedAt))
```

Saldo de cuenta → incluye transferencias. Informes, gráficos de gasto/ingreso y
totales del mes → las excluyen. Sin esto, mover 2.000 € al ahorro aparece como
2.000 € "gastados".

**Tests de esta fase** (SQLite en memoria, migraciones aplicadas, sin mockear el ORM):
- Las transferencias no aparecen en gasto por categoría.
- Sí afectan al saldo de ambas cuentas, y las dos patas suman cero.
- Borrar una pata no deja la otra viva.
- Autorización: con la sesión del usuario B, ninguna acción toca datos del A —
  y se comprueba **el estado de la base de datos**, no solo que la respuesta sea
  error. Una acción puede devolver error después de haber escrito.
- Cuenta ajena o categoría ajena al crear → rechazo.

---

### Fase 6 — Rutas y UI

Estructura (`app/(app)/` = rutas de la aplicación; el grupo ya deja sitio para
`(auth)` en v2):

```
app/
  (app)/
    layout.tsx            # navegación lateral + contenedor
    page.tsx              # Dashboard
    cuentas/page.tsx
    cuentas/[id]/page.tsx # detalle: saldo, gráfico y movimientos de la cuenta
    movimientos/page.tsx  # tabla con filtros por searchParams
    informes/page.tsx     # mes seleccionable
  layout.tsx              # root: lang="es", fuentes, metadata
  globals.css
```

Se **borra** `app/page.tsx` del scaffold y se corrige el root layout: `lang="es"`,
`metadata` con título propio, y se quita el `font-family: Arial` de `globals.css`
que hoy pisa la fuente configurada.

Dashboard (`(app)/page.tsx`) responde de un vistazo a "cuánto tengo":

1. **Patrimonio total** — cifra grande, por divisa. Si solo hay EUR, una cifra.
2. **Tarjetas por cuenta** con su saldo.
3. **Este mes**: ingresos, gastos y neto (sin transferencias).
4. **Evolución del saldo** (12 meses) — línea.
5. **En qué se me va el dinero** (mes actual) — barras horizontales.
6. **Últimos movimientos**.

Reglas de render que vienen de las skills:

- Server Components por defecto; `'use client'` solo en formularios, filtros y
  gráficos. Marcar la página entera como cliente aquí significa enviar la lógica
  de agregación y datos que no se muestran al navegador.
- A un Client Component se le pasan **campos sueltos**, no la fila entera: lo que
  cruza acaba serializado en el HTML.
- `Suspense` con granularidad, no `loading.tsx` global: el saldo se calcula en
  milisegundos y el informe anual no; no deben esperarse mutuamente.
- Importes: `tabular-nums`, alineados a la derecha, siempre con `formatMoney`.
- `searchParams` y `params` son promesas → `await`.

`globals.css` (Tailwind v4, configuración en CSS, **sin** `tailwind.config.js`):

```css
@theme {
  --color-income:  oklch(0.65 0.15 150);
  --color-expense: oklch(0.60 0.20 25);
}
```

---

### Fase 7 — Gráficos

Se carga la skill global `dataviz` (paleta, tipografía, ejes) **antes** de escribir
la primera línea, y `finance-charts` para la parte de dominio.

| Gráfico | Forma | Dónde |
|---|---|---|
| Evolución del saldo / patrimonio | Línea, un punto por día | Dashboard, detalle de cuenta |
| En qué se me va el dinero | Barras horizontales ordenadas desc. | Dashboard, informes |
| Ingresos vs gastos | Barras **agrupadas** (dos por mes, no apiladas) | Informes |

No negociable:

- **El eje de dinero empieza en cero.** Truncarlo exagera diferencias de doce
  euros y el usuario se está evaluando a sí mismo con ese gráfico.
- **El color no es la única señal.** Rojo/verde es justo el par que no distingue
  la deuteranopía → siempre acompañado de signo `−`/`+` o etiqueta.
- Ticks del eje en formato compacto (`1,2 k €`); **tooltip siempre con el importe
  exacto** vía `formatMoney`. Nunca `toFixed(2)` ni concatenar `€`.
- Agregación en SQL; al componente cliente llegan **solo los datos ya agregados**.
- Cola larga: a partir de ~8 categorías se agrupa en "Otras (n)".
- Un mes sin datos es un hueco, no un cero: si empecé en marzo, enero no se pinta.
- Los gastos son negativos internamente; se invierten a magnitud positiva **en la
  capa de presentación**, con el eje etiquetado "Gasto".
- Alternativa en tabla accesible (visualmente oculta) para cada gráfico.

---

### Fase 8 — Cierre

1. `pnpm lint` y `pnpm typecheck` limpios.
2. `pnpm test` en verde, incluida la variante con `TZ` forzado.
3. `node .claude/skills/money-and-currency/scripts/audit-money.mjs my-app` sin hallazgos.
4. `pnpm build` correcto.
5. Repaso manual de los cuatro flujos:
   - crear cuenta → añadir movimiento → el saldo refleja el cambio;
   - transferencia → ambos saldos correctos → **no** aparece como gasto;
   - filtrar movimientos por mes y categoría;
   - borrar un movimiento → desaparece de los totales, la fila sigue en la base de datos.
6. Actualizar `my-app/AGENTS.md`: mover persistencia, auth, gráficos y tests de
   "Decisiones abiertas" a decisiones tomadas, y ajustar la tabla de stack.
7. `README.md` con el arranque real: `pnpm install` → `pnpm approve-builds` →
   `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev`.

---

## 5. Orden de ejecución

```
Fase 0 (base)
   └─ Fase 1 (lib + tests)          ← nada toca dinero antes de que esto esté verde
        └─ Fase 2 (db)
             ├─ Fase 3 (accounts)
             │    └─ Fase 4 (categories)
             │         └─ Fase 5 (transactions + tests)
             │              └─ Fase 6 (rutas y UI)
             │                   └─ Fase 7 (gráficos)
             └────────────────────────── Fase 8 (cierre)
```

Las fases 3-5 son secuenciales de verdad: los movimientos necesitan cuentas y
categorías existentes para poder probarse con datos reales.

---

## 6. Checklist por Server Action

Se aplica a cada acción de las fases 3-5, sin excepción:

- [ ] Comprueba la sesión antes de tocar nada
- [ ] Valida **toda** la entrada con Zod en el servidor
- [ ] El `userId` sale de la sesión, nunca del formulario
- [ ] Cada ID recibido se filtra por `userId` **dentro** del `where`
- [ ] Los importes llegan como enteros en céntimos
- [ ] Los errores no distinguen "no existe" de "no es tuyo"
- [ ] Las escrituras múltiples van en una `db.transaction`
- [ ] Revalida lo que ha cambiado
- [ ] `redirect()` fuera de `try/catch`
- [ ] El fichero `'use server'` no exporta nada que no sea una acción
