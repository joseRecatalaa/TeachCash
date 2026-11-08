# Componentes

Qué piezas de interfaz existen, cuáles se reutilizan y cómo se estilan. **Léelo
antes de escribir código de interfaz o de crear un componente**: casi todo lo
que vas a necesitar ya existe, y lo que no existe tiene un sitio y unas reglas.

Las reglas duras (dinero en céntimos, fechas civiles…) están en `AGENTS.md`;
dónde vive cada fichero, en `docs/structure.md`.

## Antes de escribir un componente

1. **¿Lo pinta Mantine?** Casi siempre sí, y ya viene con el trazo del tema
   (`mantine-sketch.module.css`). Un `<Button>`, `<Paper>` o `<TextInput>` no se
   sustituye: se usa.
2. **¿Es un formulario o una tabla de una entidad?** Entonces no se escribe: se
   declara en `src/presentation/entidades/<entidad>/` (ver "Cómo se declara una
   vista").
3. **¿Está en el catálogo de abajo?** Úsalo, y si le falta una variante, añádela
   al componente en vez de copiarlo.
4. **Si de verdad es nuevo**: si es genérico y lo que aporta no lo da Mantine,
   va a `components/ui/` y se exporta desde su `index.ts`; si es de un módulo,
   a la carpeta de ese módulo. Con su `*.module.css` al lado, colores de tokens
   `--sd-*` y su animación anulada en `prefers-reduced-motion`. Y se añade a
   este documento.

## El catálogo

Todo bajo `src/presentation/components/` salvo que se diga otra cosa.

### Primitivos del sistema de diseño (`ui/`)

Se importan **siempre** desde `@/src/presentation/components/ui`, nunca por su
ruta completa. Existen solo porque hacen algo que Mantine no hace.

| Componente | Para qué | Props que importan |
|---|---|---|
| `SketchButton` | Botón o enlace con el gesto de la casa. Con `href` es un `<Link>` tipado de Next; sin él, un `<button>` | `variant`: `primary` (uno por pantalla) · `secondary` · `ghost` · `danger`; `size`; `loading`; `leftSection`/`rightSection`; `fullWidth` |
| `SketchCard` | La ficha: papel, cinta, filete, epígrafe, título, acciones y pie | `variant`: `paper` · `sticker` · `highlight` · `flat`; `tone` (nunca la única señal); `tilt`; `padding`; `ribbon`; `eyebrow`, `title`, `icon`, `actions`, `footer` |
| `SketchTitle` | El título de pantalla con trazo de rotulador. Uno para toda la app: no se copia otro `.title` en un módulo | `as`: `h1` (uno por pantalla) · `h2` |
| `StatusBadge` | Un estado con su tono resuelto en un solo sitio (`ESTADOS`) | `status` o `tone`; `dot`; `raised`; `size` |
| `EmptyState` | El hueco vacío, dibujado | `titulo` (lo que pasa, no una disculpa); `descripcion`; `accion` (normalmente un `SketchButton`); `dibujo`: `libreta` · `etiquetas` · `grafico`; `compacto` |
| `AnimatedMoney` | Un importe que cuenta hasta su valor sin dejar de ser exacto. Respeta el movimiento reducido | `valor` en céntimos; `signed` para netos y flujos; `divisa`; `placeholder` |
| `AnimatedCount` | Un entero que no es dinero (las estrellas de la tienda) y cuenta hasta su valor. Comparte la cuenta con `AnimatedMoney` (`useCuenta`) | `valor`; `className` |

### Formularios (`Forms/`)

| Pieza | Para qué |
|---|---|
| `GenericForm` | Pinta las secciones declaradas en `entidades/<entidad>/formularios.ts`. Cambiar su aspecto cambia TODOS los formularios |
| `FieldRenderer` | Traduce cada `FieldType` a su componente de Mantine. Un tipo de campo nuevo se añade aquí |
| `MoneyInput` | El input de dinero: lee texto y publica el entero en céntimos, o `null` mientras el texto no es un importe (regla dura 1). Se usa también fuera de `GenericForm` |
| `EntityForms/<entidad>/<Entidad>FormRefine.tsx` | El envoltorio de cada entidad: une sus secciones con `useEntityFormSubmit` |
| `EntityForms/<entidad>/…` | Los campos propios que una sección REFERENCIA con `component:` (p. ej. `SelectorColor`, `SeleccionarPredefinida`) y los modales de la entidad (`NuevoMovimientoModal`, `MovimientoRapidoModal`) |

Las pantallas de auth (`Auth/`) no usan `GenericForm` a propósito: no son CRUD.

### Tablas y listados

| Pieza | Para qué |
|---|---|
| `AppTable/` | La tabla genérica (sobre `mantine-datatable`), en modo cliente o servidor. La lógica pura de filtros y orden, en `columnas.ts` |
| `EntityListPage` | La página de listado entera: cabecera, búsqueda, botón de crear, exportar a Excel y la tabla. Huecos `beforePanel`, `beforeTable`, `afterTable` y `extraToolbarActions` para lo que no es tabla |
| `ActionsColumn.tsx` | Los helpers de columna: `textColumn`, `moneyColumn`, `dateColumn`, `enumColumn`, `boolColumn` y `actionsColumn`. Son los que mantienen todas las tablas iguales |
| `usePaginacion` (`src/application/hooks/`) | El estado de la tabla; `{ server: false }` para el modo cliente |
| `useEntityId` | Lee el `?id=` de una página `Edit` |

### Gráficos (`Charts/FinanceCharts.tsx`)

`IngresosVsGastosChart`, `GastoPorCategoriaChart` y `SerieSaldoChart`, sobre
Recharts. Reciben datos ya agregados por el servidor.
Un gráfico nuevo va aquí y pasa antes por las skills `finance-charts` y
`dataviz`.

### Pixel art (`Pixel/`)

Todo el dibujo es SVG generado desde sprites en código: sin ficheros de imagen.

| Pieza | Para qué |
|---|---|
| `PixelSprite` | Pinta un `Sprite` (filas de letras) con una `Paleta` (letra → variable `--px-*`). La base de todo lo demás |
| `sprites.ts` | Sprites y paletas del héroe pequeño, del decorado (nube, pino), de los mundos (hucha, escudo, montaña, tarjeta), de los iconos (estrella, candado, moneda…) y del monstruo |
| `PixelHero` | El héroe pequeño (32x44): splash (sin equipo) y Camino (con él). `pose`: `quieto` · `agacha` · `camina` · `corre` · `celebra`; `mirando`; `equipo` (ids del catálogo). Su equipo, en `spritesEquipo.ts` |
| `HeroeGrande`, `EscenaHeroe` | El héroe grande (48x66) con su `equipo`, y su escena enmarcada (la Tienda). Sprites en `spritesGrande.ts`. `estreno` (un id) hace aparecer esa pieza con un gesto y destellos: solo lo pasa la tienda tras una compra. `senalado` (un hueco) rodea su pieza de un anillo, o pinta la silueta de la que falta |
| `EscenarioHeroe` | El héroe grande sobre su isla flotante, con sol, monedas y destellos: el del Cuadro de mando. `escala` entera; exporta su `viewBox` para poner encima lo que se señala |
| `ObjetoPixel`, `EstrellaPixel` | Un objeto de la tienda en su caja y la estrella suelta |
| `geometria.ts` | Círculos y trazos a píxel, en funciones puras (los planetas) |
| `useMovimientoReducido` | `prefers-reduced-motion` para lo que se anima desde JavaScript |

### Camino del héroe (`Heroe/`)

| Pieza | Para qué |
|---|---|
| `HeroeCamino`, `EquipoDelCamino` | El héroe de todo el módulo con lo que lleva equipado. `EquipoDelCamino` (en `app/CaminoHeroe/layout.tsx`) pide la tienda una vez y lo reparte por contexto; sin él, el héroe sale sin equipo. Usa `HeroeCamino`, nunca `PixelHero` a secas, en una escena nueva del Camino |
| `PaginaHeroe` | El marco de toda pantalla del módulo: título, volver, el aviso "no es asesoramiento" y `heroeEncima`. Con `Cargando` y `ErrorHeroe` |
| `MapaMundos`, `CaminoMundo`, `FichaNivel` | El mapa de planetas, el camino de un mundo y la ficha de un nivel. La geometría, en `planeta.ts` y `camino.ts`; el paseo del héroe, en `useCaminata` |
| `reproductor/` | El reproductor de un nivel: `Reproductor`, `Lectura`, `Secuencia` (una tanda de preguntas con feedback `inmediato` o `final`), `ProgresoNivel` y `Resultado` |
| `Marcado`, `FiltroPixel` | Pinta `**negrita**` y `_cursiva_` del contenido sin `dangerouslySetInnerHTML`, y el filtro que pixela los emoticonos |
| `ejercicios/` | Los seis tipos de pregunta y `Ejercicio`, que elige cuál pintar. Un tipo nuevo se añade aquí y en `src/types/heroe.types.ts` |

### Piezas de un solo sitio

No son genéricas, pero conviene saber que existen antes de rehacerlas:

- `Navbar`, `SideMenu/` (menú de módulos), `Splash/` (pantalla de carga y
  `EVENTO_FIN_SPLASH`), `Cuenta/` (`CuentaMenu`, `AvisoInvitado`).
- `Cuadro/`: `CuadroMando` (la pantalla, sin tarjetas), `HeroeEquipo` (el héroe
  que se señala con el ratón, con su bocadillo, y `useEscalaEscenario`) y
  `RadarHeroe` (el polígono dibujado a mano y la ficha en un modal, que abre su
  icono de información). Y `Tienda/Tienda`.
- `Inicio/`: `ElegirPatrimonio`, `SelectorMes` y `useMesDeInicio` (el `?mes=`).
- `Auth/`: los formularios de login, registro, contraseña y borrar cuenta.

## El sistema de diseño

La aplicación tiene un aspecto propio —trazo negro, esquinas orgánicas, sombra
dura, verde bosque— y no es decoración: es lo que la separa de una hoja de
cálculo. Vive en tres sitios y solo tres:

| Capa | Fichero | Qué es |
|---|---|---|
| **Tokens** | `app/globals.css` | Las Custom Properties `--sd-*`: color, trazo, sombra, radio, movimiento, tipografía. La única fuente de verdad |
| **Puente con Mantine** | `src/presentation/styles/mantine-sketch.module.css` | Se engancha en el tema con `Componente.extend({ classNames })`. Hace que TODO `<Button>`, `<Paper>` o `<TextInput>` ya existente herede el aspecto sin tocarlo |
| **Primitivos** | `src/presentation/components/ui/` | `SketchButton`, `SketchCard`, `SketchTitle`, `StatusBadge`, `EmptyState`, `AnimatedMoney`, `AnimatedCount`. Solo para lo que Mantine no da |

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

## Cómo se declara una vista

Es lo más distintivo del proyecto y lo que más sorprende al llegar: **un
formulario y una tabla no se escriben, se declaran**.

```
src/presentation/entidades/movimientos/formularios.ts ──►  <GenericForm sections={…} />
src/presentation/entidades/movimientos/tabla.ts       ──►  <AppTable columns={…} />
```

`entidades/` **describe** el formulario y la tabla; `GenericForm` y `AppTable`
los **pintan**. Vive dentro de `presentation` porque depende de ella (los tipos
de `GenericForm` y `AppTable`, los helpers de columna, los componentes propios
que referencia con `component:`): en `application` invertiría las capas.

### La invariante: `entidades/` no lleva JSX

Los ficheros de `src/presentation/entidades/` son `.ts`, nunca `.tsx`. Es una
invariante que impone el compilador: si aparece JSX, deja de compilar, y la
vigila además `src/__tests__/invariantes.test.ts` por carpeta. Eso es lo que
mantiene la definición declarativa y evita que se acabe colando lógica de pintado en el
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
- **Lo mismo para `disabledWhen`, `labelFrom` y `optionsFrom`** que lean otros
  campos: sin `dependsOn` el campo se repinta siempre (correcto, pero caro); con
  un `dependsOn` incompleto se queda con lo del primer pintado.
- **`MoneyInput` publica `null` mientras el texto no es un importe** ("12,3x"),
  nunca el último importe bueno: la validación lo trata como vacío y no se guarda
  una cifra que ya no se ve.
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
