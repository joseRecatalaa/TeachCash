# TeachCash

**Educación financiera para cualquiera, jugando.** TeachCash enseña a manejar el
dinero con forma de videojuego a píxel: mundos que recorrer, niveles cortos que
se juegan en el móvil en dos o tres minutos, jefes que derrotar y un héroe que
se equipa con lo que ganas aprendiendo. Y, al lado, un gestor de finanzas
personales para poner en práctica lo aprendido con tu propio dinero.

Se usa **sin registrarse y gratis**: al entrar recibes una sesión de invitado y
puedes empezar a jugar en ese momento.

## Por qué

La educación financiera suele llegar tarde, en forma de folleto o de curso
aburrido, y casi nunca a quien más la necesita. TeachCash parte de tres
compromisos:

- **Interactiva.** No se lee: se practica. Cada lectura acaba con un minitest,
  las prácticas son ejercicios al estilo de las apps de idiomas y cada error
  viene con su explicación, que es lo que de verdad enseña.
- **Veraz.** Las cifras y las normas son las de España y salen de fuentes
  oficiales —BOE, Banco de España, CNMV, Agencia Tributaria, INE—. Cada mundo
  lleva su `FUENTES.md` y ningún dato se publica sin una revisión humana. Es
  contenido educativo, no asesoramiento financiero, y la aplicación lo dice en
  todo el módulo.
- **Lúdica.** Pixel art propio, estrellas por nivel, jefes de cuerpo entero, una
  tienda donde las estrellas compran el equipo del héroe y un radar con sus
  estadísticas. Aprender tiene que apetecer tanto como jugar al siguiente nivel.

## El Camino del héroe

El corazón de TeachCash. Cuatro mundos, cada uno un planeta a píxel con su
camino de niveles:

| Mundo | De qué va |
|---|---|
| **Salud financiera** | Saber dónde estás: ingresos, gastos, presupuesto, la nómina por dentro y el patrimonio neto |
| **Ahorro** | El fondo de emergencia, dónde guardar el dinero (cuentas, depósitos, Letras del Tesoro) y cómo crece |
| **Inversión** | Riesgo y diversificación, fondos indexados, comisiones, impuestos y cómo cazar un chiringuito |
| **Deuda y crédito** | El precio real de un préstamo, las tarjetas revolving, la hipoteca y cómo salir de una deuda |

Cada mundo tiene nueve niveles de tres tipos:

- **Lectura**: un curso de unos dos minutos que acaba con un minitest.
- **Práctica**: ejercicios con un caso concreto (el de Pepito, el personaje de
  todos los ejemplos). Seis tipos de pregunta: elegir una opción, verdadero o
  falso, ordenar pasos, emparejar conceptos, rellenar el hueco y calcular una
  cifra.
- **Jefe**: el examen final del mundo, contra un monstruo.

Los mundos están abiertos desde el principio; dentro de cada uno, los niveles
van en orden. Cada nivel da de una a tres estrellas y se puede repetir para
mejorar la marca. **Corrige el servidor**, así que las estrellas valen lo que
dicen.

### Cuadro de mando y Tienda

La portada (`/`) reúne las dos mitades: el héroe con su equipo, las estrellas,
el patrimonio y un radar con **siete estadísticas** —una por mundo, más
Riqueza, Constancia y Poder—. Las estrellas de los cursos se gastan en la
**Tienda**, en piezas de equipo de tres calidades. Solo se ganan aprendiendo:
inventarse movimientos no da estrellas.

## Gestión de patrimonio

El segundo módulo, para llevar tus finanzas reales:

- **Inicio** — el patrimonio, cómo va el mes frente al anterior, la evolución
  del saldo, en qué se va el dinero y los últimos movimientos. Las flechas junto
  al mes recorren los meses desde enero de 2026.
- **Movimientos** — anotar un gasto o un ingreso, con categoría y fecha.
  Filtrables por periodo, categoría y texto, y exportables a Excel.
- **Categorías** — de gasto o de ingreso, con emoji y color propio, que las
  identifica en la tabla y en los gráficos. Las de gasto llevan un presupuesto
  mensual.
- **Planificación** — cada categoría de gasto con lo gastado este mes frente a
  su presupuesto.

Hay **una sola cuenta y una sola moneda**: el patrimonio es la cifra con la que
empiezas más la suma de los movimientos.

## Cuentas y privacidad

Al entrar recibes una sesión de **invitado** (protegida con un CAPTCHA invisible
de Cloudflare Turnstile) que dura 4 días. Si creas una cuenta con email y
contraseña, tu progreso y tus datos se quedan. Cada persona ve solo lo suyo y
puede borrar su cuenta, con todo lo que contiene, desde la propia aplicación.

## Arrancar

Necesitas un proyecto de Supabase (vale el plan gratuito) y un widget de
Turnstile. Qué configurar en cada panel está en `docs/plans/PLAN-SUPABASE.md`.

```bash
pnpm install                 # instala también el hook de commit (Husky)
cp .env.example .env.local   # y rellénalo: cada variable dice de dónde sale
pnpm db:migrate              # crea las tablas, RLS y políticas en Supabase
pnpm dev                     # http://localhost:3000
```

No hay paso de semillas: cada usuario recibe las categorías por defecto al
nacer, y los cursos se leen de `content/heroe/`.

Una vez, en el SQL Editor de Supabase y con la extensión `pg_cron` activada,
ejecuta `db/sql/limpieza-invitados.sql`: es el job que borra cada hora los
invitados caducados.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo, solo en `localhost` |
| `pnpm heroe:validar` | Valida el contenido del Camino del héroe |
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

## Escribir un curso

Un curso es un fichero JSON en `content/heroe/<mundo>/`, no código: se revisa en
una PR y, si está mal escrito, `pnpm heroe:validar` y la CI lo rechazan. Cómo se
escribe —tipos de nivel, bloques de lectura, preguntas y el tono—, en
`docs/CONTENIDO-HEROE.md`.

## Tests y calidad

Todo está en **`docs/TESTS.md`**. En resumen:

- **Más de 800 tests de Vitest** sobre Postgres real en proceso (PGlite), sin
  tocar Supabase, más tests de componentes con Testing Library.
- **Flujos end-to-end con Playwright**, solo en local, contra un segundo
  proyecto de Supabase de pruebas. Cómo montarlo, en `.env.e2e.example`.
- **En cada commit** (Husky): ESLint sobre los ficheros que entran y el chequeo
  de tipos.
- **En cada PR a `develop`** (GitHub Actions): tipos, lint, tests con cobertura,
  la suite en otro huso horario, build y `pnpm audit`.

## Para trabajar en el código

Lee **`AGENTS.md`** antes de tocar nada: lleva las reglas duras y remite al
resto de la documentación de `docs/`.

Next.js 16 (App Router) con **Refine.dev** y **Mantine**, Postgres en
**Supabase** con Drizzle, y Server Actions en lugar de una API HTTP. La regla
que más importa: **el dinero es un entero en céntimos**, nunca un decimal.
