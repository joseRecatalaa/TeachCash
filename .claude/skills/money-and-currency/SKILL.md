---
name: money-and-currency
description: Reglas para representar, calcular, formatear y parsear importes monetarios. Úsala antes de declarar cualquier campo de importe, hacer aritmética con dinero (sumas, porcentajes, prorrateos, divisiones, conversión de divisa), formatear un importe para pantalla, o parsear un importe escrito por el usuario o leído de un CSV. Cubre enteros en unidad mínima, redondeo, reparto de restos sin descuadre, e Intl.NumberFormat en es-ES.
---

# Dinero y divisas

## La regla

**Un importe es un entero en la unidad mínima de su divisa (céntimos para EUR).**
Nunca un `number` decimal, nunca un `float`, nunca una cadena con coma.

```ts
// MAL — se descuadra
const total = 0.1 + 0.2            // 0.30000000000000004
const iva = precio * 0.21          // arrastra error binario

// BIEN — enteros
const total = 10 + 20              // 30 céntimos, exacto
```

El decimal solo aparece en el último milímetro del sistema: al formatear para
que lo lea una persona. Nunca antes.

## El tipo

```ts
// lib/money.ts
export type Currency = 'EUR' | 'USD' | 'GBP'

/** Importe en unidad mínima. 1234 con currency 'EUR' = 12,34 €. */
export type Money = { readonly amount: number; readonly currency: Currency }

export const money = (amount: number, currency: Currency = 'EUR'): Money => {
  if (!Number.isSafeInteger(amount)) {
    throw new TypeError(`Money.amount debe ser entero, recibido ${amount}`)
  }
  return { amount, currency }
}
```

Ese `Number.isSafeInteger` no es defensivo de más: es la red que detecta el día
en que alguien meta un `precio * 1.21` sin redondear.

### Por qué `number` y no `bigint`

`Number.MAX_SAFE_INTEGER` son ~90 billones de euros en céntimos. Sobra para
finanzas personales, y `number` serializa a JSON sin ceremonia. Si algún día
hiciera falta precisión mayor (cripto con 18 decimales), se cambia a `bigint`
en este único fichero.

## Aritmética

```ts
const assertSame = (a: Money, b: Money) => {
  if (a.currency !== b.currency) {
    throw new TypeError(`No se pueden operar ${a.currency} y ${b.currency}`)
  }
}

export const add = (a: Money, b: Money): Money =>
  (assertSame(a, b), money(a.amount + b.amount, a.currency))

export const sub = (a: Money, b: Money): Money =>
  (assertSame(a, b), money(a.amount - b.amount, a.currency))

export const neg = (a: Money): Money => money(-a.amount, a.currency)

/** Multiplica por un escalar. Redondea a entero — decide la política. */
export const mul = (a: Money, factor: number, round = Math.round): Money =>
  money(round(a.amount * factor), a.currency)
```

**Nunca sumes importes de divisas distintas.** Un `reduce` sobre importes de
procedencias mixtas debe agrupar por divisa, no acumular en una variable suelta.

En este proyecto hoy hay **una sola divisa** y la decide `DIVISA_APP`. La red de
`lib/money.ts` —que LANZA al operar dos monedas— se conserva igualmente: es lo
que convierte "añadir multidivisa" en un cambio localizado en vez de en una
auditoría de todo el código.

### Sumar una lista

```ts
export const sum = (items: Money[], currency: Currency = 'EUR'): Money =>
  items.reduce((acc, m) => add(acc, m), money(0, currency))
```

Si la lista puede venir vacía, hace falta la divisa explícita: no se puede
inferir de la nada.

## Redondeo y reparto

Todo redondeo pierde céntimos. El problema no es perderlos, es **perderlos sin
que nadie sepa dónde fueron**.

Repartir 100 € entre 3 personas no da 33,33 € × 3 — eso son 99,99 €. Falta un
céntimo, y tiene que ir a alguien de forma determinista.

```ts
/** Reparte un importe en n partes que suman exactamente el total. */
export const allocate = (total: Money, weights: number[]): Money[] => {
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const shares = weights.map((w) => Math.floor((total.amount * w) / totalWeight))
  let remainder = total.amount - shares.reduce((a, b) => a + b, 0)
  // El resto va a las partes con MAYOR PARTE DECIMAL (método del resto mayor);
  // a igual parte decimal, desempata la posición. Nunca a un peso 0.
  const faltante = weights.map((w, i) => total.amount * w - shares[i] * totalWeight)
  const orden = weights
    .flatMap((w, i) => (w > 0 ? [i] : []))
    .sort((a, b) => faltante[b] - faltante[a] || a - b)
  for (let k = 0; remainder > 0; k++, remainder--) shares[orden[k % orden.length]]++
  return shares.map((s) => money(s, total.currency))
}
```

Por qué así y no "por orden": 1,01 € al 10/45/45 es exactamente 0,101 / 0,4545 /
0,4545. Por orden, el céntimo sobrante iría al primero (0,11, el que más se aleja
de su parte); por mayor parte decimal va al segundo (0,10 / 0,46 / 0,45). La
versión real, con sus validaciones, está en `lib/money.ts`.

Invariante que debe estar cubierto por un test: `sum(allocate(t, w)) === t`,
para cualquier `t` y `w`. Ver skill `testing-finance`.

Para políticas de redondeo (half-up vs half-even), conversión de divisa y el
tratamiento de importes negativos, lee `references/rounding-and-allocation.md`.

## Formateo (salida)

```ts
// lib/format.ts
const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(m: Money, locale = 'es-ES'): string {
  const key = `${locale}:${m.currency}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, { style: 'currency', currency: m.currency })
    formatters.set(key, f)
  }
  return f.format(m.amount / 100)   // única división permitida del sistema
}
```

- **Cachea los `Intl.NumberFormat`.** Construirlos es caro; en una tabla de 500
  movimientos se nota.
- El `/ 100` asume 2 decimales. Si entra una divisa con otra escala (JPY tiene
  0), usa `Intl.NumberFormat().resolvedOptions().maximumFractionDigits` para
  derivar el divisor en lugar de codificarlo.
- En es-ES el resultado es `1.234,56 €` — separador de miles punto, decimal
  coma, símbolo detrás. No lo construyas a mano.

### En la UI

Los importes en columnas **siempre** con `tabular-nums`, o los dígitos bailan y
las cifras dejan de poder compararse de un vistazo:

```tsx
<td className="text-right tabular-nums">{formatMoney(m)}</td>
```

Alineados a la derecha, siempre. Y el signo: gasto en rojo e ingreso en verde es
insuficiente por sí solo (accesibilidad) — acompáñalo de signo `−`/`+` explícito.

## Parseo (entrada)

Lo que escribe una persona española no es lo que espera `parseFloat`.

```ts
/** Parsea entrada es-ES ("1.234,56", "1234,56", "1234.56") a céntimos. */
export function parseMoney(input: string, currency: Currency = 'EUR'): Money | null {
  const cleaned = input.trim().replace(/[\s€$£]/g, '')
  if (!cleaned) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  // El separador decimal es el último que aparezca; el otro es de miles.
  const decimalSep = lastComma > lastDot ? ',' : lastDot > lastComma ? '.' : null

  let normalized = cleaned
  if (decimalSep) {
    const thousandsSep = decimalSep === ',' ? '.' : ','
    normalized = cleaned.split(thousandsSep).join('').replace(decimalSep, '.')
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null

  const [whole, frac = ''] = normalized.split('.')
  const cents = frac.padEnd(2, '0').slice(0, 2)     // trunca, no redondea
  const sign = whole.startsWith('-') ? -1 : 1
  return money(sign * (Math.abs(Number(whole)) * 100 + Number(cents)), currency)
}
```

Devuelve `null` en lugar de lanzar: el parseo de entrada de usuario es un caso
esperado de fallo, no una excepción. Quien llama decide el mensaje de error.

En el `<input>`, usa `inputMode="decimal"` (no `type="number"`, que en móvil es
un desastre con la coma) y valida en el servidor de todas formas.

## Errores que aparecen una y otra vez

| Síntoma | Causa |
|---|---|
| Descuadres de 1 céntimo en totales | Redondear cada línea en vez de repartir el resto |
| Importes que cambian al recargar | `float` almacenado en la base de datos |
| `NaN €` en pantalla | `parseFloat("1.234,56")` → `1.234` o `NaN` |
| Suma de importes en divisas mezcladas | `reduce` sin comprobar divisa |
| Total ≠ suma de sus partes | `allocate` implementado con `Math.round` por parte |

## Auditoría

`scripts/audit-money.mjs` busca en el código los patrones que delatan dinero en
coma flotante. Ejecútalo tras tocar `lib/money.ts` o el esquema:

```bash
node .claude/skills/money-and-currency/scripts/audit-money.mjs
```