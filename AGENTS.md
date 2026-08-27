<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> El bloque de arriba lo regenera `next dev`. **No lo edites ni lo borres.** Todo lo que sigue es documentación del proyecto y sí se mantiene a mano.

# Gestor de Finanzas Personales

Aplicación web para llevar las finanzas personales: movimientos (gastos e
ingresos), categorías y una portada que resume el mes. Uso individual (uno o
pocos usuarios), no multi-tenant, no contabilidad de empresa.

**Hay UNA cuenta y UNA divisa, y ninguna de las dos se guarda.** No existe tabla
de cuentas, ni columna de moneda, ni transferencias: un movimiento es un gasto o
un ingreso, y el saldo es la suma de todos ellos.

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
| Cambiar un color, un grosor de trazo, una sombra o una tipografía | `app/globals.css` (los tokens `--sd-*`) |
| Cambiar el aspecto de TODOS los botones, inputs o paneles de Mantine | `src/presentation/styles/mantine-sketch.module.css` |
| Cambiar el aspecto de UNA vista concreta | Su `*.module.css` al lado del `.tsx` |
| Añadir una operación que no es CRUD | Una función en el repositorio + su acción en `entity.actions.ts` + su hook |
| Cambiar el color de una categoría en tabla y gráficos | La clave en `categories.color`; los tonos, en `app/globals.css` (`--sd-cat-*`) |
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
| Estilos | **CSS Modules** + tokens `--sd-*` | Sin Tailwind. Ver "El sistema de diseño" |
| Tipografía | **Fredoka** (titulares) + **Nunito** (texto) + **Geist Mono** (dinero) | Vía `next/font/google` |
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
en un `<button>`. Para estilar hay **CSS Modules** y tokens; no añadas clases de
utilidad ni vuelvas a meter un framework de CSS.

## El sistema de diseño

La aplicación tiene un aspecto propio —trazo negro, esquinas orgánicas, sombra
dura, verde bosque— y no es decoración: es lo que la separa de una hoja de
cálculo. Vive en tres sitios y solo tres:

| Capa | Fichero | Qué es |
|---|---|---|
| **Tokens** | `app/globals.css` | Las Custom Properties `--sd-*`: color, trazo, sombra, radio, movimiento, tipografía. La única fuente de verdad |
| **Puente con Mantine** | `src/presentation/styles/mantine-sketch.module.css` | Se engancha en el tema con `Componente.extend({ classNames })`. Hace que TODO `<Button>`, `<Paper>` o `<TextInput>` ya existente herede el aspecto sin tocarlo |
| **Primitivos** | `src/presentation/components/ui/` | `SketchButton`, `SketchCard`, `StatusBadge`, `EmptyState`, `AnimatedMoney`. Solo para lo que Mantine no da |

Las tres reglas de estilo del proyecto:

1. **Un componente se estila con su `*.module.css` al lado**, nunca con `style`
   en el JSX. Un `style` suelto es un valor que el modo oscuro no sabe traducir.
2. **Dentro de un módulo, todo color, grosor y sombra sale de un token `--sd-*`.**
   Si el token no existe, se añade a `app/globals.css`; no se escribe el
   hexadecimal ahí. Es lo que hace que el modo oscuro sea un bloque de
   veinte líneas y no una revisión de treinta ficheros.
3. **Antes de escribir un componente nuevo, mira si Mantine ya lo pinta.** Casi
   siempre sí, y ya viene con el trazo puesto por el tema.

`app/globals.css` se importa **el último** en `app/layout.tsx`, después de las
hojas de Mantine: reapunta variables de Mantine (`--mantine-color-body`,
`--mantine-font-family`) y, a igual especificidad, gana quien se declare después.
Si sube de sitio, la aplicación vuelve al gris de fábrica.

### El color tiene tres trabajos y no se mezclan

| Trabajo | Tokens | Pregunta que responde |
|---|---|---|
| **Marca** | `--sd-accent*` | ¿esto es de esta aplicación? |
| **Dato con signo** | `--income` / `--expense` | ¿esto suma o resta? |
| **Identidad** | `--sd-cat-1`…`--sd-cat-8` | ¿de qué categoría es esto? |

Ninguno sustituye a otro. `--income` / `--expense` no son parte de la paleta de
marca y sus valores están validados para daltonismo (bloque 5 de `globals.css`);
los `--sd-cat-*` son la paleta categórica, se asignan **en orden fijo y no se
ciclan** generando un noveno tono, y también están validados (bloque 2b). Los dos
juegos salen del script `validate_palette.js` de la skill `dataviz`: si cambias
un valor, vuelve a pasarlo en claro y en oscuro por separado.

Y la regla que los sostiene a los tres: **el color nunca es la única señal.** Los
importes llevan su signo delante, las categorías llevan su nombre, las
comparaciones dicen "más" o "menos" con palabras.

### Cómo viaja un color de dato

Nunca en el JSX. La clave viaja en un `data-*` y el CSS la traduce:

```tsx
<span className={styles.chapaColor} data-color={categoria.color} />
```
```css
.chapaColor[data-color='cat-3'] { --chapa-tono: var(--sd-cat-3); }
```

Es más largo que un `style={{ background: color }}` y es a propósito: un `style`
inline es un valor que el modo oscuro no sabe traducir, y la regla 1 no tiene
excepciones. `lib/colores.ts` guarda las claves y sus nombres; los valores, solo
`globals.css`.

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

### 2. La divisa sale de un solo sitio: `DIVISA_APP`

La aplicación trabaja en una sola moneda, y por eso la divisa **no es un dato**:
no hay columna de moneda en ninguna tabla ni campo `divisa` en ningún DTO. La
decide `DIVISA_APP` en `lib/money.ts`, y ese es el único sitio del que hay que
tirar el día que haya más de una.

Lo que NO se ha quitado, y no se quita: `Money` sigue llevando su divisa dentro y
la aritmética de `lib/money.ts` **sigue lanzando** al operar dos monedas
distintas. Esa red es barata y es lo que convierte "añadir multidivisa" en un
cambio localizado en vez de una auditoría de todo el código.

En la práctica: para formatear se construye `money(importe, DIVISA_APP)`; los
formularios reciben la divisa por `FormContext.divisa` (prop `divisa` del
`GenericForm`, que ya cae a `DIVISA_APP`); las columnas `money` de `AppTable`
usan `DIVISA_APP` salvo que la columna declare un `divisaAccessor`.

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

**Un recurso son cuatro nombres que tienen que coincidir.** El string
`'Movimientos'` aparece en `REPOSITORIES`, en `REFINE_RESOURCES`
(`providers.tsx`), en el `createEntityHooks('Movimientos')` de la entidad y en su
`useEntityFormSubmit`. Si uno diverge, el DataProvider lanza "Recurso
desconocido" en la primera consulta.

**Lo que no encaja en el CRUD no pasa por aquí.** Restaurar un borrado, el saldo
y las agregaciones de la portada tienen su propia Server Action y su propio hook
escrito a mano.

**Todo lo derivado se invalida a mano.** El saldo y los gráficos son sumas de
movimientos y viven bajo la raíz de queries `['informes']`, de la que Refine no
sabe nada: cada mutación llama a `useInvalidarDerivados()`. Sin eso se anota un
gasto y la portada sigue enseñando la cifra de antes, que en una aplicación de
dinero no parece un error — parece un dato.

### Estructura de ficheros

```
.
  app/                                # rutas, en PascalCase
    page.tsx                          # Inicio: saldo, mes, gráficos y últimos
    page.module.css                   # su aspecto: cada vista lleva el suyo
    layout.tsx                        # Providers + Navbar + CSS de Mantine
    Movimientos/                      # una carpeta por entidad
      page.tsx                        # listado
      Create/page.tsx
      Edit/page.tsx                   # lee ?id=
    Categorias/
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
        useCatalogos.ts               # las categorías del usuario
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
      styles/
        mantine-sketch.module.css     # el puente con el tema de Mantine
      components/
        ui/                           # los primitivos del sistema de diseño
          index.ts                    # se importan SIEMPRE desde aquí
          SketchButton/               # <Link> tipado o <button>, con gesto
          SketchCard/                 # la ficha: cinta, filete, tono
          StatusBadge/                # estado → tono, en un solo sitio
        Forms/
          GenericForm/
            GenericForm.tsx
            GenericForm.module.css
            FieldRenderer.tsx         # FieldType → componente de Mantine
            MoneyInput.tsx            # el input de dinero (regla dura 1)
            types.ts                  # el contrato con src/config
          EntityForms/
            <entidad>/                # camelCase SINGULAR
              <Entidad>FormRefine.tsx
        AppTable/
          AppTable.tsx                # tabla genérica
          AppTable.module.css         # su aspecto de libreta
        EntityListPage.tsx            # página de listado genérica
        EntityListPage.module.css
        ActionsColumn.tsx             # helpers de columna
        Charts/FinanceCharts.tsx
        Navbar.tsx
        Navbar.module.css
        useEntityId.ts
  lib/
    money.ts                          # tipo Money, aritmética y DIVISA_APP
    colores.ts                        # las claves de la paleta categórica
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
src/config/movimientos/sections.ts ──►  <GenericForm sections={…} />
src/config/movimientos/columns.ts  ──►  <AppTable columns={…} />
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
  que el día que se añade un valor a una enumeración se toca un solo sitio
  (`metadata.repository.ts`). El CATÁLOGO —las categorías— sí va como `options`
  explícitas, porque son datos del usuario y cambian: se piden con
  `useCatalogos` y se le pasan a la función de secciones.
- **Todo campo con `component:` o `render:` lleva su `dependsOn`.** Sin él se
  repinta con cada tecla del formulario entero; con él, solo cuando cambia lo que
  declara. Si olvidas una dependencia, el campo deja de actualizarse en silencio.
- `visibleWhen` / `disabledWhen` reciben los valores vivos y el `FormContext`.

El `FormContext` lleva el `mode` y la **divisa**, que es la de la aplicación y no
se pide: la prop `divisa` del `GenericForm` cae a `DIVISA_APP`. Sigue siendo una
prop y no una constante importada porque la escala de un campo `money` depende de
ella (EUR tiene dos decimales; JPY, ninguno), y el día que haya un formulario en
otra moneda tiene que poder decirlo sin tocar el `GenericForm`.

El ejemplo vivo de campo custom es el **color de una categoría**: es un
componente propio (`EntityForms/categoria/SelectorColor.tsx`) que la sección
REFERENCIA con `component:` y su `dependsOn`, porque un desplegable con los
nombres de ocho colores no enseña los colores.

### Las columnas de una tabla

`AppTable` funciona en dos modos y la página elige cuál:

- **Modo cliente** (`usePaginacion(hook, { server: false })`): se trae el
  conjunto completo y filtra, ordena y pagina en memoria. Es lo correcto para
  decenas de filas — Categorías.
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
- **Una mutación que no invalida `['informes']` deja la portada mintiendo.** El
  saldo y los gráficos son sumas de movimientos y viven en otro árbol de queries
  del que Refine no sabe nada: hay que llamar a `useInvalidarDerivados()`. No
  falla nada visible — la cifra vieja no parece un error, parece un dato.
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
- **Los tres títulos con trazo de rotulador leen `--sd-underline-alto`.** Ese
  token existe porque el keyframe `sd-underline` anima `background-size` y tiene
  que llegar exactamente al alto de reposo. Si escribes el alto a pelo en la
  regla y no en la variable, el trazo termina la animación en un grosor distinto
  del que tenía sin ella.
- **`app/globals.css` se importa EL ÚLTIMO** en `app/layout.tsx`. Si sube por
  encima de las hojas de Mantine, sus overrides de `--mantine-*` pierden por
  orden de cascada y la aplicación vuelve al gris de fábrica. No lanza ningún
  error: solo se ve mal.
- **Un hexadecimal dentro de un `*.module.css` es un bug de modo oscuro.** Todo
  color sale de un token `--sd-*`. El modo claro seguirá viéndose bien, que es
  justo lo que hace que no se detecte. Lo mismo vale para un `color="red"` o un
  `c="teal.7"` de Mantine: esa paleta no tiene aquí variante oscura.
- **Una animación nueva que no se anula en `prefers-reduced-motion` no se ve
  como un bug.** El bloque está al final de `globals.css` y hace
  `animation: none`, no una duración de 0,01 ms: una entrada que arranca en
  `opacity: 0` y se acelera hasta lo instantáneo sigue dando un parpadeo. Y el
  CSS no llega al JavaScript: `AnimatedMoney` lo comprueba aparte con
  `matchMedia`.
- **Los selectores de `mantine-sketch.module.css` van DOBLADOS** (`.button.button`).
  Es lo que les da especificidad para ganarle a la hoja de Mantine. Si alguien
  los "limpia" a una sola clase, el tema deja de aplicarse en producción, donde
  el orden de las hojas no es el del desarrollo.
- **Abrir el `dev` por la IP de la red deja la app cargando para siempre.** Next
  16 bloquea los recursos de desarrollo (`/_next/static/chunks`, `/_next/hmr`)
  que no vengan de `localhost`: el HTML del servidor llega y la Navbar se pinta,
  pero ningún chunk de cliente carga, así que Refine nunca arranca y todas las
  listas se quedan en el spinner. No hay error en la consola del navegador —
  solo avisos en `.next/dev/logs/next-development.log`. Se arregla añadiendo el
  host a `allowedDevOrigins` en `next.config.ts`; si la IP de la máquina cambia,
  hay que actualizarla ahí.

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
- **Agregaciones**: que ninguna cuente lo que está en la papelera, y que
  `getSaldoActual` coincida con el último punto de `getSerieSaldo` — dos caminos
  distintos hasta la misma cifra son la prueba de que el saldo sigue siendo
  derivado (regla dura 7).
- **Reglas de borrado**: qué se puede borrar y qué se archiva.

## Skills del proyecto

En `.claude/skills/`. Se activan solas por contexto, pero conviene saber que existen:

| Skill | Cuándo |
|---|---|
| `money-and-currency` | Cualquier importe: declarar, calcular, formatear, parsear |
| `finance-data-model` | Esquema, migraciones, consultas, movimientos/categorías |
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
  soporta transacciones. `@libsql/client` distribuye binarios ya compilados y es
  el mismo cliente que habla con Turso.
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
- **Sistema de diseño**: dibujado a mano (trazo negro de 2-3 px, esquinas
  elípticas asimétricas, sombra dura sin difuminar, verde bosque de acento) sobre
  **CSS Modules** y tokens `--sd-*`. Se descartó estilar con las props de Mantine
  (`p`, `c`, `fw`, `style`): con ellas, cambiar el grosor del trazo obligaba a
  revisar cada componente, y no había forma de que un `<Button>` escrito antes
  del sistema heredara nada. El puente por `classNames` en el tema resuelve eso
  en un fichero. Se descartó también volver a un framework de utilidades por lo
  mismo que se retiró Tailwind.
- **Un solo acento de MARCA, ocho de DATO.** El verde sigue siendo el único
  acento de la interfaz: se retiró el color por entidad (`HeaderConfig.color`,
  `SectionDefinition.color`) porque con una sección en teal y otra en granate
  cada lista parecía de un producto distinto. Lo que distingue una sección de
  otra es el icono.
  Aparte de eso está la **paleta categórica** (`--sd-cat-1`…`--sd-cat-8`), que no
  es color de marca sino color de dato: identifica una categoría concreta en la
  tabla y en los gráficos. Se guarda la CLAVE en `categories.color`, nunca el
  color (`lib/colores.ts`), el JSX la pasa como `data-color` y el CSS la traduce
  a un token — así el modo oscuro sigue siendo un bloque de tokens y no una
  revisión de cada sitio donde se pinta. **Los ocho valores están validados con
  el script de `dataviz`**, no elegidos a ojo: el peor par adyacente está en
  ΔE 9,1 sobre un suelo de 8. Si tocas uno, vuelve a pasarlo.
- **Movimiento**: tres gestos y ni uno más (`sd-rise`, `sd-pop`, `sd-underline`
  en `globals.css`), más el conteo de las cifras grandes (`AnimatedMoney`). El
  escalonado va por `:nth-child()` en CSS y no por una variable inline en el JSX,
  porque la regla de "ni un `style` suelto" no admite excepciones "solo para un
  delay". Todo queda anulado por el bloque `prefers-reduced-motion`; en
  `AnimatedMoney`, que es JavaScript, se comprueba además con `matchMedia`.
- **Tipografía**: Fredoka para titulares, botones y etiquetas; Nunito para el
  texto corrido; **Geist Mono para el dinero**, y esta última no es estética: los
  importes en columna necesitan cifras de ancho fijo para poder compararse, y
  ninguna tipografía redondeada lo garantiza.
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
- **Multidivisa**: RETIRADA a propósito, no pendiente. La aplicación tiene una
  moneda y la decide `DIVISA_APP`. Volver a tenerla es añadir una columna a
  `transactions` y un campo a los DTOs; la aritmética de `lib/money.ts` ya está
  preparada y sigue lanzando al mezclar dos monedas.
- **Cuentas y transferencias**: RETIRADAS. Había una tabla `accounts` y
  transferencias en dos patas atadas por `transfer_id`; se quitaron enteras
  porque para llevar las finanzas de una persona sobraban, y eran justo lo que
  acoplaba el resto (la divisa vivía ahí, y todo listado hacía JOIN contra ella).
  Si algún día vuelven, el saldo pasa a ser por cuenta y `getSaldoActual` deja de
  ser una sola cifra.
- **Saldo de apertura**: no existe. El saldo arranca en cero el día del primer
  movimiento; para partir del saldo real del banco se anota un ingreso más
  ("Saldo inicial"). No hace falta esquema para eso, y es lo que mantiene la
  regla dura 7 sin excepciones.
- **Filtros de columna en modo servidor**: solo se ofrece "es igual a". Si
  Movimientos necesita operadores ricos, hay que enseñárselos al repositorio
  primero.
