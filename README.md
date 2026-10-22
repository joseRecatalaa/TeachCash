# TeachCash

Gestor de finanzas personales. Aplicación web para llevar tus gastos e
ingresos: movimientos, categorías y una portada que resume el mes.

Los datos viven en **Postgres en Supabase** y el login es **Supabase Auth**.
Se puede usar sin registrarse: al entrar recibes una sesión de **invitado**
(protegida con un CAPTCHA invisible de Cloudflare Turnstile) que dura 4 días.
Si creas una cuenta, tus datos se quedan.

## Arrancar

Necesitas un proyecto de Supabase (vale el plan gratuito) y un widget de
Turnstile. Qué configurar en cada panel está en `docs/PLAN-SUPABASE.md`.

```bash
pnpm install                 # instala también el hook de commit (Husky)
cp .env.example .env.local   # y rellénalo: cada variable dice de dónde sale
pnpm db:migrate              # crea las tablas, RLS y políticas en Supabase
pnpm dev                     # http://localhost:3000
```

No hay paso de semillas: cada usuario recibe las categorías por defecto al
nacer.

Una vez, en el SQL Editor de Supabase y con la extensión `pg_cron` activada,
ejecuta `db/sql/limpieza-invitados.sql`: es el job que borra cada hora los
invitados caducados.

## Qué hace

Las pantallas principales (además de las de cuenta: entrar, registrarse y
recuperar la contraseña):

- **Inicio** — el saldo, cómo va el mes frente al anterior, la evolución del
  saldo, en qué se va el dinero y los últimos movimientos.
- **Movimientos** — anotar un gasto o un ingreso, con categoría y fecha.
  Filtrables por periodo, categoría y texto, y exportables a Excel. El borrado
  es permanente: no hay papelera.
- **Categorías** — de gasto o de ingreso, con emoji y color propio. El color es
  el que las identifica luego en la tabla y en los gráficos. Las de gasto llevan
  un presupuesto mensual.
- **Planificación** — cada categoría de gasto con lo gastado este mes frente a
  su presupuesto. Desde aquí se anota un gasto sin cambiar de pantalla.

Hay **una sola cuenta y una sola moneda**, y no se guardan en ninguna parte: el
saldo es la suma de los movimientos más el **patrimonio inicial**, la cifra con
la que empiezas: la portada te la pregunta la primera vez y se puede cambiar
desde el lápiz de la tarjeta. En Inicio, las flechas junto al mes recorren los
meses desde enero de 2026.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo, solo en `localhost` |
| `pnpm test` | Suite de Vitest (sobre PGlite: no toca Supabase) |
| `pnpm test:tz` | La misma suite con otro huso horario |
| `pnpm test:coverage` | La suite con los umbrales de cobertura por fichero |
| `pnpm test:e2e` | Tests end-to-end con Playwright (necesitan `.env.e2e`) |
| `pnpm test:e2e:ui` | Los mismos, con la interfaz de Playwright |
| `pnpm typecheck` | Genera los tipos de rutas de Next y pasa `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Genera una migración tras tocar `db/schema.ts` |
| `pnpm db:migrate` | Aplica las migraciones pendientes en Supabase |
| `pnpm db:migrate:e2e` | Lo mismo en el proyecto de Supabase de los E2E |
| `pnpm db:studio` | Explorador de la base de datos |
| `pnpm generate:crud` | Scaffolding completo de una entidad nueva |

## Tests y calidad

Todo está en **`docs/TESTS.md`**: cómo se ejecuta cada suite, qué cubre cada
test y por qué. En resumen:

- **750 tests de Vitest** sobre Postgres real en proceso (PGlite), sin tocar
  Supabase, más tests de componentes con Testing Library.
- **4 flujos end-to-end con Playwright**, solo en local, contra un segundo
  proyecto de Supabase de pruebas. Cómo montarlo, en `.env.e2e.example`.
- **En cada commit** (Husky): ESLint sobre los ficheros que entran y el chequeo
  de tipos. Si falla, el commit no se crea.
- **En cada PR a `develop`** (GitHub Actions): tipos, lint, tests con cobertura,
  la suite en otro huso horario, build y `pnpm audit`. Los tres checks son
  obligatorios para mergear.

## Para trabajar en el código

Lee **`AGENTS.md`** antes de tocar nada: lleva las reglas duras, el mapa de las
cinco capas y cómo se declara una vista. Para los tests, `docs/TESTS.md`. `docs/PLAN-V1.md` tiene el plan de la v1
y el porqué de cada decisión técnica; `docs/PLAN-SUPABASE.md`, el de la
migración a Supabase y lo que queda pendiente.

La regla que más importa: **el dinero es un entero en céntimos**, nunca un
decimal. Se convierte a decimal solo al formatearlo para pantalla.

### La arquitectura, en un párrafo

Clean Architecture en cinco capas —`types` / `infrastructure` / `application` /
`config` / `presentation`— con **Refine.dev** como framework de datos y
**Mantine** para la interfaz. Tres DTOs por entidad, hooks generados por una
factory, y la vista *declarada* en ficheros `.ts` sin JSX (`sections.ts` para el
formulario, `columns.ts` para el listado) que pintan dos componentes genéricos,
`GenericForm` y `AppTable`.

No hay API HTTP: el DataProvider de Refine llama a **Server Actions** que
consultan Postgres con Drizzle. Cada consulta filtra por el usuario de la sesión,
y RLS hace de red en la base.

```
Página → useList / useOne / useCreate…   (Refine, en el navegador)
       → refine-data-provider.ts
       → entity.actions.ts        'use server'
       → <entidad>.repository.ts  Drizzle
       → Supabase Postgres
```

### Añadir una entidad

```bash
pnpm generate:crud
```

Crea los nueve ficheros de la entidad y la registra en los dos sitios que hacen
falta. Deja cuatro `// TODO`: los campos de los DTOs, la tabla del repositorio,
los campos del formulario y las columnas del listado. El detalle, en la sección
"Añadir una entidad" de `AGENTS.md`.
