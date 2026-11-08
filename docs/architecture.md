# Arquitectura

Cómo está montada la aplicación: las capas, el único camino de los datos, el de
la sesión y cómo se añade una entidad. **Léelo antes de tocar una Server Action,
un repositorio, un hook de datos o la sesión.**

Las reglas duras están en `AGENTS.md` y aquí se dan por sabidas; dónde vive cada
fichero, en `docs/structure.md`.

## Las cuatro capas

Clean Architecture en cuatro capas. La dirección de las dependencias es de abajo
arriba y no se cruza:

| Capa | Dónde | Qué es |
|---|---|---|
| **Types** | `src/types/` | Los DTOs. Tres por entidad. No importa de nadie |
| **Infrastructure** | `src/infrastructure/` | Los repositorios sobre Drizzle. **Solo servidor** |
| **Application** | `src/application/` | Server Actions, DataProvider, providers y hooks |
| **Presentation** | `src/presentation/` | Los componentes que pintan y, en `entidades/`, los formularios y tablas DECLARADOS (**solo `.ts`, sin JSX**) |

Reglas de dependencia:

- `src/presentation` **no importa de `src/infrastructure`**. Lo que compartan
  sube a `src/types`.
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
  → Drizzle (postgres-js) → Supabase Postgres, por el Transaction pooler
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

**Lo que no encaja en el CRUD no pasa por aquí.** Restaurar un borrado, el saldo,
el Camino del héroe (`heroe.actions.ts`, `useHeroe.ts`, raíz de queries
`['heroe']`), el patrimonio inicial (`perfil.actions.ts`, `usePerfil.ts`) y las agregaciones
de la portada tienen su propia Server Action y su propio hook escrito a mano.

**Todo lo derivado se invalida a mano.** El saldo y los gráficos son sumas de
movimientos y viven bajo la raíz de queries `['informes']`, de la que Refine no
sabe nada: cada mutación llama a `useInvalidarDerivados()`. Sin eso se anota un
gasto y la portada sigue enseñando la cifra de antes, que en una aplicación de
dinero no parece un error — parece un dato.

### Cómo viaja la sesión

```
Navegador ── cookie httpOnly (JWT + refresh, @supabase/ssr) ──►
  CuentaProvider   sin sesión → Turnstile → iniciarInvitado() → usuario anónimo + catálogo
  proxy.ts         refresca la sesión y pone la CSP con nonce; no redirige ni protege rutas
  Server Action    getSession() → getClaims() verifica ES256 → userId = sub
  Repositorio      where user_id = userId
  Postgres         RLS user_id = auth.uid() (la red, no el mecanismo)
```

- **El invitado nace en el cliente, no en el proxy.** Crearlo en el proxy daría
  de alta un usuario por cada bot que pidiera una página; desde el cliente pasa
  antes por Turnstile.
- **Crear cuenta convierte al invitado** en usuario con el mismo id: sus datos se
  quedan. Iniciar sesión en una cuenta ya existente NO fusiona los datos del
  invitado: se avisa y se pierden al caducar.
- **Los invitados caducan a los 4 días** (`VIDA_INVITADO_DIAS` en
  `src/types/cuenta.types.ts`). Los borra un job horario de `pg_cron`
  (`db/sql/limpieza-invitados.sql`, ejecutado a mano una vez en el SQL Editor
  porque toca el esquema `auth`); sus datos caen por la cascada de `user_id`.
  Si cambias los días, cambia los dos sitios.
- **Los enlaces del email** (confirmar registro, recuperar contraseña) llegan a
  `app/auth/confirm/route.ts`, que acepta `code` y `token_hash` y solo redirige
  a rutas internas (`lib/rutas.ts`).
- **Las pantallas de auth no usan `GenericForm`**: son pocas, no son CRUD y
  hablan con `auth.actions.ts`, no con el DataProvider.

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
`db/schema.ts` con las mismas piezas que las demás —`idColumn()`,
`userIdColumn()`, `createdAtColumn()`, la política `soloSuyo('<tabla>')` y
`.enableRLS()`— y pasa `pnpm db:generate` y `pnpm db:migrate` antes de tocarlo.
Una tabla sin `.enableRLS()` queda abierta a la API REST de Supabase para
cualquiera con la clave pública; el Security Advisor del panel lo marca.

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
4. **Formularios** → `src/presentation/entidades/<entidad-en-kebab>/formularios.ts`.
   `.ts` sin JSX, `export function <entidad>Sections()`
5. **Tabla** → `src/presentation/entidades/<entidad-en-kebab>/tabla.ts`. `.ts` sin JSX, sin
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
| `entidades/` | kebab-case (la ruta en kebab) | `src/presentation/entidades/movimientos/` | `formularios.ts` y `tabla.ts` |
| `EntityForms/` | camelCase **singular** | `EntityForms/movimiento/` | El `FormRefine` y los componentes propios |
| `repositories/` | kebab-case plural + `.repository.ts` | `movimientos.repository.ts` | Las consultas y las reglas |

El **nombre del recurso** (`'Movimientos'`) es el PascalCase plural. Ver "Un
recurso son cuatro nombres que tienen que coincidir".
