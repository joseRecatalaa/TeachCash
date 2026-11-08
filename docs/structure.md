# Estructura

La hoja de ruta del repo: dónde vive cada cosa y dónde va cada cambio. **Léelo
cuando busques algo o vayas a crear un fichero nuevo.** Qué hace cada pieza de
interfaz, en `docs/components.md`; cómo se conectan las capas, en
`docs/architecture.md`.

## Dónde va cada cosa

Cada cambio tiene un sitio y solo uno:

| Si vas a… | Toca |
|---|---|
| Cambiar qué campos tiene un formulario | `src/presentation/entidades/<entidad>/formularios.ts` |
| Cambiar qué columnas tiene una tabla | `src/presentation/entidades/<entidad>/tabla.ts` |
| Cambiar una regla de negocio o una validación | `src/infrastructure/repositories/<entidad>.repository.ts` |
| Cambiar el aspecto de TODOS los formularios | `src/presentation/components/Forms/GenericForm/` |
| Cambiar el aspecto de TODAS las tablas | `src/presentation/components/AppTable/` |
| Cambiar un color, un grosor de trazo, una sombra o una tipografía | `app/globals.css` (los tokens `--sd-*`) |
| Cambiar el aspecto de TODOS los botones, inputs o paneles de Mantine | `src/presentation/styles/mantine-sketch.module.css` |
| Cambiar el aspecto de UNA vista concreta | Su `*.module.css` al lado del `.tsx` |
| Añadir una operación que no es CRUD | Una función en el repositorio + su acción en `entity.actions.ts` + su hook |
| Cambiar el color de una categoría en tabla y gráficos | La clave en `categories.color`; los tonos, en `app/globals.css` (`--sd-cat-*`) |
| Añadir una entidad entera | `pnpm generate:crud` |
| Añadir un módulo al menú lateral | `MODULOS` en `src/presentation/components/SideMenu/SideMenu.tsx` |
| Añadir o cambiar un curso del Camino del héroe | Un JSON en `content/heroe/<mundo>/` (guía en `docs/CONTENIDO_HEROE.md`) y `pnpm heroe:validar` |
| Cambiar el formato de ese contenido | Los esquemas Zod de `src/types/heroe.types.ts` |
| Poner el título de una pantalla | `SketchTitle` de `src/presentation/components/ui` |
| Añadir o cambiar un objeto de la tienda | `CATALOGO` en `lib/tienda.ts`; si es un tipo nuevo, sus DOS dibujos: el grande en `Pixel/spritesGrande.ts` y `SPRITE_OBJETO`, y el pequeño en `Pixel/spritesEquipo.ts`, `PIEZAS_PEQUENAS` y su capa en `PixelHero` |
| Cambiar cómo se calcula una estadística del héroe | `lib/estadisticas.ts` |

## El árbol de ficheros

```
.
  app/                                # rutas, en PascalCase
    page.tsx                          # Cuadro de mando: patrimonio, héroe, radar y estrellas
    page.module.css                   # su aspecto: cada vista lleva el suyo
    Patrimonio/                       # Inicio: saldo, mes, gráficos y últimos
    Tienda/page.tsx                   # lo que se compra con las estrellas
    layout.tsx                        # Providers + Navbar + CSS de Mantine
    Movimientos/                      # una carpeta por entidad
      page.tsx                        # listado
      Create/page.tsx
      Edit/page.tsx                   # lee ?id=
    Categorias/
    CaminoHeroe/                      # el segundo módulo: mapa de mundos
      Mundo/page.tsx                  # el camino de un mundo (?id=ahorro)
      Nivel/page.tsx                  # el reproductor de un nivel (?id=ahorro/01-…)
    Login/ Registro/                  # pantallas de auth (sin GenericForm)
    RecuperarPassword/ CambiarPassword/ BorrarCuenta/
    auth/confirm/route.ts             # destino de los enlaces del email
  proxy.ts                            # refresca la sesión y pone la CSP (antes middleware)
  content/heroe/                      # el CONTENIDO del Camino del héroe, en JSON
    <mundo>/mundo.json                # el mundo y el orden de sus niveles ("niveles": [] = Próximamente)
    <mundo>/<nivel>.json              # un nivel: lectura, interactivo o jefe
  src/
    types/
      formMetadata.types.ts
      informe.types.ts
      heroe.types.ts                  # los esquemas Zod del contenido del héroe y sus DTO
      <entidad>.types.ts              # ListDto, SaveDto, FormDto
    infrastructure/
      heroe/contenido.ts              # lee y valida content/heroe/ con fs: el ÚNICO que lo lee
      repositories/
        index.ts                      # REPOSITORIES: el mapa cerrado de recursos
        types.ts                      # EntityRepository, ListParams, RepositoryError
        <entidad-plural>.repository.ts
        metadata.repository.ts        # las opciones de los select
        informes.repository.ts        # las agregaciones (no es un CRUD)
        perfiles.repository.ts        # el patrimonio (base y primero): una fila por usuario
        cuenta.repository.ts          # auth.users: fecha de alta (caducidad) y borrar la cuenta
        heroe.repository.ts           # progreso del héroe: desbloqueo en orden y corrección
        tienda.repository.ts          # estrellas, compras y equipo
        cuadro.repository.ts          # reúne lo que enseña el Cuadro de mando
        __tests__/
    application/
      actions/
        entity.actions.ts             # 'use server' — la frontera
        frontera.ts                   # los esquemas Zod de lo que llega del cliente
        resultado.ts                  # run(): errores esperados como valor
        informes.actions.ts
        perfil.actions.ts             # leer el primero y fijar el total de hoy
        heroe.actions.ts              # mapa, mundo, nivel y enviar una partida
        tienda.actions.ts             # leer la tienda, comprar, equipar y quitar
        cuadro.actions.ts             # leer el Cuadro de mando
        auth.actions.ts               # invitado, login, registro, contraseña, borrar cuenta
      hooks/
        createEntityHooks.ts          # factory genérica de hooks CRUD
        useEntityFormSubmit.ts        # submit genérico de formulario
        useFormMetadata.ts            # opciones de los select
        useCatalogos.ts               # las categorías del usuario
        usePaginacion.ts              # estado de la tabla
        useInformes.ts
        usePerfil.ts                  # patrimonio (cuelga de ['informes'])
        useHeroe.ts                   # el Camino del héroe (cuelga de ['heroe'])
        useCuadro.ts                  # el cuadro (['informes', 'cuadro']) y la tienda (['heroe', 'tienda'])
        use<Entidades>.ts             # uno por entidad
      providers/
        providers.tsx                 # Mantine + Refine + REFINE_RESOURCES
        refine-data-provider.ts       # Refine → Server Actions
        CuentaProvider.tsx            # sesión en el cliente; crea el invitado
    presentation/
      entidades/                      # SOLO .ts, SIN JSX: formularios y tablas declarados
        _shared/types.ts              # alias de los tipos de GenericForm y AppTable
        <entidad-en-kebab>/
          formularios.ts              # el formulario (o los formularios) de la entidad
          tabla.ts                    # el listado
      styles/
        mantine-sketch.module.css     # el puente con el tema de Mantine
      components/
        ui/                           # los primitivos del sistema de diseño
          index.ts                    # se importan SIEMPRE desde aquí
          SketchButton/               # <Link> tipado o <button>, con gesto
          SketchCard/                 # la ficha: cinta, filete, tono
          SketchTitle/                # el título de pantalla con trazo de rotulador
          StatusBadge/                # estado → tono, en un solo sitio
        Forms/
          GenericForm/
            GenericForm.tsx
            GenericForm.module.css
            FieldRenderer.tsx         # FieldType → componente de Mantine
            MoneyInput.tsx            # el input de dinero (regla dura 1)
            types.ts                  # el contrato con presentation/entidades
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
        Inicio/                       # piezas de la portada: ElegirPatrimonio, SelectorMes, useMesDeInicio
        Auth/                         # formularios de login, registro…
        Cuenta/                       # CuentaMenu y AvisoInvitado (la Navbar)
        Navbar.tsx
        Navbar.module.css
        SideMenu/                     # menú lateral de MÓDULOS (se abre al pasar el ratón)
        Splash/                       # la pantalla de carga a píxel
        Pixel/                        # el héroe (PixelHero), los sprites y su paleta: los comparten el splash y el héroe
          HeroeGrande.tsx spritesGrande.ts  # el héroe de 48x66 con su equipo: Cuadro de mando y Tienda
          spritesEquipo.ts            # el mismo equipo, redibujado para el héroe pequeño del Camino
        Cuadro/                       # el Cuadro de mando: la pantalla, el héroe que se toca y el radar
        Tienda/                       # el probador y la rejilla de objetos
        Heroe/                        # el Camino del héroe: mapa, camino, ficha del nivel
          planeta.ts camino.ts        # la geometría a píxel, en funciones puras
          reproductor/                # lectura, preguntas, resultado; Marcado (negrita/cursiva)
          ejercicios/                 # los seis tipos de pregunta
        useEntityId.ts
  lib/
    money.ts                          # tipo Money, aritmética y DIVISA_APP
    colores.ts                        # las claves de la paleta categórica
    format.ts                         # Intl.NumberFormat / fechas, es-ES
    dates.ts                          # fechas civiles, periodos, rangos de mes
    auth.ts                           # getSession(): lo único que sabe de auth
    env.ts                            # el entorno, validado con Zod al arrancar
    log.ts                            # registrarError(): sin los params de Drizzle
    ids.ts                            # uuid() que funciona fuera de https
    supabase/                         # clientes de servidor y de proxy
    rutas.ts                          # filtro de redirección abierta
    csp.ts                            # la Content Security Policy y su nonce
    heroe.ts                          # corrección y estrellas del héroe (puras)
    marcas.ts                         # **negrita** y _cursiva_ del contenido, a nodos
    tienda.ts                         # el catálogo de objetos y sus precios
    estadisticas.ts                   # las siete estadísticas del héroe (puras)
    turnstile.ts
  db/
    schema.ts                         # pg-core; piezas idColumn, soloSuyo…
    client.ts                         # postgres-js, prepare: false
    index.ts                          # la `db` compartida (server-only)
    migrate.mts                       # migra por el Session pooler
    migrations/
    sql/limpieza-invitados.sql        # job de pg_cron, a mano en Supabase
    testing.ts                        # PGlite + stub de `auth` para los tests
  plop-templates/
  plopfile.mjs
  instrumentation.ts                  # valida el entorno al arrancar el servidor
  test/                               # andamiaje de Vitest: harness, mocks, render
  e2e/                                # Playwright: specs y Page Objects (e2e/pages/)
  playwright.config.ts
  docs/                               # la documentación a la que remite AGENTS.md
    components.md                     # qué piezas de interfaz hay y cómo se reutilizan
    architecture.md                   # capas, camino de los datos y de la sesión, añadir una entidad
    structure.md                      # esta hoja de ruta
    TESTS.md                          # todo lo de tests y quality gates
    CONTENIDO_HEROE.md                # cómo se escribe un curso
    investigación-heroe/              # informes por mundo y revision-cifras.md
    plans/                            # los planes (históricos) y los prompts de los cursos
  .github/workflows/                  # calidad.yml (CI) y ping-supabase.yml
  .husky/pre-commit                   # ESLint + typecheck en cada commit
```
