@AGENTS.md

---

# Cómo trabajar en este repo

Lo de arriba es la documentación del proyecto: arquitectura, reglas duras y
convenciones. Lo que sigue es lo específico de trabajar aquí en una sesión.

## Antes de escribir código

**Localiza la capa.** Cada cosa tiene un sitio y solo uno:

| Si vas a… | Toca |
|---|---|
| Cambiar qué campos tiene un formulario | `src/config/<entidad>/sections.ts` |
| Cambiar qué columnas tiene una tabla | `src/config/<entidad>/columns.ts` |
| Cambiar una regla de negocio o una validación | `src/infrastructure/repositories/<entidad>.repository.ts` |
| Cambiar el aspecto de TODOS los formularios | `presentation/components/Forms/GenericForm/` |
| Cambiar el aspecto de TODAS las tablas | `presentation/components/AppTable/` |
| Añadir una operación que no es CRUD | Una función en el repositorio + su acción en `entity.actions.ts` + su hook |
| Añadir una entidad entera | `pnpm generate:crud` |

Si te ves escribiendo un formulario a mano con `<TextInput>` sueltos, o una
`<DataTable>` fuera de `AppTable`, párate: casi siempre significa que no has
encontrado la pieza genérica.

## Antes de dar algo por terminado

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:tz
```

`pnpm test:tz` no es redundante: corre la misma suite en `Pacific/Kiritimati` y
es lo que caza las fechas que se han colado como instantes en lugar de como
fechas civiles. Un cambio que toque fechas y no pase por aquí no está probado.

Si has tocado rutas, layouts o tipos de página, pasa también `pnpm build`: el
tipo `LayoutProps` lo genera el build, así que `typecheck` a solas no lo ve.

## Trampas de este repo

Cosas que cuestan tiempo si nadie las avisa:

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
  olvidas, el campo deja de actualizarse **sin dar ningún error**.
- **Nada de `Date` para la fecha de un movimiento.** Cadenas `'YYYY-MM-DD'`.
  `lib/dates.ts` opera sobre ellas sin construir un solo `Date`.
- **Los repositorios importan `@/db`**, así que nunca se importan desde un
  componente cliente. La frontera es `entity.actions.ts`.
- **Cuidado con los finales de línea.** El repo es LF. Un fichero que acabe en
  CRLF hace que los `modify` del generador de Plop no casen y se salten **en
  silencio**.

## Al escribir código

Sigue el estilo del código que rodea a lo que tocas: comillas simples, sin punto
y coma, y comentarios que expliquen **por qué** algo es así, no qué hace. En un
proyecto de dinero, el comentario que importa es el que dice qué se rompe si
alguien cambia esa línea.

Cuando una decisión no sea obvia y no esté ya en `AGENTS.md`, añádela a
"Decisiones tomadas" o a "Decisiones abiertas" en lugar de dejarla implícita.
