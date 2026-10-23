# Camino del héroe — plan

Segundo módulo de TeachCash: educación financiera con forma de videojuego.
Este documento es el plan de construcción; cuando una fase se entregue, lo que
quede como decisión pasa a `AGENTS.md`.

## Qué es

El SideMenu ya anuncia el módulo **Camino del héroe** (`disponible: false`).
Se convierte en esto:

- **Mapa de mundos** (pantalla principal, fondo blanco con pocos detalles en
  pixel art). Cada mundo es un tema. Se empieza con **Salud financiera, Ahorro,
  Inversión y Deuda y crédito**.
- **Dentro de un mundo**, un camino con niveles por el que **camina el héroe del
  splash**.
- **Tres tipos de nivel**:
  - **Lectura**: un curso de unos 2 minutos que acaba con un **minitest**
    (minijefe).
  - **Interactivo**: ejercicios al estilo Duolingo. No lleva test, porque ya hace
    de test.
  - **Jefe**: el test grande del mundo.

### Decidido

- Los mundos están libres; dentro de cada uno, los niveles van en orden.
- De 1 a 3 estrellas por nivel; se puede repetir para mejorar.
- Sin vidas ni rachas en la primera versión.
- El contenido vive en JSON en el repo; la BDD guarda solo el progreso.

### Por qué el contenido va en JSON y no en la BDD

- **Es contenido, no código.** Hay un reproductor por tipo de nivel y seis tipos
  de ejercicio; añadir un curso es añadir un fichero de datos, sin tocar código.
- **Pesa poco.** Un curso de 2 minutos ocupa unos 5 KB; cuatro mundos de 9
  niveles, unos 200 KB en `content/`, fuera de `src/`. Se leen en el servidor y
  cada pantalla pide solo su nivel: no viajan al navegador de golpe.
- **Más control.** Cada curso queda en git, se revisa en una PR y un test con Zod
  rompe la CI si un JSON está mal. En la BDD harían falta un panel de
  administración, migraciones de contenido y no habría historial.
- **Es reversible.** Si un día alguien que no programa tiene que editar cursos
  sin desplegar, se migra a un CMS o a tablas: solo cambia `contenido.ts`, el
  único fichero que los lee.

## Arquitectura

```
content/heroe/<mundo>/mundo.json          ← metadatos + orden de niveles
content/heroe/<mundo>/<nivel>.json        ← el curso (texto, preguntas, ejercicios)
        │  (solo servidor, validado con Zod)
src/infrastructure/heroe/contenido.ts      ← carga + caché en memoria
src/infrastructure/repositories/heroe.repository.ts  ← progreso + corrección
src/application/actions/heroe.actions.ts   ← 'use server', ejecutar()
src/application/hooks/useHeroe.ts          ← React Query, raíz ['heroe']
app/CaminoHeroe/…                          ← páginas
```

Es un camino **no CRUD**, igual que el del patrimonio inicial
(`perfil.actions.ts` → `perfiles.repository.ts` → `usePerfil.ts`). No pasa por
Refine ni por `REPOSITORIES`.

### 1. Base de datos — una tabla

`db/schema.ts` → `heroProgress`, con el patrón de `profiles`:

| columna | tipo | nota |
|---|---|---|
| `user_id` | uuid FK `auth.users` cascade | |
| `level_id` | text | id estable del JSON (`ahorro/02-interes-compuesto`) |
| `stars` | smallint 0–3 | la **mejor** marca |
| `best_score` | smallint | aciertos máximos |
| `attempts` | integer | |
| `completed_at` | timestamptz null | primera vez superado |
| `updated_at` | timestamptz | |

- PK `(user_id, level_id)`, `soloSuyo('hero_progress')` y `.enableRLS()`.
- `pnpm db:generate` y `pnpm db:migrate` (también `db:migrate:e2e`).
- `db/__tests__/schema.test.ts` ya comprueba RLS y cascada en todas las tablas.
- El invitado conserva su progreso al crear cuenta, porque el `user_id` no
  cambia. El job de `pg_cron` lo borra por cascada.
- **El progreso del mundo y del mapa es derivado** (regla dura 7): niveles
  hechos, estrellas totales y siguiente nivel se calculan, no se guardan.

### 2. Contenido — formato JSON + Zod

`src/types/heroe.types.ts` define los esquemas Zod, y de ellos salen los tipos.

- **Mundo**: `{ id, titulo, descripcion, icono, decorado, niveles: string[] }`.
- **Nivel** (unión discriminada por `tipo`):
  - **`lectura`**: `paginas: Bloque[]` (párrafo, idea clave, ejemplo con cifras,
    lista) y `minitest: Pregunta[]` (3–5).
  - **`interactivo`**: `ejercicios: Ejercicio[]`.
  - **`jefe`**: `preguntas: Pregunta[]` (8–12) y `aprobado` (p. ej. 70 %).
- **Ejercicio / pregunta** (unión por `tipo`), para la v1:
  - `opcion` (una respuesta correcta)
  - `verdaderoFalso`
  - `ordenar` (arrastrar pasos)
  - `emparejar` (concepto ↔ definición)
  - `hueco` (elegir la palabra que falta)
  - `calcula` (respuesta numérica con tolerancia, p. ej. interés compuesto). Si
    la respuesta es un importe, va en **céntimos** y se pinta con `MoneyInput`
    (regla dura 1).
- Cada pregunta lleva su **`explicacion`**, que se muestra al fallar. Es lo que
  enseña de verdad.
- **Estrellas**: 3 si es perfecto, 2 si ≥ 80 %, 1 si se supera. La regla vive en
  una función pura de `lib/heroe.ts`, con test al 100 %.

### 3. Repositorio y acciones (servidor)

`src/infrastructure/heroe/contenido.ts`:

- Lee los JSON con `fs`, los valida con Zod y los cachea en memoria a nivel de
  módulo.
- El contenido **nunca va en el bundle de cliente**: cada pantalla pide solo lo
  suyo.

`heroe.repository.ts`:

- **`getMapa(userId)`**: los mundos con su resumen derivado (hechos/total,
  estrellas).
- **`getMundo(userId, mundoId)`**: el camino con el estado de cada nivel
  (`bloqueado | disponible | hecho` + estrellas). Un nivel está disponible si el
  anterior está hecho.
- **`getNivel(userId, levelId)`**: el contenido del nivel. Si está bloqueado,
  `RepositoryError` "No encontrado".
- **`completarNivel(userId, levelId, respuestas: unknown)`**:
  1. Valida las respuestas con Zod frente al esquema del nivel.
  2. Comprueba que el nivel no está bloqueado.
  3. **Corrige en el servidor** (regla dura 6), calcula las estrellas y hace un
     upsert que guarda la mejor marca con `greatest()`. Si no lo supera, solo
     suma `attempts`.
  4. Devuelve `{ aciertos, total, estrellas, superado, siguiente }`.

Las soluciones viajan al cliente para dar el feedback inmediato tipo Duolingo.
Hacer trampa es posible, pero no hay dinero en juego: lo que importa es que el
servidor decide qué cuenta como superado y en qué orden.

`heroe.actions.ts` (`'use server'`):

- `fetchMapa`, `fetchMundo`, `fetchNivel` y `enviarNivel`, cada una con
  `ejecutar('heroe.actions', …)`.
- Los ids se validan con un `validarLevelId` nuevo en `frontera.ts` (regex
  `^[a-z0-9-]+/[a-z0-9-]+$`, `ID_MAX`).

`useHeroe.ts` cuelga de la raíz `['heroe']`, y `enviarNivel` la invalida.
`queryClient.clear()` al cambiar de usuario ya lo cubre.

### 4. El héroe reutilizable (sale del splash)

Hoy el héroe está escrito en línea dentro de
`src/presentation/components/Splash/PixelScene.tsx`, con su paleta en
`Splash.module.css`.

- **Extraer `PixelHero`** a `src/presentation/components/Pixel/`: devuelve un
  `<g>` con las capas actuales, reutiliza `PixelSprite` y `sprites.ts`, y recibe
  `pose: 'quieto' | 'camina' | 'celebra'` y `mirando: 'izq' | 'der'` (con
  `scale(-1 1)`).
- **Mover la paleta `--px-*`** del héroe a `Pixel/pixel.module.css`.
- **Fotogramas de caminar**: `PIERNAS_PASO_1/2` (y los brazos que balancean) en
  `sprites.ts`, alternados por opacidad con `steps(1)` en un ciclo de unos
  0,35 s, igual que los ojos. Anulado en `prefers-reduced-motion`.
- **El splash pasa a usar `PixelHero`** sin cambiar su aspecto. Lo comprueba
  `pnpm test:e2e:visual`.

### 5. Pantallas

Rutas en PascalCase con `?id=`, y `<Suspense>` por `useSearchParams`.

- **`app/CaminoHeroe/page.tsx` — mapa de mundos.** Fondo blanco con 4 mundos en
  pixel art y un detalle por tema: hucha (Ahorro), corazón/escudo (Salud),
  montaña con gráfica (Inversión), cadena/tarjeta (Deuda y crédito). Cada mundo
  enseña sus estrellas y su progreso; el héroe espera junto al último visitado.
- **`app/CaminoHeroe/Mundo/page.tsx` — el camino.** Un SVG con un sendero
  serpenteante y un nodo por nivel (icono según el tipo; el jefe, un monstruo
  más grande). Al entrar, el héroe camina hasta el primer nivel disponible:
  `translate` con `steps()` a píxel entero y el sentido según el signo de x. Al
  pulsar un nodo, una ficha (Mantine `Popover`/`Modal`) con título, duración y
  "Empezar".
- **`app/CaminoHeroe/Nivel/page.tsx` — el reproductor**, un componente por tipo:
  - `Lectura` → páginas con barra de progreso → `Test` (minitest).
  - `Interactivo` → ejercicios en secuencia, con feedback inmediato y la
    explicación al fallar.
  - `Jefe` → `Test` con presentación de monstruo.
  - Pantalla final: estrellas, aciertos, "Repetir" / "Volver al camino". De
    vuelta en el camino, el héroe camina al siguiente nodo.
- **Componentes** en `src/presentation/components/Heroe/`: `MapaMundos`,
  `CaminoMundo`, `NodoNivel`, `reproductor/{Lectura,Interactivo,Test,Resultado}`,
  `ejercicios/{Opcion,VerdaderoFalso,Ordenar,Emparejar,Hueco,Calcula}`.
  - Un `*.module.css` por componente, todo con tokens.
  - El color de cada mundo viaja en `data-mundo` y lo traduce el CSS, nunca un
    `style`.
  - `--sd-font-pixel` solo para titulares.
- **Navegación**:
  - `SideMenu.tsx`: "Camino del héroe" pasa a `disponible: true, href:
    '/CaminoHeroe'`, y `activo` pasa a `usePathname()` (el TODO que ya está
    escrito ahí).
  - `Navbar.tsx`: los `ENLACES` dependen del módulo. Bajo `/CaminoHeroe` se
    muestra "Mundos" (y más adelante "Mi progreso").

### 6. Cómo se crea el contenido

`docs/CONTENIDO_HEROE.md` recogerá el flujo en tres pasos:

1. **Investigar.** Un prompt listo para **Gemini Deep Research** por mundo:
   temario de 8–10 niveles, contexto de **España** (fondos indexados, cuentas
   remuneradas, TAE/TIN, Fondo de Garantía de Depósitos…), fuentes oficiales
   (Banco de España, CNMV, finanzasparatodos.es) y sin recomendar productos
   concretos.
2. **Convertir.** El informe se pasa a Claude junto con el esquema y sale el JSON
   de cada nivel. `pnpm heroe:validar` (un script que pasa el Zod) lo comprueba.
3. **Revisar.** Una persona lee los textos y los corrige.

El módulo lleva un aviso fijo: "Contenido educativo, no asesoramiento
financiero".

**Estructura sugerida por mundo** (unos 9 niveles): L, I, L, I, L, I, L, I,
**Jefe**. Cada lectura lleva su minitest dentro.

### 7. Tests

- **`src/__tests__/contenido-heroe.test.ts`**:
  - todo JSON pasa el Zod;
  - ids únicos y que coinciden con la ruta del fichero;
  - toda lectura tiene minitest y ningún interactivo lo tiene;
  - cada mundo acaba en jefe;
  - cada `opcion` tiene una sola correcta.
- **`heroe.repository.test.ts`** (PGlite):
  - desbloqueo en orden: no se puede `getNivel` ni `completarNivel` uno
    bloqueado;
  - la corrección en el servidor ignora lo que el cliente diga sobre aciertos;
  - la mejor marca no baja al repetir;
  - aislamiento entre `USER_A` y `USER_B`;
  - respuestas basura → error de campo y nada escrito.
- **`lib/heroe.ts`** (estrellas, corrección pura) al 100 %, con fast-check en
  `calcula` y su tolerancia.
- **Acciones**: sin sesión → "No autorizado".
- **Componentes de ejercicio** en jsdom: responder y ver el feedback.
- **E2E `e2e/heroe.spec.ts`**: invitado → mapa → mundo → lectura → minitest →
  vuelve con estrellas y el siguiente nivel abierto.
- **Coverage**: `lib/heroe.ts` en CORE 100 %; repositorio y acciones en 90 %.

## Fases de entrega

Una PR por fase, sobre `develop`.

1. **Héroe reutilizable**: `PixelHero`, la paleta compartida, los fotogramas de
   caminar y el splash migrado.
2. **Datos**: tabla + migración, esquemas Zod, `contenido.ts`, repositorio,
   acciones, hooks y tests.
3. **Contenido piloto**: un mundo (Ahorro) con 3 niveles, uno de cada tipo, para
   probar el formato. Más `docs/CONTENIDO_HEROE.md` con los prompts de Gemini.
4. **Mapa y camino**: páginas, SideMenu, Navbar por módulo y el héroe caminando.
5. **Reproductor**: lectura, minitest, los 6 ejercicios, jefe, resultado y
   estrellas.
6. **Contenido completo** de los 4 mundos, más el E2E y la actualización de
   `AGENTS.md` (estructura, una entrada en "Decisiones tomadas" y vidas/rachas
   en "Decisiones abiertas").

## Ficheros

- **Nuevos**:
  - `db/schema.ts` (tabla) y su migración
  - `src/types/heroe.types.ts`, `lib/heroe.ts`
  - `src/infrastructure/heroe/contenido.ts`,
    `src/infrastructure/repositories/heroe.repository.ts`
  - `src/application/actions/heroe.actions.ts`, `src/application/hooks/useHeroe.ts`
  - `app/CaminoHeroe/**`, `src/presentation/components/Heroe/**`,
    `src/presentation/components/Pixel/**`
  - `content/heroe/**`, `docs/CONTENIDO_HEROE.md`
- **Se tocan**:
  - `Splash/PixelScene.tsx`, `Splash/Splash.module.css`, `Splash/sprites.ts`
  - `SideMenu/SideMenu.tsx`, `Navbar.tsx`
  - `src/application/actions/frontera.ts`, `vitest.config.mts`
  - la configuración de ESLint (que `content/` solo lo lea `src/infrastructure`)
- **Se reutiliza**:
  - `ejecutar()` (`resultado.ts`), `RepositoryError`, `getSession()`
  - `PixelSprite` y `sprites.ts`
  - `MoneyInput`, `StatusBadge`, `SketchCard`, `SketchButton`, `EmptyState`
  - `usarBaseDeTest`, `crearUsuario` (`db/testing.ts`)

## Verificación

```bash
pnpm db:generate && pnpm db:migrate
pnpm typecheck && pnpm lint && pnpm test && pnpm test:tz
pnpm test:e2e            # flujo del héroe + splash sin cambios
pnpm test:e2e:visual     # el splash sigue idéntico tras extraer PixelHero
pnpm build               # rutas nuevas
```

A mano, en `pnpm dev`:

- Entrar como invitado, abrir el módulo desde el SideMenu, jugar un nivel de cada
  tipo y comprobar las estrellas y el desbloqueo.
- Recargar y ver que el progreso persiste.
- Crear cuenta y ver que se conserva.
- Repasar el modo oscuro y el movimiento reducido.
