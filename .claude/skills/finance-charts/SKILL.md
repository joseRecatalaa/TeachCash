---
name: finance-charts
description: Reglas de dominio para gráficos financieros — evolución de saldo, gasto por categoría, ingresos frente a gastos, progreso de presupuesto y flujo de caja. Cubre elección de forma, tratamiento de signo y color, ejes de dinero, formateo de importes en los gráficos y qué visualizaciones no usar. Úsala junto con la skill global dataviz (que aporta la parte visual y de paleta) siempre que vayas a construir un gráfico de esta aplicación.
---

# Gráficos financieros

**Carga primero la skill `dataviz`** para paleta, tipografía, ejes e
interacción. Esta skill solo añade lo que es específico de datos de dinero.

## Qué forma para qué pregunta

| El usuario pregunta | Forma | Ojo con |
|---|---|---|
| ¿Cómo evoluciona mi saldo? | Línea, tiempo en X | Un punto por día, no por movimiento |
| ¿En qué se me va el dinero? | Barras horizontales ordenadas | Donut solo si son ≤5 categorías |
| ¿Ingreso más de lo que gasto? | Barras agrupadas o línea de neto | Dos barras por mes, no apiladas |
| ¿Cómo voy de presupuesto? | Barra de progreso por categoría | Debe poder pasar del 100% |
| ¿De dónde a dónde va el dinero? | Waterfall | Rara vez merece la pena |

## Reglas duras

### El eje de dinero empieza en cero

Truncar el eje Y exagera visualmente las variaciones. En un gráfico de gastos
eso significa que el usuario toma decisiones sobre una diferencia que parece
enorme y son doce euros. Es la manipulación visual clásica y aquí es
particularmente dañina porque el usuario se está evaluando a sí mismo.

**Única excepción**: la serie de SALDO. Ahí lo que se lee es la variación, y un
cero lejano la aplasta contra el techo del gráfico — por eso `SerieSaldoChart`
usa `domain={['auto', 'auto']}`. No vale para gastos ni para ingresos, que son
magnitudes y siempre arrancan en cero.

### El color no puede ser la única señal

Rojo/verde para gasto/ingreso es la convención esperada, pero es exactamente el
par que no distingue una parte notable de la población (deuteranopía). Añade
**siempre** una segunda señal: signo (`−`/`+`), posición respecto a la línea
cero, o etiqueta.

En España el rojo para gasto es lo esperado. En otros mercados la convención de
color cambia; si algún día hay i18n, revísalo.

### Los importes se formatean con `formatMoney`

Nunca `toFixed(2)` ni concatenar `€` en las etiquetas. Los ticks del eje sí
pueden ir compactos:

```ts
// Ticks del eje: 1.2 k €, 15 k €
const tickFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency', currency: 'EUR',
  notation: 'compact', maximumFractionDigits: 1,
})
// Tooltip: importe exacto, siempre completo
formatMoney(money(valor))
```

Compacto en el eje, exacto en el tooltip. Nunca compacto en un tooltip: el
usuario que pasa el ratón quiere la cifra concreta.

### Los gráficos no mezclan divisas

Hoy es gratis: hay una sola divisa (`DIVISA_APP`). Si algún día hay más, o se
convierte todo a la divisa base —indicando la tasa y su fecha— o se muestran
gráficos separados. Un eje con euros y dólares sumados no significa nada.

### Fuera lo que está en la papelera

Un movimiento borrado no cuenta en ningún gráfico ni en el saldo:
`deleted_at IS NULL`, siempre. → skill `finance-data-model`

### El color de una categoría es SUYO, no de su posición

Cada categoría lleva su color guardado (`categories.color`, una clave de la
paleta) y la agregación lo trae consigo. Asignar el color por índice de la serie
hace que filtrar el gráfico repinte las categorías que quedan, y entonces el
color deja de servir para reconocer nada. Solo las categorías sin color asignado
caen al reparto por posición. → `lib/colores.ts`

## Detalles que se escapan

**Serie temporal de saldo**: rellena los días sin movimiento con el saldo
anterior. Una línea que solo tiene puntos donde hubo movimiento dibuja
pendientes falsas entre fechas distantes.

**Gasto por categoría**: ordena por importe descendente, no alfabético ni por el
orden que devuelva la base de datos. Agrupa la cola larga en "Otras (n)" a
partir de ~8 categorías, y haz que sea desplegable.

**Presupuesto**: la barra tiene que poder pasar del 100%. Un `width: min(pct,
100%)` hace que gastar el 180% se vea igual que gastar el 100% — justo el caso
donde el usuario necesita alarmarse. Que el exceso sea visible.

**Meses sin datos**: un hueco no es un cero. Si el usuario empezó a usar la app
en marzo, enero y febrero no son "meses de gasto cero"; no los pintes.

**Signo en agregados de gasto**: internamente los gastos son negativos. Para
presentarlos como magnitud positiva, invierte **en la capa de presentación**, y
etiqueta el eje "Gasto" para que se entienda que son salidas.

## Lo que no funciona

- **Donut con 15 categorías.** Ilegible. Barras horizontales.
- **Donut con valores negativos.** Un ángulo negativo no existe.
- **Área apilada con series que cambian de signo.** El apilado deja de ser legible.
- **Ejes duales** (gasto y ahorro en escalas distintas). La correlación aparente depende de cómo hayas escalado los ejes, es decir, de nada.
- **Gráfico 3D.** Nunca.

## Accesibilidad

- Toda serie con etiqueta textual, no solo entrada de leyenda por color.
- Todo gráfico con alternativa en tabla accesible (visualmente oculta vale).
- Contraste mínimo 3:1 entre series adyacentes.
- El tooltip debe alcanzarse por teclado, no solo con `mouseover`.

## Implementación

Los componentes de gráfico llevan `'use client'` (necesitan medir el DOM). Manda
al cliente **solo los datos agregados** que se pintan, nunca los movimientos en
crudo para agregar en el navegador: es más lento y expone datos que no se ven.

```tsx
// Server Component: agrega en SQL
const data = await getMonthlySpendByCategory(userId, period)
return <SpendChart data={data} />   // SpendChart lleva 'use client'
```