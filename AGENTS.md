<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> El bloque de arriba lo regenera `next dev`. **No lo edites ni lo borres.** Todo lo que sigue es documentación del proyecto y sí se mantiene a mano.

# TeachCash

Educación financiera para cualquiera, **interactiva, veraz y lúdica**: el
corazón del producto es el **Camino del héroe**, un videojuego a píxel donde se
aprende a manejar el dinero con cursos cortos, prácticas y jefes. Al lado, un
gestor de finanzas personales para aplicarlo con el dinero propio. Finanzas de
personas, no contabilidad de empresa.

"Veraz" es un requisito, no un adjetivo: las cifras y normas del contenido son
las de España, salen de fuentes oficiales y no se publican sin revisión humana
(`docs/CONTENIDO_HEROE.md`). Un curso con un dato mal es un bug, igual que un
importe mal sumado.

Tiene **tres módulos**, y el menú lateral cambia de uno a otro:

- **Cuadro de mando** (la raíz, `/`): la portada. Patrimonio total, estrellas, el
  héroe con su equipo y sus estadísticas. De aquí cuelga la **Tienda** (`/Tienda`),
  donde las estrellas de los cursos compran el equipo.
- **Gestión de patrimonio** (`/Patrimonio`): Inicio, Planificación, Categorías
  y Movimientos. Es de lo que hablan casi todas las reglas duras de dinero.
- **Camino del héroe** (`/CaminoHeroe`): educación financiera con forma de
  videojuego a píxel. Mundos (planetas) con un camino de niveles: lecturas con
  minitest, prácticas y un jefe. El plan y su porqué están en
  `docs/plans/CAMINO_HEROE.md`; cómo se escribe el contenido, en
  `docs/CONTENIDO_HEROE.md`.

**Es multiusuario y se usa sin registrarse.** Quien entra sin sesión recibe una
de **invitado** (usuario anónimo de Supabase, caduca a los 4 días); si crea una
cuenta, conserva sus datos. Cada usuario ve solo lo suyo y nada se comparte
entre usuarios.

**Hay UNA cuenta y UNA divisa, y ninguna de las dos se guarda.** No existe tabla
de cuentas, ni columna de moneda, ni transferencias: un movimiento es un gasto o
un ingreso, y el saldo (el "patrimonio" de la portada) es el patrimonio inicial
que elige la persona más la suma de todos ellos.

Fuera de alcance salvo que se diga lo contrario: facturación, IVA/IRPF, modelos
tributarios, partida doble contable, inversiones con fiscalidad de plusvalías.
Eso vale para lo que la aplicación CALCULA y guarda; los cursos sí ENSEÑAN
nómina, IRPF o la fiscalidad de un fondo.

## Lo mínimo para empezar a tocar código

1. Lee las **reglas duras** (más abajo). Son siete y no son estilo: romperlas
   produce bugs de dinero.
2. Lee el documento de `docs/` que toque según lo que vayas a hacer (tabla de
   abajo). No es opcional: este fichero solo lleva lo que vale para cualquier
   cambio.
3. Antes de terminar, mira las **trampas**. Todas fallan en silencio.

### La documentación de `docs/`

| Si vas a… | Lee antes |
|---|---|
| Escribir código de interfaz, crear un componente o algo que lo parezca (un formulario, una tabla, un botón, un título, una tarjeta, un gráfico, un sprite) | **`docs/components.md`**: qué piezas existen y se reutilizan, el sistema de diseño y cómo se declara una vista |
| Tocar el camino de los datos, una Server Action, la sesión, un repositorio o añadir una entidad | **`docs/architecture.md`**: las capas, cómo viajan los datos y la sesión, y `pnpm generate:crud` |
| Buscar dónde está algo o dónde va un fichero nuevo | **`docs/structure.md`**: la hoja de ruta ("Dónde va cada cosa") y el árbol de ficheros |
| Escribir o arreglar un test | **`docs/TESTS.md`**: cómo está montado, qué cubre cada fichero y qué no merece test |
| Escribir o revisar un curso del Camino del héroe | **`docs/CONTENIDO_HEROE.md`**, y las cifras en `docs/investigación-heroe/revision-cifras.md` |
| Tocar auth, sesión, cabeceras, CSP, límites, logs, RLS, dependencias o el CI | **`docs/SECURITY.md`**: las medidas por cada punto de OWASP Top 10 y API Top 10, lo que depende de configuración fuera del repo y los riesgos aceptados |
| Desplegar en producción (Vercel + Supabase) o tocar su configuración | **`docs/plans/PLAN-DESPLIEGUE.md`**: los pasos en orden, las variables de entorno, el panel de Supabase y Turnstile y cómo comprobarlo |
| Entender por qué algo se planificó así | **`docs/plans/`**: los planes (`PLAN-V1.md`, `PLAN-SUPABASE.md`, `CAMINO_HEROE.md`) y los prompts con los que se escribieron los cursos. Son históricos: lo vigente está aquí y en los documentos de arriba |

La regla que más se olvida: **antes de escribir un componente, búscalo en
`docs/components.md`**. Si te ves escribiendo un formulario a mano con
`<TextInput>` sueltos, o una `<DataTable>` fuera de `AppTable`, párate: casi
siempre significa que no has encontrado la pieza genérica.

Si cambias algo que estos documentos describen (un componente nuevo, una capa,
un fichero que se mueve), actualiza el documento en el mismo cambio.

## Stack

| Pieza | Elección | Notas |
|---|---|---|
| Framework | Next.js **16.3.8** (App Router) | Turbopack por defecto |
| React | **19.2.8** | |
| Lenguaje | TypeScript 5, `strict` | |
| Framework de datos | **Refine.dev 5** | `useList`/`useOne`/`useCreate`… sobre un DataProvider propio |
| UI | **Mantine v9** + `mantine-datatable` | Iconos: `@tabler/icons-react` |
| Estilos | **CSS Modules** + tokens `--sd-*` | Sin Tailwind. Ver "El sistema de diseño" en `docs/components.md` |
| Tipografía | **Fredoka** (titulares) + **Nunito** (texto) + **Geist Mono** (dinero) | Fredoka en `app/fonts/` (`next/font/local`); las demás, `next/font/google` |
| Estado de servidor | **React Query v5** | Lo usa Refine por dentro |
| Gestor de paquetes | **pnpm 10.28.2** | Hay `pnpm-workspace.yaml` en la raíz |
| Datos | **Postgres en Supabase** + **Drizzle ORM**, driver `postgres` (postgres-js) | Por el Transaction pooler, `prepare: false` |
| Transporte | **Server Actions**, no HTTP | Sin API REST; el único route handler es `/auth/confirm` |
| Validación | **Zod 4** | En el repositorio, del lado del servidor |
| Auth | **Supabase Auth** vía `@supabase/ssr` | Invitados anónimos + email y contraseña. Cookies `httpOnly` |
| Anti-bots | **Cloudflare Turnstile** (invisible) | Al crear el invitado; el secret vive en el panel de Supabase |
| Gráficos | **Recharts 3** | Solo datos ya agregados cruzan al cliente |
| Exportación | **xlsx** | Carga diferida, solo al pulsar el botón |
| Scaffolding | **Plop** | `pnpm generate:crud` |
| Tests | **Vitest + fast-check** + **PGlite**, **Testing Library**, **Playwright** | Postgres real en WASM; componentes en jsdom; E2E contra un Supabase de pruebas. Ver `docs/TESTS.md` |
| Quality gates | **GitHub Actions** + **Husky** + **lint-staged** | CI en cada PR a `develop`; ESLint y tipos en cada commit |

**No hay Tailwind.** Se retiró al adoptar Mantine: su `preflight` reescribe los
estilos base de todos los elementos y peleaba con los de Mantine por quién manda
en un `<button>`. Para estilar hay **CSS Modules** y tokens; no añadas clases de
utilidad ni vuelvas a meter un framework de CSS.

## Comandos

Se ejecutan **desde la raíz del repo**.

```bash
pnpm dev                  # servidor de desarrollo, SOLO en localhost
pnpm build                # build de producción
pnpm start                # servir el build
pnpm lint                 # ESLint (eslint-config-next)
pnpm typecheck            # next typegen (tipos de rutas) + tsc --noEmit
pnpm test                 # Vitest (sobre PGlite, no toca Supabase)
pnpm test:tz              # la misma suite con TZ=Pacific/Kiritimati
pnpm test:coverage        # la suite con los umbrales de coverage por fichero
pnpm test:e2e             # Playwright contra el Supabase de pruebas (necesita .env.e2e)
pnpm test:e2e:ui          # lo mismo, con la interfaz de Playwright
pnpm test:e2e:visual      # regresión visual de Inicio (opt-in, solo local)
pnpm generate:crud        # scaffolding de una entidad nueva (Plop)
pnpm heroe:validar        # valida el contenido del Camino del héroe (content/heroe/)
pnpm db:generate          # genera la migración a partir de db/schema.ts
pnpm db:migrate           # aplica las migraciones en Supabase (lee .env.local)
pnpm db:migrate:e2e       # lo mismo en el proyecto de los E2E (lee .env.e2e)
pnpm db:studio            # explorador de la base
```

Primer arranque: `pnpm install` → copiar `.env.example` a `.env.local` y
rellenarlo desde el panel de Supabase y de Cloudflare → `pnpm db:migrate` →
`pnpm dev`.

No hay `db:seed`: las categorías de fábrica se crean por usuario, al nacer, con
`asegurarCatalogoInicial(userId)` (`categorias.repository.ts`). Es idempotente.

`.env.local` no está en git. Nunca lleva la secret key (`service_role`) de
Supabase: la app no la necesita y no debe tenerla.

**Usa siempre `pnpm`.** Ejecutar `npm install` o `yarn` aquí corrompe el lockfile.

Antes de dar algo por terminado:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:tz
```

`pnpm test:tz` no es redundante: corre la misma suite en `Pacific/Kiritimati` y
es lo que caza las fechas que se han colado como instantes en lugar de como
fechas civiles. Un cambio que toque fechas y no pase por aquí no está probado.

Si has tocado algo que se ve en el navegador (formularios, tablas, estilos,
`layout.tsx`), pasa también `pnpm test:e2e`. Si has tocado rutas, layouts o
`next.config.ts`, pasa `pnpm build`.

Dos controles lo vuelven a comprobar solos: **Husky** en cada `git commit`
(ESLint sobre lo que entra y `typecheck`; si falla, el commit no se crea) y el
**CI** en cada PR a `develop` (todo lo anterior más coverage, build y `pnpm
audit`). Detalle en `docs/TESTS.md`.

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

La sesión es `getSession()` de `lib/auth.ts`, y el `userId` es el `sub` del JWT
**verificado** con `supabase.auth.getClaims()` (firma ES256 y caducidad). Nunca
`auth.getSession()` en el servidor: esa se cree la cookie tal cual, y una cookie
la puede escribir cualquiera. Un invitado es un usuario como otro cualquiera:
tiene `userId` y pasa por el mismo camino.

Una Server Action no llama a `getSession()` directamente sino a `sesionActiva()`
(`src/application/actions/sesion.ts`; `ejecutar` ya lo hace): la firma del token
sigue siendo buena después de cerrar sesión, y es la base la que dice si la
sesión sigue abierta.

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
falsa. Lo único guardado es el **patrimonio inicial** (`profiles`), que no es un
saldo sino el punto de partida que escribe la persona: el patrimonio es ese
inicial más los movimientos, y toda consulta de saldo tiene que sumarlo. Si algún día se materializan por rendimiento, se hace en la misma
transacción que el movimiento y tiene que existir un test que compruebe que
coinciden.

## Trampas de este repo

Todas tienen algo en común: **fallan en silencio**. Ninguna da un error que te
lleve hasta ella.

- **`src/presentation/entidades/` no puede llevar JSX.** Es deliberado. Si necesitas marcado,
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
  olvidas, el campo deja de actualizarse y no aparece ningún error. Lo vigila
  `src/__tests__/invariantes.test.ts`. Con `disabledWhen`/`labelFrom`/`optionsFrom`,
  un `dependsOn` incompleto congela el campo.
- **Un filtro de columna en modo servidor viaja con la `enumKey`, no con el
  accessor.** Movimientos pinta `categoriaNombre` y filtra por `categoriaId`: si
  la clave no es la que espera el repositorio, la ignora y devuelve todo. El
  icono del filtro sale encendido y la tabla, sin filtrar.
- **Las clases de `next/font` van en el `<html>`, no en el `<body>`.**
  `globals.css` resuelve `--sd-font-*` en `:root`; con las clases en el `<body>`
  quedaban inválidas y toda la app salía en Times New Roman sin un solo error. Lo
  vigila `e2e/tipografia.spec.ts`.
- **`NEXT_PUBLIC_SUPABASE_URL` es la URL del proyecto, sin `/rest/v1`.** El panel
  enseña las dos; con la de la API de datos, Auth responde "Invalid path specified
  in request URL". `lib/env.ts` ya no arranca con ella.
- **Nada de `Date` para la fecha de un movimiento.** Cadenas `'YYYY-MM-DD'`.
  `lib/dates.ts` opera sobre ellas sin construir un solo `Date`.
- **Los repositorios importan `@/db`**, así que nunca se importan desde un
  componente cliente. La frontera es `entity.actions.ts`.
- **El repo es LF.** Un fichero que acabe en CRLF hace que los `modify` del
  generador de Plop no casen y se salten sin avisar.
- **El trazo de rotulador lee `--sd-underline-alto`**: el de los títulos de
  pantalla (`SketchTitle`, uno para toda la app) y el del menú lateral. Ese
  token existe porque el keyframe `sd-underline` anima `background-size` y tiene
  que llegar exactamente al alto de reposo. Si escribes el alto a pelo en la
  regla y no en la variable, el trazo termina la animación en un grosor distinto
  del que tenía sin ella. Un título de pantalla nuevo es un `<SketchTitle>`, no
  otro `.title` copiado en su módulo.
- **El contenido del héroe se lee con `fs`, y nadie lo importa.** Por eso
  `next.config.ts` lo mete en el build con `outputFileTracingIncludes`; sin eso
  un despliegue empaquetado arranca sin cursos. En producción se carga una vez
  por proceso (un JSON nuevo pide reiniciar); en desarrollo se lee en cada
  petición.
- **Un sprite con una fila de distinto ancho desplaza todo el dibujo** y una
  letra fuera de su paleta se pinta transparente. Lo vigila
  `components/Pixel/__tests__/sprites.test.ts`: un sprite nuevo va con su paleta
  en ese test.
- **El héroe celebrando asoma 10 píxeles por encima de su caja** (el billete en
  alto). Una escena que lo ponga en `pose="celebra"` necesita ese aire por
  arriba, o el billete se corta.
- **Si el build falla con `Can't resolve '@vercel/turbopack-next/internal/font/google/font'`**
  (y "next/font/google queries have exactly one entry"), el código no tiene
  nada. Pasó dos veces en noviembre de 2026: en local, y se fue borrando `.next`;
  y en el CI, sin `.next` previo, con Fredoka, y en una ejecución que antes
  pasaba. La causa exacta no se ha confirmado (apunta a la descarga de Google).
  Por eso Fredoka va en `app/fonts/`. Si le pasa a otra fuente de Google, lo
  mismo: se baja al repo con `next/font/local`.
- **`app/globals.css` se importa EL ÚLTIMO** en `app/layout.tsx`. Si sube por
  encima de las hojas de Mantine, sus overrides de `--mantine-*` pierden por
  orden de cascada y la aplicación vuelve al gris de fábrica. No lanza ningún
  error: solo se ve mal.
- **Un `<script>` inline nuevo necesita el nonce** (`headers().get('x-nonce')`,
  como los dos de `app/layout.tsx`). Sin él la CSP lo bloquea: en la página no
  falla nada visible, solo sale un "Refused to execute inline script" en la
  consola. Un script de un tercero se carga con `appendChild` desde nuestro
  código (como `lib/turnstile.ts`) y su origen va en `frame-src`/`connect-src`
  de `lib/csp.ts` si lo necesita.
- **Un hexadecimal dentro de un `*.module.css` es un bug de modo oscuro.** Todo
  color sale de un token `--sd-*`. El modo claro seguirá viéndose bien, que es
  justo lo que hace que no se detecte. Lo mismo vale para un `color="red"` o un
  `c="teal.7"` de Mantine: esa paleta no tiene aquí variante oscura.
- **Una animación nueva que no se anula en `prefers-reduced-motion` no se ve
  como un bug.** El bloque está al final de `globals.css` y hace
  `animation: none`, no una duración de 0,01 ms: una entrada que arranca en
  `opacity: 0` y se acelera hasta lo instantáneo sigue dando un parpadeo. Y el
  CSS no llega al JavaScript: `useCuenta` (lo de debajo de `AnimatedMoney` y
  `AnimatedCount`) y la tienda lo comprueban aparte con `matchMedia`.
- **El aviso de invitado cerrado se decide en DOS sitios**: `AvisoInvitado.tsx`
  y el script inline del `<head>` de `app/layout.tsx` (misma clave de
  `localStorage`, mismo día de margen). Si divergen, la franja aparece y
  desaparece al cargar, o se esconde cuando ya debería volver.
- **`<SideMenu />` va DESPUÉS de `<Navbar />` en `app/layout.tsx`.** Los dos
  (y los modales de Mantine) están a z-index 200, y a igualdad gana el último
  del DOM: así el panel tapa la cabecera y un modal tapa el panel. Si sube por
  encima de la Navbar, la cabecera se pinta sobre el menú abierto.
- **El Cuadro de mando depende de movimientos, de partidas y de compras.** Cuelga de
  `['informes', 'cuadro']`: lo tira `useInvalidarDerivados()`, y `useEnviarNivel` y
  las mutaciones de la tienda lo invalidan a mano. Una mutación nueva que lo cambie
  y no lo invalide deja al héroe y al radar con lo de antes, sin ningún error.
- **`.escena` va en múltiplos enteros del `viewBox` de `EscenaHeroe`** (92x70: 276,
  368 y 460 de ancho). A cualquier otra escala los píxeles salen de anchos
  distintos y el héroe deja de verse nítido, sin que falle nada.
- **El bocadillo del héroe del Cuadro sale de un punto escrito en CSS**
  (`HeroeEquipo.module.css`, por `data-hueco`), en porcentaje del `viewBox` de
  `EscenarioHeroe` (96x90). Si cambia ese `viewBox`, una pieza o su zona
  (`ZONAS` en `HeroeEquipo.tsx`), el bocadillo apunta a otro sitio sin que falle
  nada. El escenario no se dimensiona por CSS sino con `width`/`height` a una
  escala entera: un `width` en CSS lo pisaría y lo dejaría borroso.
- **La ficha del radar va en un portal** (`document.body`) porque es `fixed`: la
  entrada de `sd-enter` pone `translate` en sus antepasados, y un antepasado
  transformado encierra a un `fixed` en su caja en vez de en la ventana.
- **Una pieza de equipo se pinta en el orden de `HeroeGrande`** (o de `PixelHero`,
  en el pequeño). Si se cambia, una acaba tapando a otra. Los sprites se apoyan en
  las coordenadas de su héroe: 48x66 el grande, 32x44 el pequeño.
- **En el héroe pequeño, cada pieza lleva la CLASE de la parte del cuerpo que la
  mueve** (`piernas`/`paso1`/`paso2` las botas; `brazoIzq` el guante izquierdo y el
  escudo; `brazoDer` el arma y el otro guante). Es lo que hace que acompañe a las
  poses sin una regla propia. Una pieza nueva sin su clase se queda quieta mientras
  el brazo se balancea, o se ve al celebrar con el brazo en alto. Lo vigila
  `PixelHero.test.tsx`.
- **Los selectores de `mantine-sketch.module.css` van DOBLADOS** (`.button.button`).
  Es lo que les da especificidad para ganarle a la hoja de Mantine. Si alguien
  los "limpia" a una sola clase, el tema deja de aplicarse en producción, donde
  el orden de las hojas no es el del desarrollo.
- **El `dev` escucha solo en `localhost`, y el host está atado en tres sitios.**
  `pnpm dev` arranca con `--hostname localhost`. Abrirlo por la IP de la red
  exige, además de quitar eso, tres cosas: el host en `allowedDevOrigins` de
  `next.config.ts` (sin él Next 16 bloquea los chunks de cliente, Refine nunca
  arranca y las listas se quedan en el spinner sin error en consola —solo avisos
  en `.next/dev/logs/next-development.log`—), el dominio en el widget de
  Turnstile (sin él no nace el invitado) y la URL en las Redirect URLs de
  Supabase (sin ella los enlaces del email no vuelven a la app).
- **En Postgres `like` distingue mayúsculas.** Las búsquedas de texto van con
  `ilike`. Con `like` funcionan… solo si el usuario escribe igual que se guardó.
- **Todo agregado lleva `.mapWith(Number)`.** postgres-js devuelve `sum()` y
  `count()` como TEXTO (son `bigint`/`numeric`). El tipo `sql<number>` no
  convierte nada, y `'100' + '50'` da `'10050'`.
- **`prepare: false` en el cliente de base** (`db/client.ts`). El Transaction
  pooler de Supabase reparte las consultas entre conexiones, y una sentencia
  preparada vive en una sola: con `prepare` activo funciona en local y falla en
  Supabase de forma intermitente.
- **Las migraciones van por el Session pooler** (`DATABASE_URL_MIGRATIONS`,
  puerto 5432), no por el Transaction pooler (6543), que no admite lo que lanzan.
- **Al cambiar de usuario, `queryClient.clear()`.** Lo hace `CuentaProvider` al
  entrar, salir o recrear el invitado. Sin eso, la cuenta nueva ve por un
  instante las listas cacheadas de la anterior.
- **`z.email().trim()` valida ANTES de recortar**, así que un email con un
  espacio al final se rechaza. Se escribe `z.string().trim().pipe(z.email())`.
- **Un fichero `'use server'` solo puede exportar funciones async.** Un esquema
  Zod o una constante exportada rompe el build; déjalos sin `export` o en otro
  fichero.
- **Los días de vida del invitado están en dos sitios**: `VIDA_INVITADO_DIAS`
  (lo que ve el usuario) y el `interval` de `db/sql/limpieza-invitados.sql` (lo
  que borra de verdad). Si divergen, la franja miente.

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
- El layout raíz usa `LayoutProps<'/'>`, un tipo que **genera Next**. Por eso
  `pnpm typecheck` es `next typegen && tsc --noEmit`: genera los tipos de rutas
  sin compilar y funciona aunque no exista `.next` (en el CI, siempre).
- Mutaciones vía **Server Actions**, no route handlers, salvo que necesites un
  endpoint HTTP real (webhooks, descargas).
- Toda página que use `useSearchParams` necesita un `<Suspense>` por encima, o el
  build avisa.

Detalle en la skill `nextjs-app-conventions`.

## Tests

Todo lo de tests está en **`docs/TESTS.md`**: cómo se ejecuta cada suite, cómo
están montados (PGlite con las migraciones reales, Testing Library, Playwright
contra un Supabase de pruebas), qué fichero cubre qué regla dura, los niveles de
coverage, las trampas y los quality gates. → skill `testing-finance`

Lo que no se negocia: un bug se arregla escribiendo primero el test que lo
reproduce y viéndolo en rojo, y un umbral de coverage no se baja para que pase.

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
| `testing-finance` | Qué testear y cómo, sobre todo dinero y acciones. El montaje, en `docs/TESTS.md` |

## Decisiones tomadas

- **Arquitectura**: Clean Architecture en cuatro capas con Refine.dev + Mantine.
  El DataProvider de Refine va sobre Server Actions y no sobre HTTP. Se descartó
  levantar route handlers REST: habrían añadido un salto de red contra la propia
  base y duplicado la comprobación de sesión en cada handler.
- **Formularios y tablas declarados en `src/presentation/entidades/`**, por
  entidad (`formularios.ts` y `tabla.ts`). Antes eran una capa aparte,
  `src/config/` con `sections.ts` y `columns.ts`, pero importaban de
  `presentation` (tipos, helpers de columna, componentes propios): eran
  presentación declarada. No se movieron a `application` porque esa capa no
  puede depender de `presentation`. Siguen siendo una carpeta propia para que
  la regla de "sin JSX" se vigile por ruta.
- **La documentación, partida por tarea**: este fichero lleva solo lo que vale
  para cualquier cambio (reglas duras, comandos, trampas, decisiones) y remite
  a `docs/components.md`, `docs/architecture.md`, `docs/structure.md` y
  `docs/TESTS.md` según lo que se vaya a hacer. Antes era un único fichero de
  más de mil líneas que se cargaba entero en cada sesión. Los planes ya
  ejecutados viven en `docs/plans/` como histórico: lo vigente está aquí.
- **Persistencia**: **Postgres en Supabase** (plan gratuito, región eu-west-3) +
  Drizzle ORM con **postgres-js**. Sustituyó a SQLite local al pasar a
  multiusuario. Se empezó de cero, sin migrar los datos de SQLite.
- **Datos por Drizzle directo, no por supabase-js.** La app se conecta a
  Postgres con un rol que se salta RLS y filtra por `userId` en cada `where`
  (regla dura 4). supabase-js se usa solo para Auth.
- **RLS como red, no como mecanismo, y de SOLO LECTURA en todas las tablas**
  (`soloLeerLoSuyo`): la API REST de Supabase, que cualquiera puede llamar con
  la clave pública y su propia sesión, no sirve para leer nada ajeno ni para
  escribir nada. La app no depende de ella: escribe con su rol, que se salta
  RLS, y es donde viven las cuotas, los topes y los cálculos. Hasta la auditoría
  de seguridad las tablas de dinero tenían `soloSuyo` (`for all`), y por REST un
  invitado podía saltarse cuotas y topes de longitud y llenar la base gratuita
  (migraciones 0007 y 0008). Lo vigila `db/__tests__/rls.test.ts`: una tabla
  nueva sin RLS o con política de escritura lo rompe.
- **Ids `text` con UUID que pone la base, no `uuid`.** Un id mal formado que
  llegue del cliente no casa con nada y da "No encontrado", en vez de que
  Postgres reviente con un error de sintaxis que acabaría como error genérico.
  `user_id` sí es `uuid`, porque es clave ajena a `auth.users.id`.
- **Auth**: Supabase Auth con email y contraseña (≥ 10 caracteres, con
  confirmación por email) y **modo invitado**: usuario anónimo, creado desde el
  cliente tras pasar Turnstile, que caduca a los 4 días. La app se usa sin
  registrarse; crear cuenta convierte al invitado conservando sus datos.
  `lib/auth.ts` sigue siendo lo único que sabe de auth: cambiar de proveedor
  toca ese fichero, `lib/supabase/` y `auth.actions.ts`.
- **Cookies `httpOnly`** (y `secure` en producción): no hay cliente de Supabase
  en el navegador, así que nada de JavaScript necesita leer el JWT.
- **Emails con las plantillas por defecto de Supabase** hasta tener SMTP propio
  (sin él: 2 emails/hora y solo a miembros del equipo del proyecto).
- **Rutas**: PascalCase con `Create/` y `Edit/`, y el id en `?id=` sin cifrar.
  Los ids son UUID y cada consulta filtra por dueño: ofuscarlos sería mantener
  criptografía sin nada que proteger.
- **Interfaz de cliente**: usar Refine implica que las páginas llevan
  `'use client'`. Es un intercambio consciente: se gana el CRUD declarativo
  completo y se pierde el renderizado en servidor de los datos. Lo que lo hace
  seguro es la regla dura 6 — ninguna garantía se sostiene en el cliente.
- **"Borrar mi cuenta"** (`/BorrarCuenta`, `borrarCuenta` en `auth.actions.ts`):
  vuelve a pedir la contraseña aunque haya sesión, con el email de la sesión y
  no del formulario, y borra la fila de `auth.users` por SQL (`borrarUsuario`):
  los datos caen por la cascada de `user_id`. Por SQL y no por
  `auth.admin.deleteUser` porque esa exige la secret key. Solo para cuentas con
  email: un invitado no tiene contraseña que confirmar y caduca solo.
- **Ping a Supabase**: el plan gratuito pausa el proyecto tras 7 días sin uso.
  `.github/workflows/ping-supabase.yml` consulta la API REST lunes y jueves con
  la clave pública (secrets `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` del
  repo); RLS devuelve `[]`, pero la petición llega a Postgres y cuenta. Nunca la
  secret key. GitHub solo lo lanza desde `develop` y lo desactiva tras 60 días
  sin actividad en el repo.
- **CSP con nonce** (`lib/csp.ts`, la pone `proxy.ts` en cada petición). La
  cookie `httpOnly` impide que un XSS robe el JWT, pero no que llame a las
  Server Actions desde la página; la CSP impide que ese script se ejecute.
  Scripts: solo con nonce + `'strict-dynamic'` (así cargan los chunks de Next y
  el de Turnstile). Estilos: `'unsafe-inline'` SIN nonce, porque Mantine y
  Recharts escriben atributos `style` y un nonce anularía `'unsafe-inline'`.
  `upgrade-insecure-requests` solo si la petición llega por https. Se descartó
  la CSP por hashes (SRI experimental): todas las rutas ya son dinámicas.
- **Tests**: Vitest + fast-check sobre PGlite (Postgres real en proceso, con un
  stub del esquema `auth`, `int8` como texto igual que postgres-js); Testing
  Library para componentes y hooks (con Refine real); Playwright para cinco
  flujos E2E. Detalle en `docs/TESTS.md`.
- **E2E contra un segundo proyecto de Supabase** (`teachcash-e2e`, plan gratuito)
  y el build de producción en el puerto 3100, con las claves de PRUEBA de
  Turnstile. Solo en local: en CI gastarían minutos y obligarían a guardar en
  GitHub las claves de ese proyecto. Cada test es un invitado nuevo, así que no
  hay que limpiar la base. Pasos del panel en `.env.e2e.example`.
- **Coverage por niveles, por fichero** (`vitest.config.mts`): CORE 100 % (dinero,
  fechas, formato, rutas, CSP, la corrección del héroe y las marcas del
  contenido), CORE 90 % (repositorios, acciones, sesión,
  entorno, log), IMPORTANT 80 % (`GenericForm`, `AppTable`, hooks) e INFRA
  excluido (tipos, `src/presentation/entidades`, migraciones, estilos). Un umbral no se baja: se
  escribe el test o la rama inalcanzable se marca con su porqué.
- **Quality gates gratis**: Husky + lint-staged en cada commit (ESLint sobre lo
  que entra y `typecheck`) y GitHub Actions en cada PR a `develop`
  (`calidad.yml`: typecheck, lint, coverage, `test:tz`, build y `pnpm audit`). El
  CI no corre en push (la PR ya prueba la mezcla) ni en PRs que solo tocan
  documentación; se salta con un job y no con `paths-ignore` para no dejar
  colgado un check obligatorio. `--no-verify` solo en emergencias.
- **Repositorio público**: minutos de Actions ilimitados, checks obligatorios
  (`develop` exige los tres del CI para mergear), secret scanning y push
  protection, todo gratis. Se hizo tras revisar
  el historial entero: ningún secreto se ha commiteado nunca. La seguridad no
  depende de que el código sea secreto (RLS, sesión verificada, `userId` en cada
  `where`).
- **Zod en la frontera** (`src/application/actions/frontera.ts`): `ListParams`,
  ids, rango de la serie de saldo, periodo y meses se validan antes de llegar al
  repositorio. Los topes viven con nombre en `src/types/limites.types.ts`: importe
  y presupuesto ≤ 1.000.000.000 céntimos, 100 filas por página, 5.000 sin
  paginar, serie de saldo ≤ 731 días.
- **Cuotas por usuario en la base**, sin Redis: 200 movimientos y 100 KB de
  texto para un invitado, 4.000 movimientos y 5 MB de texto para una cuenta, y
  200 categorías. El texto cuenta BYTES de descripción y notas (un emoji son
  4), porque la cuota de movimientos sola dejaba que uno con el texto al máximo
  ocupara cien veces lo normal. Se comprueban con el candado del usuario
  (`conCandado`, `transaccion.ts`): sin él, dos altas a la vez contaban las dos
  antes de escribir. Editar a menos texto siempre se puede. Al superarlas, un
  `RepositoryError` legible.
- **Freno general por tamaño de la base** (`capacidad.repository.ts`): con la
  base por encima de 400 MB (el plan gratuito tiene 500) no se crean
  invitados, movimientos ni categorías; leer, editar y borrar siguen. Deja un
  evento `capacidad`/`bloqueo` para la alerta. Se mira en cada alta, sin caché:
  `pg_database_size` cuesta milisegundos y una caché por instancia dejaría
  pasar altas.
- **No se anotan movimientos con fecha futura.** El tope es el "hoy" de
  `Pacific/Kiritimati`, la zona más adelantada del planeta, para no rechazar el
  hoy de nadie; el `DateInput` lleva `maxDate` como cortesía. La serie de saldo
  llega por defecto hasta `max(hoy, último movimiento)`.
- **Cambiar la contraseña pide la actual** (y CAPTCHA) si la sesión se abrió con
  contraseña, según el claim `amr` del JWT verificado. Desde el enlace de
  recuperación no: quien llega así no la conoce.
- **`allocate` reparte el resto por mayor parte decimal** (método del resto
  mayor), no por orden: el céntimo sobrante va a quien le corresponde.
- **El entorno se valida al arrancar** (`lib/env.ts`, llamado desde
  `instrumentation.ts`): una variable que falta o está mal para el servidor con un
  mensaje que dice cuál, en vez de un error genérico en la primera petición.
- **Errores al log sin datos** (`lib/log.ts`): nombre, código y mensaje, sin los
  `params` de Drizzle, que llevan importes y descripciones.
- **Auditoría de seguridad (noviembre de 2026)** contra OWASP Top 10 2025, OWASP
  API Top 10 2023 y la skill `cloudflare/security-audit-skill`. Todo lo hecho y
  por qué, en `docs/SECURITY.md`. Lo que cambia cómo se escribe código:
  - **Límite de peticiones** en memoria (`lib/limite.ts`): 300 acciones/min por
    usuario en `ejecutar`, y en auth 20 cada 10 min por IP y 10 intentos de
    contraseña cada 15 min por CUENTA (Supabase limita por IP, pero solo ve la
    del servidor). Sin almacén compartido a propósito: ver Decisiones abiertas.
  - **Eventos de seguridad** con `registrarEvento` (`lib/log.ts`): JSON con
    `tipo: "seguridad"`, el `userId` y la IP recortada, nunca el email. Una
    acción de cuenta nueva deja el suyo.
  - **`APP_URL`** es el origen de los enlaces de email y es **obligatoria en
    producción**: `validarEntorno` no arranca sin ella y `origen()` no recurre
    a las cabeceras. Fuera de producción, el origen de las cabeceras se valida.
    Los E2E la toman de `playwright.config.ts` y el CI lleva un relleno.
  - **La API REST no tiene permisos de escritura** (migración 0009, `REVOKE`):
    segunda red bajo las políticas de solo lectura. Una tabla nueva tampoco
    nace con ellos (`alter default privileges`).
  - **Cambiar la contraseña cierra las demás sesiones**, y `/auth/confirm`
    acepta solo `?code=` (PKCE): `?token_hash=` permitía un login CSRF.
  - Server Actions con cuerpo ≤ 256 KB, `page` ≤ 4.000, cabeceras CORP y
    compañía, y la CSP también en las rutas con extensión de imagen.
- **Dependencias sin un solo aviso de `pnpm audit`** (producción y desarrollo):
  `xlsx` 0.20.3 del CDN oficial de SheetJS (npm se quedó en una versión con
  CVEs), VENDORIZADO en `vendor/` para que el lockfile lleve su hash (desde el
  CDN no lo llevaba), overrides documentados en `pnpm-workspace.yaml` y un parche de
  `findup-sync` para quitar `braces` (sin versión parcheada). Dependabot mensual
  y agrupado.
- **El repo es LF** (`.gitattributes`): un CRLF hace que los `modify` de Plop no
  casen y se salten en silencio.
- **Acciones del CI fijadas por SHA** con la versión en un comentario: un tag
  se puede mover y ejecutaría código sin revisar.
- **Las capas, impuestas por ESLint** (`no-restricted-imports`): `src/presentation`
  no importa de `src/infrastructure`, solo los repositorios
  importan `@/db`, y `lib/`/`db/` no importan de `src/`. También sonarjs
  (complejidad 15), `no-console` y las reglas de Vitest (sin `.only`, todo test
  con aserción).
- **`AppTable` partido** en `columnas.ts` (lógica pura de filtros y orden),
  `FiltroColumna.tsx` y `CeldaPorDefecto.tsx`, con los tests escritos antes del
  corte. `desdeLista` (`createEntityHooks.ts`) toma el registro de la lista ya en
  caché con la clave que construye Refine.
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
- **Menú lateral de módulos** (`SideMenu`): la Navbar lleva las secciones del
  módulo en el que estás; el menú lateral cambia de MÓDULO (Gestión de
  patrimonio y Camino del héroe). El módulo activo sale de la ruta
  (`moduloActivo`): el de prefijo más largo, y la raíz para todo lo demás.
  Escondido, solo asoma una
  pestaña con tres rayas en el borde izquierdo; se abre al pasar el ratón y se
  cierra al salir, con 220 ms de margen para que una diagonal torpe no lo cierre.
  El hover no es la única vía: la pestaña es un `<button>` (toque y Enter
  alternan; un clic de ratón solo abre, porque el hover ya lo había abierto),
  Escape cierra, y el panel va `inert` mientras está escondido. Un módulo por
  llegar no es un enlace deshabilitado sino texto con "Próximamente".
  Para que se descubra, la pestaña va en verde de marca con la palabra "Menú"
  y, una vez por sesión, el panel se asoma al terminar la pantalla de carga
  (escucha `EVENTO_FIN_SPLASH`; no se asoma con el movimiento reducido).
- **El aviso de invitado se puede cerrar, pero vuelve el último día.** Antes no
  se podía cerrar, por ser la única señal de que los datos se borran; se abrió
  porque molestaba. El cierre se guarda en `localStorage` con la fecha de
  borrado DE ESE invitado (otro invitado lo vuelve a ver) y deja de valer 24 h
  antes del borrado, cuando aún se está a tiempo de crear la cuenta. El script
  del `<head>` de `app/layout.tsx` lo esconde antes del primer pintado para que
  no salte la página en cada recarga: clave y margen están en los dos sitios.
- **Movimiento**: tres gestos y ni uno más (`sd-rise`, `sd-pop`, `sd-underline`
  en `globals.css`), más el conteo de las cifras grandes (`AnimatedMoney`). El
  escalonado va por `:nth-child()` en CSS y no por una variable inline en el JSX,
  porque la regla de "ni un `style` suelto" no admite excepciones "solo para un
  delay". Todo queda anulado por el bloque `prefers-reduced-motion`; en
  `AnimatedMoney`, que es JavaScript, se comprueba además con `matchMedia`.
- **Comprar en la tienda se nota, y es pixel art, no interfaz.** La pieza baja y
  parpadea en el probador (`px-estreno`) y cuatro destellos titilan alrededor
  (`px-destello`, con el sprite `DESTELLO`), en `pixel.module.css` y a saltos con
  `steps()`. No se usó `sd-pop`: escala en continuo, y un sprite a medio píxel se
  emborrona; los tres gestos siguen siendo los de la interfaz. Las estrellas bajan
  contando con `AnimatedCount`, que comparte la cuenta con `AnimatedMoney`
  (`useCuenta`) porque las estrellas no son dinero. Solo se anima lo que se acaba
  de comprar: la tienda marca el id al pulsar y el estreno se DERIVA de que ya
  conste como comprado, así que llega en el mismo render que los datos y no
  retrasa la compra; al cargar o al equipar no hay marca. Con el movimiento
  reducido no se pide (`matchMedia`) y el CSS lo deja en la pieza quieta y los
  destellos apagados. El gesto solo se ve, así que un `role="status"` lo cuenta.
- **Tipografía**: Fredoka para titulares, botones y etiquetas; Nunito para el
  texto corrido; **Geist Mono para el dinero**, y esta última no es estética: los
  importes en columna necesitan cifras de ancho fijo para poder compararse, y
  ninguna tipografía redondeada lo garantiza.
- **Gráficos**: Recharts. Los colores de ingreso y gasto viven en
  `app/globals.css` (`--income` / `--expense`) y están validados con el script de
  la skill `dataviz` contra cada superficie (claro y oscuro por separado). Si los
  cambias, vuelve a pasar el validador; no los ajustes a ojo. El color nunca es
  la única señal: los importes llevan siempre su signo.

- **Patrimonio en `profiles`**, no como movimiento. Una fila por usuario
  (`user_id` es la clave primaria, con RLS y cascada) con dos cifras en
  céntimos y con signo (se puede deber dinero): `net_worth_without_movements`, la BASE
  (patrimonio = base + movimientos), y `first_net_worth`, el PRIMER patrimonio
  que eligió, que no cambia y es contra lo que el Cuadro mide el "desde que
  empezaste". Lo que la persona escribe, la primera vez y con el lápiz, es
  siempre el TOTAL de hoy: el lápiz sale relleno con la cifra de la tarjeta y
  el servidor guarda base = total - movimientos (`guardarPatrimonio`). Así
  quien no anota movimientos lleva su patrimonio solo editándolo, y editarlo
  cuenta como ganancia o pérdida igual que un movimiento. Antes se editaba la
  base, y el lápiz enseñaba una cifra que no era la de la tarjeta. Que no haya
  fila es "aún no lo ha elegido", y entonces la tarjeta de Patrimonio de
  Inicio pregunta "¿Con cuánto empiezas?" (`ElegirPatrimonio`), con "Empezar
  en 0 €" como salida. Sustituye a la
  antigua decisión de anotarlo como ingreso "Saldo inicial", que inflaba los
  ingresos del mes y el gráfico de ingresos frente a gastos y obligaba a darle
  categoría. El patrimonio sigue siendo derivado (regla dura 7): inicial + suma
  de movimientos, y la serie de saldo arranca en el inicial.
- **Navegar por meses en Inicio**: flechas en la cabecera, del mes actual hacia
  atrás hasta `INICIO_MES_MINIMO` (enero de 2026). El mes va en `?mes=YYYY-MM`
  (el actual, sin parámetro) con `router.replace`, para que "atrás" salga de
  Inicio. Lo que llega por la URL se acota (`clampPeriod`). Se mueven las tres
  tarjetas del mes; el patrimonio es siempre el de hoy y los dos gráficos de
  tendencia siguen en los últimos 12 meses. El tope es de navegación y no se
  impone en el servidor: un movimiento anterior sigue siendo válido.
- **Camino del héroe** (plan completo en `docs/plans/CAMINO_HEROE.md`):
  - **El contenido es JSON en el repo; la base guarda solo el progreso**
    (`hero_progress`: usuario + nivel, mejor marca, intentos y primera vez
    superado). Un curso se revisa en una PR y un JSON mal escrito rompe la CI
    (`pnpm heroe:validar`). Si algún día lo edita alguien que no programa, se
    cambia `contenido.ts`, el único que lo lee.
  - **Corrige el servidor** (regla dura 6). El cliente tiene las soluciones
    para el feedback inmediato, pero manda las respuestas en bruto y el
    repositorio calcula aciertos, estrellas y superado. La mejor marca no baja
    al repetir (`greatest()` en el upsert).
  - **Los mundos están libres; dentro, los niveles van en orden.** Un nivel
    bloqueado no se lee ni se envía: "No encontrado", como uno que no existe.
    Todo lo del mapa y del camino es derivado (regla dura 7).
  - **Mapa**: cada mundo es un planeta a píxel con su decorado y sus
    habitantes; se ven tres y la fila sigue al héroe, que corre al mundo
    elegido. Un mundo con `"niveles": []` sale apagado como "Pronto".
  - **Camino**: sube de abajo (el primer nivel) arriba (el jefe), y el jefe es
    un monstruo de cuerpo entero del color de su mundo, no un icono.
  - **El héroe acompaña mientras se juega**: de pie sobre el borde superior de la
    tarjeta y por fuera, a la derecha, en la lectura y las preguntas
    (`ProgresoNivel`), con la pose `agacha`: lenta y de solo dos píxeles. Va en
    absoluto porque no debe alargar la página: un nivel tiene que caber en la
    pantalla. La cabecera le reserva el sitio (`heroeEncima` de `PaginaHeroe`).
  - **Todo es pixel art propio** (`components/Pixel/`): sin ficheros de imagen,
    así no se toca la CSP, no pesa y sigue el modo oscuro. Los colores de las
    ilustraciones son variables `--px-*` locales a su módulo, no tokens
    `--sd-*`; los únicos `*.module.css` que pueden declarar hexadecimales son
    los de ilustración (lista en `src/__tests__/invariantes.test.ts`).
  - **`**negrita**` y `_cursiva_` con un analizador propio** (`lib/marcas.ts`)
    que devuelve nodos de React: nunca `dangerouslySetInnerHTML`. Bloques de
    lectura `imagen` (un sprite de la app) y `dato` (con fuente obligatoria).
    Los títulos del contenido no llevan emoticonos; en el texto sí, y se
    pintan pixelados con un filtro SVG.
  - **El personaje de los ejemplos se llama Pepito**, siempre.
  - Aviso fijo en todo el módulo: "Contenido educativo, no asesoramiento
    financiero".
- **Cuadro de mando y Tienda**:
  - **`/` es el Cuadro de mando** y el Inicio de siempre se mudó a `/Patrimonio`.
    Cada módulo declara sus rutas (`MODULOS` en `SideMenu.tsx`) y `moduloActivo`
    decide también los enlaces de la Navbar. Lo que no es de ninguno, como Login,
    se queda en el Cuadro. Quien aún no ha elegido patrimonio inicial lo ve como un
    enlace en la tarjeta; la pregunta sigue en `/Patrimonio`.
  - **Dos héroes**: el pequeño (32x44) en el splash y en el Camino, y el grande
    (48x66) en el Cuadro y la Tienda. Se probó uno de 64x88 con más detalle y se
    descartó: dejaba de ser el personaje. El grande es el pequeño calcado; si
    retocas uno, compáralo con el otro.
  - **El héroe del Camino lleva su equipo; el del splash, no** (sale antes de que
    haya sesión). Cada pieza tiene un segundo dibujo a 32x44 (`spritesEquipo.ts`),
    redibujado y no reducido, con la misma paleta por calidad. El héroe pequeño no
    cambia: el equipo son capas encima o debajo. En las poses: las botas tienen
    los tres fotogramas de las piernas; el arma va en la mano derecha y se
    balancea con ella; el escudo, en la izquierda, y al celebrar (ese brazo sube
    con el billete) pasa a la espalda, detrás del cuerpo; el guante izquierdo
    sube con el puño. El arma va DETRÁS del brazo, para que la mano se cierre
    sobre el puño de la espada.
  - **El equipo del Camino se pide una vez, en su layout** (`EquipoDelCamino`, con
    `useTienda`: ninguna consulta nueva) y llega a cada héroe por contexto
    (`HeroeCamino`). Sin proveedor, o si la tienda falla, el héroe sale sin
    equipo: es decorado. El reparto vive aparte del héroe para que los
    componentes del Camino no arrastren las Server Actions de la tienda.
  - **Lo que sale de la caja del héroe no añade alto.** En `ProgresoNivel` el
    `<svg>` es `overflow: visible` y va en absoluto; el título reserva 7,5rem por
    las alas. En Resultado y en la presentación del jefe el héroe se corre a la
    derecha en vez de ensanchar el `viewBox`, que dejaría la escena a una escala
    que no es entera.
  - **Estrellas derivadas** (regla dura 7): las ganadas salen de `hero_progress`, las
    gastadas de `hero_items.price_paid`, y no se guarda ningún saldo. Comprar no le
    quita nada a un nivel. Solo se ganan con los cursos: inventarse movimientos no
    da nada en la tienda, solo sube Riqueza y Constancia.
  - **Comprar va con candado** (`pg_advisory_xact_lock` por usuario, dentro de la
    transacción): sin él, dos clics seguidos gastan dos veces las mismas estrellas.
    PGlite tiene una sola conexión, así que el test de compras simultáneas no
    distingue si el candado está o no: lo sostiene esta nota.
  - **Catálogo en código** (`lib/tienda.ts`), con tres calidades por tipo que son un
    dibujo y tres paletas (`data-calidad`). Precios contra las 108 estrellas que
    existen: ir entero de lo mejor cuesta 75, pero no da para comprarlo todo. Se
    guarda lo pagado para que cambiar un precio no altere lo ya gastado. Las
    compras no se devuelven.
  - **El progreso y las compras son de solo lectura para la API**
    (`soloLeerLoSuyo` en `hero_progress` y `hero_items`, en vez de `soloSuyo`):
    con su propia sesión, cualquiera podía escribir esas filas por la API REST de
    Supabase y regalarse estrellas u objetos. Las escribe solo el servidor, cuyo
    rol se salta RLS. Lo que sigue siendo posible, y se acepta: sacar 3 estrellas
    mirando las soluciones que el navegador recibe para corregir al momento, e
    inflar Riqueza y Constancia inventándose movimientos (que no dan estrellas).
  - **Siete estadísticas de 0 a 100, derivadas** (`lib/estadisticas.ts`): una por
    mundo (niveles superados), Riqueza por tramos de ganancia (ni porcentaje, que
    divide entre cero si se empieza en 0 €, ni euros en lineal), Constancia (meses
    en positivo de los últimos 12) y Poder (precio de lo EQUIPADO sobre lo máximo
    equipable: quitarse algo lo baja). El radar lleva el dominio fijo de 0 a 100, y
    la ficha que sale al pasar por encima es su alternativa accesible.
  - **El Cuadro de mando no lleva tarjetas**: es una pantalla de juego, con el
    héroe en el centro sobre su isla (`EscenarioHeroe`), el patrimonio arriba a
    la izquierda, el radar arriba a la derecha y las estrellas debajo. Sin leyenda
    del equipo: al PASAR el ratón por una parte del cuerpo (sin clic), la pieza
    se resalta en su sitio con un anillo bajo ella y sale un bocadillo con su
    nombre o "Sin …". El resto del héroe no cambia: se probó desteñirlo y no
    gustó. Con el dedo se toca y se cierra tocando fuera. El héroe se pinta a la
    mayor escala entera que cabe sin scroll (`useEscalaEscenario`).
    El radar es un SVG propio y no Recharts, con la clave y la cifra en cada
    punta; el 0 cae en un anillo pequeño y no en el centro, para que siete
    ceros no se tapen. Su ficha es un modal que abre un icono de información y
    que solo se cierra con la cruz (y con Escape): se probó abrirla al pasar el
    ratón y saltaba sin querer. El lector de pantalla tiene la lista entera sin
    abrir nada; el polígono va en los dos verdes del sol del héroe, sin trazo
    ni sombra, como parte del escenario. Las estrellas, una estrella dibujada
    como la interfaz (no a píxel) con la cifra encima en su esquina, dorada y
    con borde de tinta, y un enlace gris a la tienda: lo ganado y lo gastado se
    ve allí.

## Decisiones abiertas

Anótalas aquí al resolverlas; no las asumas en silencio.

- **Camino del héroe, contenido**: los cuatro mundos tienen sus 9 niveles,
  escritos y **pendientes de revisión humana**. La lista de cifras oficiales,
  con su estado (verificada, corregida o no verificada) y su fuente, está en
  `docs/investigación-heroe/revision-cifras.md`; nada se publica sin esa
  lectura (fase 6 de `docs/plans/CAMINO_HEROE.md`).
- **Camino del héroe, vidas y rachas**: fuera de la primera versión a
  propósito. Si llegan, son progreso derivado o una tabla aparte, nunca un
  contador guardado junto a la mejor marca.
- **Camino del héroe, "Mi progreso"**: la Navbar del módulo solo tiene
  "Mundos"; una pantalla de progreso global está pensada, no hecha.
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
- **Filtros de columna en modo servidor**: solo se ofrece "es igual a". Si
  Movimientos necesita operadores ricos, hay que enseñárselos al repositorio
  primero.
- **Login con Google**: aplazado. Sería credenciales en Google Cloud Console,
  el proveedor en Supabase y `linkIdentity` para convertir un invitado en cuenta
  de Google sin perder sus datos.
- **SMTP propio**: pendiente hasta abrir la app a otros. Con él se pueden poner
  las plantillas de email en español y con enlaces `token_hash`, que funcionan
  desde cualquier dispositivo (hoy, con `code`, solo en el mismo navegador).
  `/auth/confirm` ya NO acepta `token_hash` (se quitó por login CSRF): volver a
  aceptarlo exige una página intermedia que diga con qué cuenta se va a entrar
  y lo confirme con un botón, en vez de cambiar la sesión al abrir el enlace.
- **Límite de peticiones compartido**: hoy es en memoria por proceso
  (`lib/limite.ts`). Con varias instancias cada una cuenta lo suyo. Si se
  despliega en más de una, Redis (Upstash) o una tabla con su coste.
- **Fusionar los datos del invitado al iniciar sesión** en una cuenta que ya
  existe: hoy se avisa y no se fusionan.
- **Endurecimiento opcional**: MFA TOTP.
- **Rol de base de mínimo privilegio**: la app se conecta con un rol que se salta
  RLS. Uno propio con permisos solo sobre las tablas de la app acotaría el daño
  de una inyección; hoy lo frena el `userId` en cada `where`.
- **Observabilidad (Sentry o similar)**: fuera por coste y privacidad. Hoy solo
  hay logs saneados (`lib/log.ts`).
- **`noUncheckedIndexedAccess`**: aplazado. Activarlo daba 106 errores (66 en
  tests).
- **E2E en CI**: hoy solo locales. Si un día se quieren en GitHub, sería un
  `workflow_dispatch` manual con las claves del proyecto `teachcash-e2e` como
  secrets.
