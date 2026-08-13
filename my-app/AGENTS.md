<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> El bloque de arriba lo regenera `next dev`. **No lo edites ni lo borres.** Todo lo que sigue es documentación del proyecto y sí se mantiene a mano.

# Gestor de Finanzas Personales

Aplicación web para llevar las finanzas personales: cuentas, movimientos, categorías,
presupuestos y una visión de patrimonio. Uso individual (uno o pocos usuarios), no
multi-tenant, no contabilidad de empresa.

Fuera de alcance salvo que se diga lo contrario: facturación, IVA/IRPF, modelos
tributarios, partida doble contable, inversiones con fiscalidad de plusvalías.

## Stack

| Pieza | Elección | Notas |
|---|---|---|
| Framework | Next.js **16.3.0** (App Router) | Turbopack por defecto |
| React | **19.2.8** | Server Components por defecto |
| Lenguaje | TypeScript 5, `strict` | |
| Estilos | Tailwind CSS **v4** | Config en CSS (`@theme`), no `tailwind.config.js` |
| Gestor de paquetes | **pnpm 10.28.2** | Hay `pnpm-workspace.yaml` en `my-app/` |
| Datos | SQLite + **Drizzle ORM**, driver `@libsql/client` | Fichero local en `data/`. Ver "Decisiones tomadas" |
| Auth | **Sin login en la v1** | `lib/auth.ts` devuelve un `userId` fijo |
| Gráficos | **Recharts 3** | Solo datos ya agregados cruzan al cliente |
| Tests | **Vitest + fast-check** | SQLite real, nunca `:memory:` |

## Comandos

Se ejecutan **desde `my-app/`**, no desde la raíz del repo.

```bash
pnpm dev                  # servidor de desarrollo
pnpm build                # build de producción
pnpm start                # servir el build
pnpm lint                 # ESLint (eslint-config-next)
pnpm typecheck            # tsc --noEmit
pnpm test                 # Vitest
pnpm test:tz              # la misma suite con TZ=Pacific/Kiritimati
pnpm db:generate          # genera la migración a partir de db/schema.ts
pnpm db:migrate           # aplica las migraciones pendientes
pnpm db:seed              # catálogo de categorías por defecto (idempotente)
```

Primer arranque: `pnpm install` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev`.

**Usa siempre `pnpm`.** Ejecutar `npm install` o `yarn` aquí corrompe el lockfile.

## Reglas duras

Estas no son preferencias de estilo. Romper cualquiera de ellas produce bugs de
dinero, que son los que hacen que la aplicación deje de ser fiable.

1. **El dinero es un entero en la unidad mínima (céntimos). Nunca un `number`
   decimal ni un `float`.** `0.1 + 0.2 !== 0.3`. Todo importe se almacena, se
   transporta y se calcula como entero. Solo se convierte a decimal en el
   último paso, al formatear para pantalla. → skill `money-and-currency`
2. **Todo importe lleva su divisa asociada.** Nunca sumes dos importes sin
   comprobar que comparten divisa.
3. **Toda Server Action verifica sesión y propiedad del recurso antes de tocar
   datos.** Son endpoints POST públicos, alcanzables sin pasar por tu UI.
   → skill `server-action-safety`
4. **Nunca confíes en un ID que venga del cliente.** Filtra siempre por el
   `userId` de la sesión en la propia consulta, no después.
5. **Las fechas de movimiento son fechas civiles, no instantes.** Guarda
   `YYYY-MM-DD`; no uses `Date` con hora ni UTC para "el día del gasto", o los
   movimientos saltarán de mes según la zona horaria.
6. **Server Components por defecto.** `'use client'` solo en las hojas del árbol
   que realmente necesitan estado o eventos del navegador.
7. **Los saldos son derivados.** Se calculan desde los movimientos. Si en algún
   momento se materializan por rendimiento, se hace en la misma transacción que
   el movimiento y debe existir un test que compruebe que coinciden.

## Convenciones de Next 16 en este repo

Lee `node_modules/next/dist/docs/` antes de escribir código de framework. Cambios
respecto a versiones anteriores que probablemente conozcas:

- `middleware.ts` → **`proxy.ts`**. Misma funcionalidad, nombre nuevo desde Next 16.
  (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`)
- `params` y `searchParams` son **promesas**: `const { id } = await params`.
- Caché: directiva `'use cache'` + `cacheComponents` en `next.config.ts`.
  (`.../03-api-reference/01-directives/use-cache.md`)
- Mutaciones vía **Server Functions/Actions**, no route handlers, salvo que
  necesites un endpoint HTTP real (webhooks, descargas).

Detalle en la skill `nextjs-app-conventions`.

## Estructura prevista

```
my-app/
  app/
    (app)/                  # rutas autenticadas
      cuentas/
      movimientos/
      presupuestos/
      informes/
    layout.tsx
    globals.css
  lib/
    money.ts                # tipo Money y aritmética — núcleo, muy testeado
    format.ts               # Intl.NumberFormat / fechas, es-ES
    dates.ts                # periodos contables, rangos de mes
  db/
    schema.ts               # esquema Drizzle
    migrations/
  features/
    accounts/               # cada feature: queries.ts, actions.ts, components/
    transactions/
    budgets/
    import/
  components/ui/            # primitivas sin lógica de dominio
```

Regla de dependencias: `features/*` puede importar de `lib/`, `db/` y
`components/ui/`. `lib/` no importa de `features/`. Sin dependencias cruzadas
entre features; lo que se comparta sube a `lib/`.

## Skills del proyecto

En `.claude/skills/`. Se activan solas por contexto, pero conviene saber que existen:

| Skill | Cuándo |
|---|---|
| `money-and-currency` | Cualquier importe: declarar, calcular, formatear, parsear |
| `finance-data-model` | Esquema, migraciones, consultas, cuentas/movimientos/presupuestos |
| `nextjs-app-conventions` | Rutas, rendering, caché, Server vs Client Components |
| `server-action-safety` | Escribir o revisar una Server Action o un formulario |
| `bank-import-es` | Importar extractos bancarios (CSV, Norma 43), dedup, categorización |
| `finance-charts` | Gráficos financieros (usa además la skill global `dataviz`) |
| `testing-finance` | Tests, sobre todo de lógica de dinero y de acciones |

## Decisiones tomadas

Resueltas durante la v1. El plan completo y el porqué de cada una están en
`docs/PLAN-V1.md`.

- **Persistencia**: SQLite + Drizzle ORM con el driver **`@libsql/client`**.
  `better-sqlite3` se descartó: no hay binario precompilado para Node 24 y
  compilarlo exige un toolchain de C++ que no está en la máquina. `node:sqlite`
  tampoco sirve — Drizzle 0.45 no trae driver para él y `sqlite-proxy` no
  soporta transacciones, que las transferencias necesitan. `@libsql/client`
  distribuye binarios ya compilados y es el mismo cliente que habla con Turso.
- **Auth**: sin login en la v1. `lib/auth.ts` devuelve un `userId` fijo desde un
  `getSession()` asíncrono. **El resto del código se escribe como si el login
  existiera**: toda consulta filtra por `userId` dentro del `where` y toda acción
  llama a `getSession()` primero. Cambiar a auth real toca un solo fichero.
- **Tests**: Vitest + fast-check. La base de test es un **fichero** desechable en
  `data/test/`, no `:memory:`: con libsql, abrir una transacción sobre una base
  en memoria estrena conexión, y cada conexión a `:memory:` es una base distinta
  y vacía. Playwright sigue pendiente.
- **Gráficos**: Recharts. Los colores de ingreso y gasto están validados con el
  script de la skill `dataviz` contra cada superficie (claro y oscuro por
  separado). Si los cambias, vuelve a pasar el validador; no los ajustes a ojo.

## Decisiones abiertas

Anótalas aquí al resolverlas; no las asumas en silencio.

- **Presupuestos**: diseñados en la skill `finance-data-model`, sin implementar.
  La tabla `budgets` no existe todavía.
- **Importación de extractos**: las columnas `import_hash` están, el parser no.
- **Multidivisa**: los importes ya se agrupan por divisa en todas partes, pero no
  hay conversión ni tipos de cambio. Una transferencia entre divisas distintas se
  rechaza.
