<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> El bloque de arriba lo regenera `next dev`. **No lo edites ni lo borres.** Todo lo que sigue es documentación del proyecto y sí se mantiene a mano.

# Gestor de Finanzas Personales

Aplicación web para llevar las finanzas personales: cuentas, movimientos,
categorías, presupuestos y una visión de patrimonio. Uso individual (uno o pocos
usuarios), no multi-tenant, no contabilidad de empresa.

Fuera de alcance salvo que se diga lo contrario: facturación, IVA/IRPF, modelos
tributarios, partida doble contable, inversiones con fiscalidad de plusvalías.

## Lo mínimo para empezar a tocar código

1. Lee las **reglas duras**. Son siete y no son estilo: romperlas produce bugs de
   dinero.
2. Mira **cómo viajan los datos**. Hay una sola ruta y todo pasa por ella.
3. Si vas a añadir una entidad, usa `pnpm generate:crud` y lee **Añadir una
   entidad**.
4. Si vas a tocar un formulario o una tabla, lee **Cómo se declara una vista**.
   La regla que sorprende: los ficheros de `src/config/` no pueden llevar JSX.
5. Antes de terminar, mira las **trampas**. Todas fallan en silencio.

### Dónde va cada cosa

Cada cambio tiene un sitio y solo uno:

| Si vas a… | Toca |
|---|---|
| Cambiar qué campos tiene un formulario | `src/config/<entidad>/sections.ts` |
| Cambiar qué columnas tiene una tabla | `src/config/<entidad>/columns.ts` |
| Cambiar una regla de negocio o una validación | `src/infrastructure/repositories/<entidad>.repository.ts` |
| Cambiar el aspecto de TODOS los formularios | `src/presentation/components/Forms/GenericForm/` |
| Cambiar el aspecto de TODAS las tablas | `src/presentation/components/AppTable/` |
| Añadir una operación que no es CRUD | Una función en el repositorio + su acción en `entity.actions.ts` + su hook |
| Añadir una entidad entera | `pnpm generate:crud` |

Si te ves escribiendo un formulario a mano con `<TextInput>` sueltos, o una
`<DataTable>` fuera de `AppTable`, párate: casi siempre significa que no has
encontrado la pieza genérica.

## Stack

| Pieza | Elección | Notas |
|---|---|---|
| Framework | Next.js **16.3.0** (App Router) | Turbopack por defecto |
| React | **19.2.8** | |
| Lenguaje | TypeScript 5, `strict` | |
| Framework de datos | **Refine.dev 5** | `useList`/`useOne`/`useCreate`… sobre un DataProvider propio |
| UI | **Mantine v9** + `mantine-datatable` | Iconos: `@tabler/icons-react` |
| Estado de servidor | **React Query v5** | Lo usa Refine por dentro |
| Gestor de paquetes | **pnpm 10.28.2** | Hay `pnpm-workspace.yaml` en la raíz |
| Datos | SQLite + **Drizzle ORM**, driver `@libsql/client` | Fichero local en `data/` |
| Transporte | **Server Actions**, no HTTP | No hay API REST ni route handlers |
| Validación | **Zod 4** | En el repositorio, del lado del servidor |
| Auth | **Sin login en la v1** | `lib/auth.ts` devuelve un `userId` fijo |
| Gráficos | **Recharts 3** | Solo datos ya agregados cruzan al cliente |
| Exportación | **xlsx** | Carga diferida, solo al pulsar el botón |
| Scaffolding | **Plop** | `pnpm generate:crud` |
| Tests | **Vitest + fast-check** | SQLite real, nunca `:memory:` |

**No hay Tailwind.** Se retiró al adoptar Mantine: su `preflight` reescribe los
estilos base de todos los elementos y peleaba con los de Mantine por quién manda
en un `<button>`. `app/globals.css` solo conserva los tokens de color de los
gráficos. Para estilar, usa las props de Mantine (`p`, `gap`, `c`, `fw`…) o
`style`; no añadas clases de utilidad.

## Comandos

Se ejecutan **desde la raíz del repo**.

```bash
pnpm dev                  # servidor de desarrollo
pnpm build                # build de producción
pnpm start                # servir el build
pnpm lint                 # ESLint (eslint-config-next)
pnpm typecheck            # tsc --noEmit
pnpm test                 # Vitest
pnpm test:tz              # la misma suite con TZ=Pacific/Kiritimati
pnpm generate:crud        # scaffolding de una entidad nueva (Plop)
pnpm db:generate          # genera la migración a partir de db/schema.ts
pnpm db:migrate           # aplica las migraciones pendientes
pnpm db:seed              # catálogo de categorías por defecto (idempotente)
```

Primer arranque: `pnpm install` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev`.

**Usa siempre `pnpm`.** Ejecutar `npm install` o `yarn` aquí corrompe el lockfile.

Antes de dar algo por terminado:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:tz
```

`pnpm test:tz` no es redundante: corre la misma suite en `Pacific/Kiritimati` y
es lo que caza las fechas que se han colado como instantes en lugar de como
fechas civiles. Un cambio que toque fechas y no pase por aquí no está probado.

Si has tocado rutas, layouts o tipos de página, pasa también `pnpm build`: el
tipo `LayoutProps` lo genera el build, así que `typecheck` a solas no lo ve.

## Reglas duras

Estas no son preferencias de estilo. Romper cualquiera de ellas produce bugs de
dinero, que son los que hacen que la aplicación deje de ser fiable.

### 1. El dinero es un entero en la unidad mínima. Nunca un decimal

`0.1 + 0.2 !== 0.3`. Todo importe se almacena, se transporta y se calcula como
entero en céntimos. Solo se convierte a decimal en el último paso, al formatear
para pantalla (`lib/format.ts`). → skill `money-and-currency`

En la práctica esto son tres piezas concretas, y son obligatorias:

- **En el esquema**: `integer`, nunca `real` ni `numeric`.
- **En el formulario**: `type: 'money'`, nunca `type: 'number'`. Lo pinta
  `MoneyInput`, que lee texto y publica el entero.
- **En la tabla**: `type: 'money'` (o el helper `moneyColumn`), nunca una columna
  numérica. Una columna `number` con 123456 dentro pinta "123456" donde deberían
  verse 1.234,56 €.

### 2. Todo importe lleva su divisa asociada

Nunca sumes dos importes sin comprobar que comparten divisa. `lib/money.ts` lanza
si lo intentas; el resto del código tiene que llevar la divisa al lado:

- en los DTOs, en su propio campo (`divisa`);
- en los formularios, por `FormContext.divisa` (ver `divisaFrom`);
- en las tablas, por `divisaAccessor` de la fila.

Un total que mezcla divisas no es un total: por eso el patrimonio devuelve **una
cifra por divisa**, no una sola.

### 3. Toda Server Action verifica sesión y propiedad antes de tocar datos

`'use server'` convierte cada export en un endpoint POST público, alcanzable sin
pasar por tu interfaz. → skill `server-action-safety`

### 4. Nunca confíes en un ID que venga del cliente

Filtra por el `userId` de la sesión **dentro del `where`**, no después. Un `get`
que consulta por id y comprueba el dueño luego ya ha leído el dato ajeno, y esa
comprobación se pierde en el primer refactor.

### 5. Las fechas de movimiento son fechas civiles, no instantes

Guarda `YYYY-MM-DD`. No uses `Date` con hora ni UTC para "el día del gasto", o
los movimientos saltarán de mes según la zona horaria de quien mire. `lib/dates.ts`
opera sobre esas cadenas con aritmética entera; el único punto que mira el reloj
es `today()`. El `DateInput` de Mantine 9 trabaja con esas mismas cadenas, así
que no hay ningún `Date` en el camino — si ves uno, ese es el bug.

### 6. La lógica de dominio vive en el servidor

La interfaz es cliente (lo exige Refine), y por tanto **no puede sostener ninguna
garantía**. Los repositorios de `src/infrastructure/` son el único sitio que
valida, autoriza y escribe. Todo lo que compruebe un formulario es cortesía para
ahorrar un viaje; el repositorio lo vuelve a comprobar sin excepción.

### 7. Los saldos son derivados

Se calculan desde los movimientos, no se guardan. Un saldo almacenado es un saldo
que puede divergir de sus movimientos, y entonces la cifra que ve el usuario es
falsa. Si algún día se materializan por rendimiento, se hace en la misma
transacción que el movimiento y tiene que existir un test que compruebe que
coinciden.

## Arquitectura

Clean Architecture en cinco capas. La dirección de las dependencias es de abajo
arriba y no se cruza:

| Capa | Dónde | Qué es |
|---|---|---|
| **Types** | `src/types/` | Los DTOs. Tres por entidad. No importa de nadie |
| **Infrastructure** | `src/infrastructure/` | Los repositorios sobre Drizzle. **Solo servidor** |
| **Application** | `src/application/` | Server Actions, DataProvider, providers y hooks |
| **Config** | `src/config/` | La vista DECLARADA. **Solo `.ts`, sin JSX** |
| **Presentation** | `src/presentation/` | Los componentes que pintan |

Reglas de dependencia:

- `src/config` y `src/presentation` **no importan de `src/infrastructure`**. Lo
  que compartan sube a `src/types`.
- `lib/` y `db/` no importan de `src/`.
- Los repositorios son lo **único** que importa `@/db`, y por eso son lo único
  que no puede aparecer en un componente cliente.

### Cómo viajan los datos

Hay una sola ruta y todo pasa por ella:

```
Página (cliente)
  → hook           useList / useOne / useCreate / useUpdate / useDelete   (Refine)
  → DataProvider   src/application/providers/refine-data-provider.ts
  → Server Action  src/application/actions/entity.actions.ts      'use server'
  → Repositorio    src/infrastructure/repositories/<entidad>.repository.ts
  → Drizzle → SQLite
```

**No hay API HTTP.** Nada de route handlers para mutaciones ni de `fetch` a
`/api/...`. El DataProvider llama a Server Actions en proceso; el resto de la
aplicación no se entera y llama como si hubiera una API detrás.

Cuatro cosas de este camino que conviene tener claras:

**El dispatcher es genérico y eso es deliberado.** `entity.actions.ts` expone
`listEntity(resource, params)`, `createEntity(resource, values)`, etc.: aceptan un
nombre de recurso y unos valores sin tipar. Se sostiene sobre cuatro invariantes,
y si tocas ese fichero ninguna es negociable:

1. `resource` se resuelve contra `REPOSITORIES`, un mapa **cerrado**
   (`src/infrastructure/repositories/index.ts`). Un nombre que no esté ahí no
   ejecuta nada.
2. `values` llega como `unknown` y **nunca se esparce sobre la tabla**: cada
   repositorio lo pasa por su esquema Zod y escribe campo a campo.
3. El `userId` sale de `getSession()`. Jamás de los argumentos.
4. Todo `where`, de lectura y de escritura, lleva el `userId` dentro.

**Los errores esperados se DEVUELVEN, no se lanzan.** Una excepción en una Server
Action llega al navegador redactada en producción ("An error occurred…") y eso no
le sirve a quien está rellenando un formulario. Viajan como valor
(`ActionResult`), con sus `fieldErrors`, y el DataProvider los vuelve a convertir
en excepción **ya en el cliente**, que es donde React Query las espera. Un
`RepositoryError` conserva su mensaje porque está escrito para una persona;
cualquier otro fallo se registra en el servidor y al cliente le llega un texto
genérico.

**Un recurso son cuatro nombres que tienen que coincidir.** El string `'Cuentas'`
aparece en `REPOSITORIES`, en `REFINE_RESOURCES` (`providers.tsx`), en el
`createEntityHooks('Cuentas')` de la entidad y en su `useEntityFormSubmit`. Si
uno diverge, el DataProvider lanza "Recurso desconocido" en la primera consulta.

**Lo que no encaja en el CRUD no pasa por aquí.** Archivar una cuenta, crear una
transferencia, restaurar un borrado y los informes tienen su propia Server Action
y su propio hook escrito a mano.

### Estructura de ficheros

```
.
  app/                                # rutas, en PascalCase
    page.tsx                          # resumen
    layout.tsx                        # Providers + Navbar + CSS de Mantine
    Cuentas/                          # una carpeta por entidad
      page.tsx                        # listado
      Create/page.tsx
      Edit/page.tsx                   # lee ?id=
    Movimientos/
      Transferencia/page.tsx          # formulario propio: NO es un movimiento
    Categorias/
    Informes/
  src/
    types/
      formMetadata.types.ts
      informe.types.ts
      <entidad>.types.ts              # ListDto, SaveDto, FormDto
    infrastructure/
      repositories/
        index.ts                      # REPOSITORIES: el mapa cerrado de recursos
        types.ts                      # EntityRepository, ListParams, RepositoryError
        <entidad-plural>.repository.ts
        metadata.repository.ts        # las opciones de los select
        informes.repository.ts        # las agregaciones (no es un CRUD)
        __tests__/
    application/
      actions/
        entity.actions.ts             # 'use server' — la frontera
        informes.actions.ts
      hooks/
        createEntityHooks.ts          # factory genérica de hooks CRUD
        useEntityFormSubmit.ts        # submit genérico de formulario
        useFormMetadata.ts            # opciones de los select
        useCatalogos.ts               # cuentas y categorías del usuario
        usePaginacion.ts              # estado de la tabla
        useInformes.ts
        use<Entidades>.ts             # uno por entidad
      providers/
        providers.tsx                 # Mantine + Refine + REFINE_RESOURCES
        refine-data-provider.ts       # Refine → Server Actions
    config/                           # SOLO .ts, SIN JSX
      _shared/types.ts
      <entidad-en-kebab>/
        sections.ts                   # el formulario
        columns.ts                    # el listado
    presentation/
      components/
        Forms/
          GenericForm/
            GenericForm.tsx
            FieldRenderer.tsx         # FieldType → componente de Mantine
            MoneyInput.tsx            # el input de dinero (regla dura 1)
            types.ts                  # el contrato con src/config
          EntityForms/
            <entidad>/                # camelCase SINGULAR
              <Entidad>FormRefine.tsx
        AppTable/AppTable.tsx         # tabla genérica
        EntityListPage.tsx            # página de listado genérica
        ActionsColumn.tsx             # helpers de columna
        Charts/FinanceCharts.tsx
        Navbar.tsx
        useEntityId.ts
  lib/
    money.ts                          # tipo Money y aritmética — núcleo, muy testeado
    format.ts                         # Intl.NumberFormat / fechas, es-ES
    dates.ts                          # fechas civiles, periodos, rangos de mes
    forms.ts
    auth.ts                           # getSession()
  db/
    schema.ts
    migrations/
    testing.ts                        # base desechable para los tests
  plop-templates/
  plopfile.mjs
```

## Cómo se declara una vista

Es lo más distintivo del proyecto y lo que más sorprende al llegar: **un
formulario y una tabla no se escriben, se declaran**.

```
src/config/cuentas/sections.ts     ──►  <GenericForm sections={…} />
src/config/cuentas/columns.ts      ──►  <AppTable columns={…} />
```

`src/config` **describe** la vista; `src/presentation` la **pinta**.

### La invariante: `src/config` no lleva JSX

Los ficheros de `src/config/` son `.ts`, nunca `.tsx`. Es una invariante que
impone el compilador: si aparece JSX, deja de compilar. Eso es lo que mantiene la
configuración declarativa y evita que se acabe colando lógica de pintado en el
sitio donde solo debería haber descripción.

Cuando un campo o una columna necesita marcado propio:

- **En un formulario**: el componente se crea en
  `EntityForms/<entidad>/` (`.tsx`) y la sección lo **referencia** con
  `component:`, no lo instancia. El `GenericForm` lo monta con los
  `FieldRenderArgs` más lo que venga en `props`.
- **En una tabla**: usa los helpers de `ActionsColumn.tsx`
  (`textColumn`, `moneyColumn`, `dateColumn`, `enumColumn`, `boolColumn`,
  `actionsColumn`). Son los que mantienen todas las tablas con el mismo aspecto.

### Los campos de un formulario

Un `FieldDefinition` declara `name`, `label`, `type` y poco más. Lo que hay que
tener presente al escribirlos:

- **Un importe es `type: 'money'`.** Nunca `'number'` (regla dura 1).
- **Una fecha es `type: 'date'`**, que aquí significa cadena `'YYYY-MM-DD'`.
- **Un `select` de enumeración se declara SIN `options`.** Las resuelve el
  `FieldRenderer` desde el metadata usando el `name` del campo como clave, así
  que el día que se añade un tipo de cuenta se toca un solo sitio
  (`metadata.repository.ts`). Los CATÁLOGOS —cuentas, categorías— sí van como
  `options` explícitas, porque son datos del usuario y cambian: se piden con
  `useCatalogos` y se le pasan a la función de secciones.
- **Todo campo con `component:` o `render:` lleva su `dependsOn`.** Sin él se
  repinta con cada tecla del formulario entero; con él, solo cuando cambia lo que
  declara. Si olvidas una dependencia, el campo deja de actualizarse en silencio.
- `visibleWhen` / `disabledWhen` reciben los valores vivos y el `FormContext`.

El `FormContext` lleva el `mode` y la **divisa**. La divisa puede ser fija
(`divisa="EUR"`) o derivarse de los valores con `divisaFrom`, que es lo que
necesitan los dos casos reales:

```ts
// Cuentas: la divisa es un campo del propio formulario
divisaFrom={(v) => (v.divisa as Currency) || 'EUR'}

// Movimientos: la divisa se hereda de la cuenta elegida
divisaFrom={(v) => divisaDeCuenta.get(String(v.cuentaId ?? '')) ?? 'EUR'}
```

### Las columnas de una tabla

`AppTable` funciona en dos modos y la página elige cuál:

- **Modo cliente** (`usePaginacion(hook, { server: false })`): se trae el
  conjunto completo y filtra, ordena y pagina en memoria. Es lo correcto para
  decenas de filas — Cuentas y Categorías.
- **Modo servidor** (por defecto): el repositorio hace el trabajo y la tabla solo
  avisa de lo que se ha pedido. Es lo que usa Movimientos, la tabla que crece sin
  techo.

En modo servidor el filtro por columna solo ofrece el operador "es igual a": el
repositorio no sabe hacer "entre" ni "mayor que", y ofrecerlos para luego
mandarlos como igualdad daría resultados incorrectos sin avisar.

## Añadir una entidad

### Con el generador

```bash
pnpm generate:crud
# Nombre de la entidad (singular, PascalCase): Presupuesto
# Plural, que será la RUTA y el recurso:       Presupuestos
```

Crea los nueve ficheros y registra el recurso en los dos sitios que hacen falta
(`REPOSITORIES` y `REFINE_RESOURCES`). Deja cuatro `// TODO`.

**El repositorio generado no compila tal cual**, y es a propósito: apunta a una
tabla que casi nunca existe todavía. Si la entidad necesita tabla, créala en
`db/schema.ts` y pasa `pnpm db:generate` y `pnpm db:migrate` antes de tocarlo.

El generador **no** toca el menú: qué aparece en `Navbar.tsx` es una decisión de
producto, no de andamiaje.

> Si alguna vez se renombra o se mueve `REPOSITORIES` o `REFINE_RESOURCES`, hay
> que tocar el `pattern` correspondiente del `plopfile.mjs`. Un `modify` de Plop
> cuyo patrón no casa **no falla: se salta en silencio**. Por eso el generador
> comprueba después que el recurso quedó registrado y avisa si no. Ya pasó una
> vez, con un fichero que tenía finales de línea CRLF.

### A mano

1. **Types** → `src/types/<entidad>.types.ts` (ListDto, SaveDto, FormDto)
2. **Repositorio** → `src/infrastructure/repositories/<entidad-plural>.repository.ts`,
   y darlo de alta en `REPOSITORIES` (`index.ts`)
3. **Hooks** → `src/application/hooks/use<Entidades>.ts` (factory + reexports)
4. **Sections** → `src/config/<entidad-en-kebab>/sections.ts`. `.ts` sin JSX,
   `export function <entidad>Sections()`
5. **Columns** → `src/config/<entidad-en-kebab>/columns.ts`. `.ts` sin JSX, sin
   argumentos salvo que necesite opciones de un catálogo para los filtros
6. **Form** → `EntityForms/<entidad>/<Entidad>FormRefine.tsx`. Los componentes
   propios de la entidad van también aquí, en `.tsx`
7. **Pages** → `app/<Entidades>/page.tsx`, `Create/page.tsx`, `Edit/page.tsx`
8. **Resource** → añadir a `REFINE_RESOURCES` en `providers.tsx`
9. **Menú** → añadir a `ENLACES` en `Navbar.tsx`, si procede
10. **Tests** → `src/infrastructure/repositories/__tests__/<entidad>.repository.test.ts`

### Las cuatro carpetas de una entidad

Se derivan de la ruta de `app/`, no unas de otras. Se cumple sin excepciones:

| Carpeta | Caso | Ejemplo (`app/Movimientos`) | Qué contiene |
|---|---|---|---|
| `app/` | PascalCase **plural** | `app/Movimientos/` | Las tres pages: listado, Create y Edit |
| `src/config/` | kebab-case (la ruta en kebab) | `src/config/movimientos/` | `sections.ts` y `columns.ts` |
| `EntityForms/` | camelCase **singular** | `EntityForms/movimiento/` | El `FormRefine` y los componentes propios |
| `repositories/` | kebab-case plural + `.repository.ts` | `movimientos.repository.ts` | Las consultas y las reglas |

El **nombre del recurso** (`'Movimientos'`) es el PascalCase plural. Ver "Un
recurso son cuatro nombres que tienen que coincidir".

## Trampas de este repo

Todas tienen algo en común: **fallan en silencio**. Ninguna da un error que te
lleve hasta ella.

- **`src/config/*.ts` no puede llevar JSX.** Es deliberado. Si necesitas marcado,
  crea el componente en `EntityForms/<entidad>/` y referéncialo con `component:`.
- **Un importe nunca es `type: 'number'`.** Ni en un formulario ni en una tabla.
  Es `'money'`, siempre. Ver la regla dura 1.
- **Un `select` de enumeración se declara SIN `options`.** Se resuelven desde
  `metadata.repository.ts`. Si le pones `options` a mano, funciona — y duplicas
  la lista, que es justo lo que este diseño evita.
- **El nombre de un recurso aparece en cuatro sitios** y tienen que coincidir
  carácter a carácter. Si el DataProvider dice "Recurso desconocido", es esto.
- **Los campos con `component:` o `render:` necesitan `dependsOn`.** Si lo
  olvidas, el campo deja de actualizarse y no aparece ningún error.
- **Nada de `Date` para la fecha de un movimiento.** Cadenas `'YYYY-MM-DD'`.
  `lib/dates.ts` opera sobre ellas sin construir un solo `Date`.
- **Los repositorios importan `@/db`**, así que nunca se importan desde un
  componente cliente. La frontera es `entity.actions.ts`.
- **El repo es LF.** Un fichero que acabe en CRLF hace que los `modify` del
  generador de Plop no casen y se salten sin avisar.

## Estilo

Sigue el estilo del código que rodea a lo que tocas: comillas simples, sin punto
y coma, y comentarios que expliquen **por qué** algo es así, no qué hace. En un
proyecto de dinero, el comentario que importa es el que dice qué se rompe si
alguien cambia esa línea.

Cuando tomes una decisión que no sea obvia y no esté ya aquí, añádela a
"Decisiones tomadas" o a "Decisiones abiertas" en lugar de dejarla implícita.

## Convenciones de Next 16 en este repo

Lee `node_modules/next/dist/docs/` antes de escribir código de framework. Cambios
respecto a versiones anteriores que probablemente conozcas:

- `middleware.ts` → **`proxy.ts`**. Mismo papel, nombre nuevo desde Next 16.
  (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`)
- `params` y `searchParams` son **promesas**: `const { id } = await params`.
- Caché: directiva `'use cache'` + `cacheComponents` en `next.config.ts`.
  `cacheComponents` está **desactivado a propósito**: saldos y movimientos son
  datos por usuario que cambian con cada mutación.
- El layout raíz usa `LayoutProps<'/'>`, un tipo que **genera el build**. Por eso
  `pnpm typecheck` necesita que exista `.next/types`: si borras `.next`, pasa
  `pnpm build` antes.
- Mutaciones vía **Server Actions**, no route handlers, salvo que necesites un
  endpoint HTTP real (webhooks, descargas).
- Toda página que use `useSearchParams` necesita un `<Suspense>` por encima, o el
  build avisa.

Detalle en la skill `nextjs-app-conventions`.

## Tests

`pnpm test` y `pnpm test:tz`. → skill `testing-finance`

Cómo están montados:

- **SQLite real con las migraciones reales.** Nada de mockear el ORM: los bugs de
  agregación viven exactamente en el SQL que un mock no llega a ejecutar.
- La base es un **fichero** desechable en `data/test/`, no `:memory:`. Con libsql,
  abrir una transacción sobre una base en memoria estrena conexión, y cada
  conexión a `:memory:` es una base distinta y vacía.
- Lo único que se sustituye es de dónde sale la conexión: se mockea `@/db` con un
  getter. `src/infrastructure/repositories/__tests__/helpers.ts` tiene las
  semillas.

Qué se testea sin excepción:

- **Aislamiento por usuario**: que ninguna operación lea ni escriba lo ajeno, y
  que el mensaje no distinga "no existe" de "no es tuyo".
- **Aritmética de dinero**: signos, redondeos, que un importe con decimales se
  rechace.
- **Agregaciones**: sobre todo que los informes EXCLUYAN las transferencias y que
  los saldos las INCLUYAN.
- **Reglas de borrado**: qué se puede borrar y qué se archiva.

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

- **Arquitectura**: Clean Architecture en cinco capas con Refine.dev + Mantine.
  El DataProvider de Refine va sobre Server Actions y no sobre HTTP. Se descartó
  levantar route handlers REST: habrían añadido un salto de red contra la propia
  base local y duplicado la comprobación de sesión en cada handler.
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
- **Rutas**: PascalCase con `Create/` y `Edit/`, y el id en `?id=` sin cifrar.
  Los ids son UUID y de un solo usuario: ofuscarlos sería mantener criptografía
  sin nada que proteger.
- **Interfaz de cliente**: usar Refine implica que las páginas llevan
  `'use client'`. Es un intercambio consciente: se gana el CRUD declarativo
  completo y se pierde el renderizado en servidor de los datos. Lo que lo hace
  seguro es la regla dura 6 — ninguna garantía se sostiene en el cliente.
- **Tests**: Vitest + fast-check, con fichero SQLite desechable. Playwright sigue
  pendiente.
- **Gráficos**: Recharts. Los colores de ingreso y gasto viven en
  `app/globals.css` (`--income` / `--expense`) y están validados con el script de
  la skill `dataviz` contra cada superficie (claro y oscuro por separado). Si los
  cambias, vuelve a pasar el validador; no los ajustes a ojo. El color nunca es
  la única señal: los importes llevan siempre su signo.

## Decisiones abiertas

Anótalas aquí al resolverlas; no las asumas en silencio.

- **Presupuestos**: diseñados en la skill `finance-data-model`, sin implementar.
  La tabla `budgets` no existe todavía.
- **Importación de extractos**: las columnas `import_hash` están, el parser no.
- **Multidivisa**: los importes ya se agrupan por divisa en todas partes, pero no
  hay conversión ni tipos de cambio. Una transferencia entre divisas distintas se
  rechaza.
- **Filtros de columna en modo servidor**: solo se ofrece "es igual a". Si
  Movimientos necesita operadores ricos, hay que enseñárselos al repositorio
  primero.
- **Edición de transferencias**: no se pueden editar, solo borrar y rehacer.
  Cambiarle el importe a una sola pata descuadraría las dos cuentas entre sí.
