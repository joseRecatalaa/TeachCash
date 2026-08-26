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

## Para trabajar en el código

Lee `AGENTS.md` (reglas duras del proyecto) y `../docs/PLAN-V1.md` (el plan de
la v1 y el porqué de cada decisión técnica).

La regla que más importa: **el dinero es un entero en céntimos**, nunca un
decimal. Se convierte a decimal solo al formatearlo para pantalla.
