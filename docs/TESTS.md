# Tests y calidad de TeachCash

Todo lo que hay que saber para escribir, ejecutar y mantener los tests de este
repo, y los controles que impiden que algo roto llegue a `develop`. AGENTS.md
remite aquí para todo lo de tests.

La idea que lo ordena todo: **se testea lo que falla en silencio.** Un botón
desalineado se ve; un saldo mal sumado, un filtro que no filtra o un dato de otro
usuario no se ven, y en una aplicación de dinero parecen datos.

## 1. Cómo se ejecuta cada suite

| Comando | Qué ejecuta | Necesita |
|---|---|---|
| `pnpm test` | Vitest: los 41 ficheros `*.test.ts(x)` (750 casos) | Nada. No toca Supabase |
| `pnpm test:tz` | La misma suite con `TZ=Pacific/Kiritimati` (UTC+14) | Nada |
| `pnpm test:coverage` | La suite con cobertura y los umbrales por fichero (§4) | Nada. Informe en `coverage/index.html` |
| `pnpm test:e2e` | Playwright: 4 flujos sobre el build de producción y un Supabase de pruebas | `.env.e2e` (ver §2.4) |
| `pnpm test:e2e:ui` | Lo mismo, con la interfaz de Playwright para depurar paso a paso | `.env.e2e` |
| `pnpm test:e2e:visual` | La regresión visual de Inicio (escritorio y móvil). La primera vez, con `--update-snapshots` | `.env.e2e` |

Antes de dar algo por terminado:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:tz
```

Si has tocado algo que se ve en el navegador (formularios, tablas, estilos,
`layout.tsx`), pasa también `pnpm test:e2e`.

- **`test:tz` no es redundante.** Es lo que caza una fecha que se ha colado como
  instante en lugar de como fecha civil (regla dura 5): en Madrid pasa, en UTC+14
  el movimiento salta de día.
- **Reproducir una propiedad que falla.** fast-check imprime la semilla; se repite
  exactamente con `FC_SEED=<semilla> pnpm test`.
- **Un fichero suelto:** `pnpm exec vitest run ruta/al/fichero.test.ts`.

## 2. Cómo está montado

### 2.1 Vitest con dos proyectos (`vitest.config.mts`)

| Proyecto | Ficheros | Entorno | Para qué |
|---|---|---|---|
| `node` | `**/*.test.ts` | Node, `pool: 'forks'` | Dominio, repositorios, acciones, base de datos |
| `dom` | `**/*.test.tsx` | jsdom + Testing Library | Componentes y hooks |

Los dos excluyen `e2e/**`. `clearMocks` y `restoreMocks` dejan los dobles limpios
entre tests: un `vi.spyOn(console, 'error')` se deshace solo.

### 2.2 Postgres real en proceso (PGlite)

Los tests de repositorio y de acciones corren contra **Postgres de verdad**: PGlite
es el mismo motor compilado a WASM, dentro del proceso de test, con **las
migraciones reales** aplicadas. Nunca contra Supabase, y nunca con el ORM
mockeado: los bugs de agregación y de dialecto viven justo en el SQL que un mock
no llega a ejecutar.

`db/testing.ts` lo prepara así:

- **Stub del esquema `auth`** de Supabase antes de migrar: `auth.users`,
  `auth.uid()` (lee `request.jwt.claim.sub`) y los roles `anon` y `authenticated`.
  Las claves ajenas de `user_id` y las políticas RLS dependen de él. Si una
  migración nueva usa algo más de `auth`, se añade ahí.
- **Plantilla**: la primera base se migra una vez; cada test arranca de una copia
  de su directorio de datos. Base nueva por test sin pagar la migración cada vez.
- **`int8` y `numeric` como texto**, igual que postgres-js en producción. Es lo
  que hace que quitar un `.mapWith(Number)` ponga tests en rojo: sin esto, PGlite
  devolvía números y el bug de `'100' + '50' = '10050'` era invisible.
- Usuarios: `USER_A` y `USER_B` ya existen en `auth.users`; otro, con
  `crearUsuario(pg, id, { anonimo, email })`.

### 2.3 Lo único que se sustituye

Dos cosas, y solo dos: **de dónde sale la conexión** (`@/db`) y **quién es el
usuario de la sesión** (`@/lib/auth`).

```ts
vi.mock('@/db', async () => (await import('@/test/mocks/db')).dbMock())
vi.mock('@/lib/auth', async () => (await import('@/test/mocks/auth')).authMock())

const ctx = usarBaseDeTest()   // base nueva por test y sesión de USER_A
harness.userId = USER_B         // cambiar de usuario dentro de un test
harness.userId = null           // sin sesión
```

`test/harness.ts` guarda el estado y `test/mocks/` lo lee. El mock de `@/db` es un
**getter** porque la base cambia en cada `beforeEach` y el módulo se evalúa una
sola vez. Las semillas de datos (`seedCategoria`, `seedMovimiento`…) están en
`src/infrastructure/repositories/__tests__/helpers.ts`. `seedMovimiento` elige una
categoría de ingreso o de gasto según el signo, para no crear datos imposibles.

Cómo se verifica de verdad el JWT lo prueba `lib/__tests__/auth.test.ts` contra el
`lib/auth.ts` real.

### 2.4 Componentes (`*.test.tsx`)

- `test/render.tsx` → `renderConMantine(ui, { queryClient? })`: monta
  `MantineProvider env="test"` (sin transiciones ni portales, para que un
  desplegable recién abierto exista ya) y devuelve un `userEvent` preparado.
- `test/refine.tsx` → `envoltorioRefine(queryClient)`: **Refine real** con el data
  provider y los recursos reales. Solo se sustituyen las Server Actions. Así se
  prueban también las claves de caché que construye Refine, que es donde una
  invalidación puede no casar con nada sin avisar.
- `test/setup/dom.ts`: lo que jsdom no trae y Mantine necesita (`matchMedia`,
  `ResizeObserver`, `scrollIntoView`).

### 2.5 E2E con Playwright (`e2e/`)

- **Contra qué**: el build de PRODUCCIÓN (`pnpm build` + `next start` en el puerto
  **3100**) y un segundo proyecto de Supabase, `teachcash-e2e`, del plan gratuito.
  Nunca el de desarrollo.
- **Aislamiento**: cada test abre un contexto de navegador sin cookies, así que la
  app le crea un **invitado nuevo**. No hay que limpiar la base: cada invitado solo
  ve lo suyo y el job de `pg_cron` borra los caducados.
- **`e2e/entorno.ts`** se niega a arrancar si falta una variable de `.env.e2e`, si
  apunta al mismo proyecto que `.env.local` o si la clave de Turnstile no es la de
  prueba. Sin él, Next rellenaría el hueco con `.env.local` y los tests escribirían
  en la base de desarrollo.
- **Page Objects** en `e2e/pages/`: se busca por rol y nombre accesible, igual que
  en los tests de componente. Si un selector deja de casar, casi siempre es que la
  interfaz ha perdido un nombre accesible, y eso también es un bug.
- **Se navega por el menú, nunca con `page.goto`** después de entrar. `goto`
  recarga y tira la caché de React Query, y con ella lo que hay que probar: que
  cada mutación invalida `['informes']`.
- `reducedMotion: 'reduce'`: `AnimatedMoney` enseña la cifra final al momento.
- **Visual**: opt-in (`E2E_VISUAL=1`), solo local. Las capturas dependen del
  sistema operativo (las de `e2e/visual.spec.ts-snapshots/` son de Windows). Tapa
  lo que cambia con el calendario: el mes, los gráficos y la caducidad del invitado.
- **No corren en CI**: ahorran minutos y no obligan a guardar en GitHub las claves
  del proyecto de pruebas.

**Montar el proyecto `teachcash-e2e`** (una vez; los pasos detallados, en
`.env.e2e.example`):

1. Proyecto nuevo en Supabase (Free). Copiar `.env.e2e.example` a `.env.e2e` y
   rellenarlo. `NEXT_PUBLIC_SUPABASE_URL` es `https://….supabase.co` **sin**
   `/rest/v1`.
2. `pnpm db:migrate:e2e` (lee `.env.e2e`, no `.env.local`).
3. Activar la extensión `pg_cron` y ejecutar `db/sql/limpieza-invitados.sql` en el
   SQL Editor.
4. Auth: inicios de sesión anónimos ON; CAPTCHA Turnstile con la secret de prueba
   `1x0000000000000000000000000000000AA`; Site URL `http://localhost:3100` y
   Redirect URL `http://localhost:3100/**`; límite de usuarios anónimos subido a
   300/h (cada test crea uno).

El plan gratuito **pausa el proyecto tras 7 días sin uso**. Si `pnpm test:e2e`
falla al conectar, se restaura gratis desde el panel (*Restore project*).

## 3. Mapa: qué fichero cubre qué

Recuento de casos de Vitest a fecha de la Fase 7 de calidad. RD = regla dura de
AGENTS.md.

### Dinero, fechas y formato (`lib/`)

| Fichero | Casos | Qué cubre | RD |
|---|---|---|---|
| `lib/__tests__/money.test.ts` | 32 | Aritmética entera, signos, `mul` con negativos y `-0.5`, `allocate` justo (resto mayor), parseo de importes, que mezclar divisas lance. Propiedades con fast-check | 1, 2 |
| `lib/__tests__/format.test.ts` | 29 | `formatMoney` en es-ES, signo, ida y vuelta input → `parseMoney` | 1 |
| `lib/__tests__/dates.test.ts` | 22 | Fechas civiles, periodos, rangos de mes, `addDays`/`daysBetween` inversos, reloj congelado | 5 |
| `lib/__tests__/rutas.test.ts` | 12 | `rutaInterna`: ninguna redirección sale del sitio (`//x`, `/\x`, `https://…`) | — |
| `lib/__tests__/auth.test.ts` | 21 | `getSession`: el `userId` sale solo del `sub` de `getClaims()` verificado | 3 |
| `lib/__tests__/env.test.ts` | 18 | Entorno validado al arrancar; URL de Supabase con ruta rechazada | — |
| `lib/__tests__/csp.test.ts` | 7 | La CSP con nonce y sus directivas | — |
| `lib/__tests__/log.test.ts` | 4 | Los errores se registran sin `params` de Drizzle (ni importes ni descripciones) | — |
| `lib/__tests__/colores.test.ts`, `ids.test.ts` | 4 + 3 | Claves de la paleta; bits de versión y variante del UUID | — |

### Base de datos y repositorios

| Fichero | Casos | Qué cubre | RD |
|---|---|---|---|
| `db/__tests__/schema.test.ts` | 22 | RLS en `categories` y `transactions` (SELECT, UPDATE, DELETE, WITH CHECK); catálogo: **toda tabla de `public`** tiene RLS y `user_id` con cascada; borrar un usuario se lleva sus datos | 4 |
| `repositories/__tests__/movimientos.repository.test.ts` | 48 | CRUD, `update` (gasto ↔ ingreso, categoría ajena), fechas futuras prohibidas, filtros, orden, paginación, idempotencia entre usuarios, aislamiento | 1, 4, 5 |
| `repositories/__tests__/categorias.repository.test.ts` | 47 | CRUD, nombre único, ocultar/activar, borrado en cascada de sus movimientos, catálogo inicial | 4 |
| `repositories/__tests__/informes.repository.test.ts` | 27 | Agregaciones; **el saldo actual = el último punto de la serie** (propiedad) | 7 |
| `repositories/__tests__/cuenta.repository.test.ts` | 7 | Fecha de alta y borrado de la cuenta | — |
| `repositories/__tests__/cuotas.repository.test.ts` | 3 | Cuotas por usuario (invitado < cuenta) | — |
| `repositories/__tests__/metadata.repository.test.ts` | 7 | Opciones de los select, sin claves del prototipo | — |
| `repositories/__tests__/postgres-errors.test.ts` | 9 | Carreras contra las UNIQUE (`23505`) traducidas a id existente o error de campo | — |
| `repositories/__tests__/types.test.ts` | 4 | `RepositoryError` y `fromFieldErrors` | — |

### Acciones, proveedor y rutas

| Fichero | Casos | Qué cubre | RD |
|---|---|---|---|
| `actions/__tests__/entity.actions.test.ts` | 37 | El dispatcher: mapa cerrado de recursos (`__proto__`, `constructor`…), sesión, propiedad, errores devueltos y no lanzados | 3, 4 |
| `actions/__tests__/frontera.actions.test.ts` | 43 | Zod en la frontera: `ListParams`, ids, rango de la serie (≤ 731 días), periodo, meses, topes | 3, 6 |
| `actions/__tests__/auth.actions.test.ts` | 65 | Invitado, login, registro (el invitado conserva su id), contraseña actual según `amr`, borrar cuenta, mensajes que no revelan si un email existe | 3 |
| `actions/__tests__/informes.actions.test.ts` | 8 | Informes sin sesión y con error genérico | 3 |
| `providers/__tests__/refine-data-provider.test.ts` | 11 | La traducción Refine → Server Actions y de vuelta (errores a excepción en el cliente) | — |
| `app/auth/confirm/__tests__/route.test.ts` | 10 | `code` frente a `token_hash`, `type` fuera de lista, enlace inválido, `next` externo filtrado | — |
| `src/__tests__/cabeceras.test.ts` | 7 | Cabeceras de seguridad de `next.config.ts` | — |

### Guardas estructurales (`src/__tests__/invariantes.test.ts`, 31 casos)

Leen el código fuente y fallan si se rompe una convención que, si no, fallaría en
silencio:

- Las claves de `REFINE_RESOURCES` son exactamente las de `REPOSITORIES`.
- `src/config/` no lleva JSX y ningún campo ni columna es `type: 'number'` (RD 1).
- Todo `component:` o `render:` lleva `dependsOn`.
- `VIDA_INVITADO_DIAS` coincide con el `interval` de `limpieza-invitados.sql`.
- El cliente de base desactiva las sentencias preparadas (`prepare: false`).
- Ningún `*.module.css` lleva un hexadecimal (modo oscuro).

### Componentes y hooks (`*.test.tsx`)

| Fichero | Casos | Qué cubre |
|---|---|---|
| `GenericForm/__tests__/GenericForm.test.tsx` | 32 | Campos por tipo, `fieldErrors` asociados a su etiqueta, `visibleWhen`, `disabledWhen`, `dependsOn` |
| `GenericForm/__tests__/MoneyInput.test.tsx` | 20 | `1.234,56` publica `123456`; negativos; coma y punto; texto no válido publica `null` |
| `AppTable/__tests__/AppTable.test.tsx` | 8 | Columna `money` en euros; modo servidor: avisa con la `enumKey`; tope de filas por página |
| `AppTable/__tests__/AppTableFiltros.test.tsx` | 29 | Cada tipo de filtro, orden, paginación, celdas, exportación a Excel |
| `AppTable/__tests__/columnas.test.ts` | 48 | Las funciones puras de filtrado y orden |
| `Auth/__tests__/CambiarPasswordForm.test.tsx` | 10 | Pide la actual solo si se entró con contraseña |
| `Auth/__tests__/validacion.test.ts` | 12 | Validación de email sin regex de retroceso cuadrático |
| `categoria/__tests__/SelectorColor.test.tsx` | 5 | Se elige color por su nombre accesible |
| `hooks/__tests__/*.test.tsx` | 48 | `createEntityHooks`, `useEntityFormSubmit` (invalida `['informes']`), `usePaginacion`, `useCatalogos`, `useCategorias`, `useInformes` |

### E2E (`e2e/*.spec.ts`)

| Fichero | Qué comprueba |
|---|---|
| `saldo.spec.ts` | Anotar un gasto cambia el saldo de la portada; borrarlo lo devuelve. Sin recargar |
| `categorias.spec.ts` | Un movimiento en una categoría nueva aparece al filtrar por ella (con dos categorías, para que un filtro que no filtra no pase) y lleva su color |
| `tipografia.spec.ts` | Nunito en el texto, Fredoka en los titulares y Geist Mono en el dinero |
| `visual.spec.ts` | Captura de Inicio en escritorio y móvil (opt-in) |

## 4. Coverage por niveles (100 / 80 / 0)

Los umbrales son **por fichero**, no una media: una media alta esconde un fichero
crítico a medias. Están en `vitest.config.mts` y `pnpm test:coverage` falla si
uno no llega.

| Nivel | Umbral | Ficheros | Por qué |
|---|---|---|---|
| CORE | **100 %** | `lib/money.ts`, `lib/dates.ts`, `lib/format.ts`, `lib/rutas.ts`, `lib/csp.ts` | Dinero, fechas y seguridad de rutas: un fallo es una cifra mal o un agujero |
| CORE | **90 %** | `src/infrastructure/repositories/**`, `src/application/actions/**`, `lib/auth.ts`, `lib/env.ts`, `lib/log.ts` | Lo que falta son ramas de carreras entre peticiones, marcadas con su porqué |
| IMPORTANT | **80 %** | `GenericForm/**`, `AppTable/**`, `src/application/hooks/**` | Los cubren los tests de componente |
| INFRA | 0 % (excluido) | `src/types/**`, `src/config/**`, `db/migrations/**`, estilos | No es lógica. `src/config` lo vigilan las guardas estructurales |

**Un umbral no se baja para que pase.** O se escribe el test, o la rama
inalcanzable se marca con `/* v8 ignore next */` y un comentario con su porqué.

La cifra global (en torno al 70 % de líneas) no es objetivo de nada: incluye
páginas y vistas que se prueban mejor con los E2E.

## 5. Qué se testea sin excepción, y qué no

**Sin excepción:**

- **Aislamiento por usuario.** Ninguna operación lee ni escribe lo ajeno, y el
  mensaje no distingue "no existe" de "no es tuyo". Y en la base: RLS no deja ver
  lo ajeno, y borrar un usuario se lleva sus datos en cascada. Toda tabla nueva
  entra sola en el test de catálogo de `schema.test.ts`.
- **Aritmética de dinero.** Signos, redondeos, reparto sin descuadre, y que un
  importe con decimales se rechace. Con propiedades, no solo con ejemplos.
- **Agregaciones.** El saldo actual coincide con el último punto de la serie: dos
  caminos distintos hasta la misma cifra prueban que el saldo sigue siendo
  derivado (RD 7).
- **Reglas de borrado.** El borrado es físico (no hay papelera) y se propaga: borrar
  una categoría se lleva sus movimientos.
- **La frontera.** Toda Server Action sin sesión, con ids ajenos y con entradas
  fuera de rango.
- **Las guardas estructurales** de §3.

**No merece test:** estilos y layout (salvo la tipografía, que fallaba en
silencio), textos de la interfaz, componentes que solo colocan otros sin lógica, y
la validación de formularios en E2E (es un test del esquema Zod y cuesta cien veces
menos).

## 6. Convenciones

- **AAA** (preparar, actuar, comprobar), separados por una línea en blanco.
- **Test en rojo antes del arreglo.** Todo bug se arregla escribiendo primero el
  test que lo reproduce y viéndolo fallar. Es la única forma de saber que se ha
  entendido el fallo y de que el test lo detecta.
- **Propiedades para las invariantes** (fast-check): reparto, ida y vuelta,
  inversas, saldo = serie.
- **Aserciones atadas a su causa.** Nada de `rejects.toThrow()` a secas ni
  `toBeTruthy()` cuando hay un valor concreto: se comprueba el `RepositoryError`,
  el campo de `fieldErrors` (`esperarErrorDeCampo`) o el SQLSTATE exacto.
- **Comprobar el estado de la base, no solo la respuesta.** Una acción que
  devuelve error después de haber escrito sigue siendo un bug.
- **Por rol y nombre accesible** en componentes y E2E (`getByRole('button',
  { name: 'Guardar' })`), con `userEvent`, como una persona.
- Comentarios que explican **por qué** existe el test y qué se rompería sin él.
- ESLint lo impone en parte: un `.only` o un test sin aserción no pasan el lint.

## 7. Trampas

- **PGlite en varios hilos se cuelga.** Por eso el proyecto `node` usa `forks`. Si
  la suite entera se queda colgada, relánzala o pásala fichero a fichero.
- **El reloj.** Un test que lee la fecha dos veces puede cruzar la medianoche
  entre una y otra: se congela con `vi.setSystemTime`.
- **`int8` como texto.** Ver §2.2. Todo agregado lleva `.mapWith(Number)`.
- **Los mocks de `@/db` son getters.** Un valor capturado al importar apuntaría a
  la base del primer test.
- **jsdom y Mantine.** `matchMedia('')` tiene que devolver `true` (como en un
  navegador) o mantine-datatable oculta todas las columnas; `MantineProvider
  env="test"` o los desplegables no aparecen a tiempo.
- **`userEvent` es lento a propósito** (teclea carácter a carácter): los
  formularios largos necesitan el `testTimeout` del proyecto `dom`.
- **Zod 4 ejecuta un `.refine` aunque una comprobación anterior haya fallado.** Si
  el `refine` hace algo que puede lanzar (`new URL`), protégelo.
- **E2E: el build se rehace siempre** y escribe en `.next` con las variables de
  `.env.e2e`. Después, `pnpm start` sin un `pnpm build` previo serviría esa build.
- **E2E: `Invalid path specified in request URL`** es la URL de Supabase con
  `/rest/v1`. Hoy `lib/env.ts` ya no arranca con ella.
- **E2E: el límite de invitados por hora.** Si la app se queda en "Preparando tu
  espacio…", mira el límite de usuarios anónimos del proyecto de pruebas.

## 8. Quality gates

| Dónde | Cuándo | Qué comprueba | Se puede saltar |
|---|---|---|---|
| **Husky** (`.husky/pre-commit`) | En cada `git commit`, en tu máquina | `eslint --fix` sobre los ficheros del commit (`lint-staged.config.mjs`) y `pnpm typecheck` | `git commit --no-verify`, solo en emergencias: el CI lo vuelve a comprobar |
| **CI** (`.github/workflows/calidad.yml`) | En cada PR a `develop`, y a mano | Install `--frozen-lockfile`, typecheck, lint, `test:coverage`, `test:tz`, build y, en paralelo, `pnpm audit` completo | No: `develop` exige sus tres checks para mergear (ver la checklist de abajo) |

Detalles del CI:

- **Sin secretos.** Los tests van sobre PGlite y el build usa variables de relleno.
- **Para gastar pocos minutos:** no corre en `push` (la PR ya prueba la mezcla), no
  corre si la PR solo toca `*.md` o `docs/` (lo decide un job, no `paths-ignore`,
  para no dejar colgado un check obligatorio) y cada push nuevo cancela la
  ejecución anterior.
- **`pnpm audit` completo**, producción y desarrollo: el proyecto se mantiene en
  cero avisos con overrides documentados en `pnpm-workspace.yaml`.
- El informe HTML de coverage queda como artefacto una semana.
- `pnpm typecheck` es `next typegen && tsc --noEmit`: genera los tipos de rutas
  (`LayoutProps`) sin compilar, y por eso funciona en un checkout limpio.

### Checklist de seguridad manual (paneles)

Lo que el código no puede comprobar y hay que revisar a mano en los paneles.

**Supabase, proyecto de desarrollo y producción:**

- [ ] Authentication → Attack Protection: CAPTCHA activado con Turnstile y la
      secret **real** (nunca la de prueba).
- [ ] Authentication → Sign In / Providers → Email: *Secure password change* ON.
- [ ] Authentication → URL Configuration: Redirect URLs sin comodines amplios
      (nada de `https://*`), solo los dominios propios.
- [ ] Authentication → Rate Limits revisados (el de usuarios anónimos se queda en
      su valor bajo).
- [ ] Security Advisor sin avisos de tablas sin RLS.
- [ ] Database → Extensions: `pg_cron` activado y el job `limpieza-invitados`
      programado (`select * from cron.job;`).

**GitHub (repositorio público):**

- [ ] Settings → Code security: *Secret scanning* y *Push protection* activados.
- [ ] Settings → Code security: *Dependabot alerts* activado.
- [ ] Settings → Branches: `develop` exige *Require a pull request* (sin
      aprobaciones: se trabaja solo) y los tres checks *Tipos, lint, tests y
      build*, *Auditoría de dependencias* y *¿Solo documentación?*. Sin
      *Require branches to be up to date*: obligaría a repetir el CI cada vez
      que `develop` avanza.
- [ ] Settings → Secrets: solo `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` (los usa
      el ping). Nunca la secret key de Supabase.

## 9. De dónde venimos

La auditoría que abrió el plan de calidad encontró una base buena (Postgres real,
solo se sustituía la conexión y la sesión, comentarios de "por qué") y estos
problemas:

- Un **falso positivo**: el test de "no se puede escribir sobre lo ajeno" mandaba
  un payload que Zod rechazaba antes de llegar al `where`, así que pasaba dijera
  lo que dijera el filtro.
- **`.mapWith(Number)` sin protección**: PGlite devolvía `int8` como número y
  postgres-js como texto. Quitarlos todos dejaba la suite en verde.
- El invariante saldo = serie probado con un único ejemplo, RLS solo en una tabla,
  datos de prueba imposibles, aserciones débiles y huecos sin test (el `update` de
  movimientos, las acciones de informes, `/auth/confirm`, los hooks).
- Sin coverage, sin CI, sin hooks, sin tests de componentes ni E2E.

| | Antes | Después |
|---|---|---|
| Ficheros de test | 13 | 41 de Vitest + 4 specs de Playwright |
| Casos | ~212 | 750 + 4 flujos E2E (+2 visuales) |
| Entornos | Node | Node (PGlite), jsdom, Chromium |
| Coverage | Sin medir | Umbrales por fichero: 100 / 90 / 80 |
| Quality gates | Ninguno | Husky en cada commit y CI en cada PR |
| `pnpm audit` | Avisos sin revisar | Cero avisos, producción y desarrollo |

**Bugs que encontraron los tests nuevos**, cada uno arreglado con su test en rojo
primero:

| Fase | Bug | Qué pasaba |
|---|---|---|
| 3 | Serie de saldo sin tope de rango | Pedir del año 1 al 9999 tardaba 18 s por petición |
| 3 | `ListParams` sin validar | `pageSize` de mil millones o páginas negativas llegaban al repositorio |
| 3 | Fechas futuras aceptadas | Un movimiento de 2030 se metía en el saldo de hoy |
| 3 | `allocate` repartía el resto por orden | El primero cobraba el céntimo aunque le tocara a otro |
| 4 | La tabla ofrecía 200 filas por página | La frontera solo acepta 100: el botón daba error |
| 4 | El filtro de dinero pedía céntimos | Para buscar 45,90 € había que escribir 4590 |
| 4 | Validación de email | Regex con retroceso cuadrático (DoS) |
| 5 | Bucle de renders en `GenericForm` | Al recibir errores del servidor |
| 5 | `desdeLista` no encontraba la lista en caché | Usaba una clave que no es la de Refine |
| 5 | `MoneyInput` guardaba 12,30 € con el texto "12,3x" | Dejaba publicado el último importe válido |
| 5 | Campos con `disabledWhen`/`optionsFrom` congelados | Memoizados sin `dependsOn` |
| 6 | El filtro de Movimientos por categoría no filtraba | La tabla avisaba con `categoriaNombre` y el repositorio espera `categoriaId` |
| 6 | Toda la app en Times New Roman | Las clases de `next/font` estaban en `<body>` y `globals.css` las lee en `:root` |
| 6 | URL de Supabase con `/rest/v1` aceptada | La app arrancaba y el invitado fallaba con un error genérico |
| 7 | `pnpm typecheck` fallaba en un checkout limpio | `LayoutProps` no existe hasta que Next genera los tipos |
