# Gestor de finanzas personales

Aplicación web local para llevar tus cuentas: movimientos, transferencias,
categorías, patrimonio total y gráficos.

Los datos viven en un fichero SQLite dentro de `data/`, que está ignorado por
git. No sale nada de tu máquina y no hay ningún servicio externo.

## Arrancar

```bash
pnpm install
pnpm db:migrate     # crea las tablas
pnpm db:seed        # categorías por defecto en español
pnpm dev            # http://localhost:3000
```

No hay login: la aplicación asume un único usuario local.

## Qué hace

- **Cuentas** (corriente, ahorro, tarjeta, efectivo, inversión) con su divisa y
  saldo derivado de los movimientos.
- **Movimientos** de gasto e ingreso, con categoría, filtrables por mes, cuenta,
  categoría y texto.
- **Transferencias** entre tus cuentas: mueven los dos saldos pero no cuentan
  como gasto ni como ingreso.
- **Resumen** con el patrimonio total (una cifra por divisa) y la evolución del
  saldo.
- **Informes** mensuales: gasto por categoría e ingresos frente a gastos.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm test` | Suite de Vitest |
| `pnpm test:tz` | La misma suite con otro huso horario |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Genera una migración tras tocar `db/schema.ts` |
| `pnpm db:studio` | Explorador de la base de datos |
| `pnpm generate:crud` | Scaffolding completo de una entidad nueva |

## Para trabajar en el código

Lee **`AGENTS.md`** antes de tocar nada: lleva las reglas duras, el mapa de las
cinco capas y cómo se declara una vista. `docs/PLAN-V1.md` tiene el plan de la v1
y el porqué de cada decisión técnica.

La regla que más importa: **el dinero es un entero en céntimos**, nunca un
decimal. Se convierte a decimal solo al formatearlo para pantalla.

### La arquitectura, en un párrafo

Clean Architecture en cinco capas —`types` / `infrastructure` / `application` /
`config` / `presentation`— con **Refine.dev** como framework de datos y
**Mantine** para la interfaz. Tres DTOs por entidad, hooks generados por una
factory, y la vista *declarada* en ficheros `.ts` sin JSX (`sections.ts` para el
formulario, `columns.ts` para el listado) que pintan dos componentes genéricos,
`GenericForm` y `AppTable`.

No hay API HTTP: el DataProvider de Refine llama a **Server Actions** que
consultan SQLite en proceso.

```
Página → useList / useOne / useCreate…   (Refine, en el navegador)
       → refine-data-provider.ts
       → entity.actions.ts        'use server'
       → <entidad>.repository.ts  Drizzle
       → SQLite
```

### Añadir una entidad

```bash
pnpm generate:crud
```

Crea los nueve ficheros de la entidad y la registra en los dos sitios que hacen
falta. Deja cuatro `// TODO`: los campos de los DTOs, la tabla del repositorio,
los campos del formulario y las columnas del listado. El detalle, en la sección
"Añadir una entidad" de `AGENTS.md`.
