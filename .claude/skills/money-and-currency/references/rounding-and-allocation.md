# Redondeo, reparto y divisas — detalle

## Políticas de redondeo

`Math.round` en JavaScript es *half-up hacia +∞*: `Math.round(-0.5) === -0`, pero
`Math.round(0.5) === 1`. Para importes negativos (gastos) eso introduce un sesgo
asimétrico. Si el signo importa, redondea sobre el valor absoluto:

```ts
const roundHalfAwayFromZero = (n: number) =>
  Math.sign(n) * Math.round(Math.abs(n))
```

### Half-even (redondeo bancario)

Reduce el sesgo acumulado cuando se redondean muchas cifras: los `.5` van al par
más cercano, así que la mitad sube y la mitad baja.

```ts
export function roundHalfEven(n: number): number {
  const floor = Math.floor(n)
  const diff = n - floor
  if (diff > 0.5) return floor + 1
  if (diff < 0.5) return floor
  return floor % 2 === 0 ? floor : floor + 1
}
```

**Cuándo usar cada uno:** para finanzas personales, half-away-from-zero es
suficiente y más intuitivo para el usuario (0,005 → 0,01). Half-even importa
cuando se agregan miles de cifras y el sesgo se acumula, o cuando hay que casar
con lo que hace el banco. Elige uno, documéntalo y no lo mezcles.

## Reparto proporcional

El error clásico es redondear cada parte por separado:

```ts
// MAL — 100,00 € entre 3 da 99,99 €
partes = [33.33, 33.33, 33.33]
```

El método correcto (implementado en `allocate` en SKILL.md) es:

1. Calcular cada parte con `Math.floor` — nunca reparte de más.
2. Medir el resto: `total - suma(partes)`. Siempre es `0 <= resto < n`.
3. Repartir el resto de uno en uno, de forma determinista.

**El orden del reparto es una decisión de producto.** Empezar por el primero
favorece siempre al mismo. Alternativas: al que tenga mayor parte fraccionaria
(el reparto "más justo"), o rotar según un índice estable. Lo importante es que
sea determinista: repetir el cálculo debe dar el mismo resultado.

Con pesos negativos `allocate` no está definido — valídalo antes de llamar.

## Porcentajes

```ts
// 21% de IVA sobre 1000 céntimos
mul(money(1000), 0.21)   // 210
```

Cuidado con encadenar: aplicar un descuento del 10% y luego un IVA del 21%
redondeando en cada paso no da lo mismo que aplicar el factor combinado. Regla:
**redondea una sola vez, al final de la cadena de multiplicaciones.**

```ts
// MAL
const conDescuento = mul(base, 0.9)
const conIva = mul(conDescuento, 1.21)

// BIEN
const final = mul(base, 0.9 * 1.21)
```

## Conversión de divisa

Una conversión tiene tres partes que hay que guardar juntas, no solo el
resultado: importe origen, tasa aplicada y fecha de la tasa. Sin eso el
histórico no es reproducible y los informes cambian retroactivamente.

```ts
export type FxRate = {
  from: Currency
  to: Currency
  /** Tasa en millonésimas para evitar float: 1,0854 → 1_085_400 */
  rateMicros: number
  /** Fecha civil de la tasa, YYYY-MM-DD */
  date: string
}

export const convert = (m: Money, rate: FxRate): Money => {
  if (m.currency !== rate.from) throw new TypeError('Divisa origen no coincide')
  return money(Math.round((m.amount * rate.rateMicros) / 1_000_000), rate.to)
}
```

Guardar la tasa como entero en millonésimas evita el mismo problema de coma
flotante un nivel más abajo. Y guarda **siempre** el importe original: el
convertido es un derivado, y si mañana corriges la tasa quieres poder recalcular.

## Divisas con escala distinta de 2

No todas las divisas tienen 2 decimales: JPY y KRW tienen 0, algunas del Golfo
tienen 3. Si el proyecto se limita a EUR, codificar `/ 100` es aceptable — pero
entonces **el tipo `Currency` debe ser solo `'EUR'`**, para que el compilador
impida el día que alguien meta JPY. Si se amplía, deriva la escala:

```ts
const scale = (c: Currency): number => {
  const digits = new Intl.NumberFormat('es-ES', { style: 'currency', currency: c })
    .resolvedOptions().maximumFractionDigits
  return 10 ** digits
}
```

## Signo de los movimientos

Dos convenciones válidas, incompatibles entre sí:

- **Signed**: un movimiento tiene `amount` negativo si es gasto. Sumar la
  columna da el saldo directamente. Más simple, es la recomendada aquí.
- **Type + magnitud**: `amount` siempre positivo, más un campo `direction`.
  Requiere `CASE WHEN` en cada agregación.

Elige una y no la mezcles. Si es signed, entonces "gastos del mes" es
`SUM(amount) WHERE amount < 0`, y para mostrarlo como cifra positiva se invierte
en la capa de presentación, nunca en la de datos.

Las transferencias entre cuentas propias son el caso que rompe los informes: son
dos movimientos (−100 en origen, +100 en destino) que **no son ni ingreso ni
gasto**. Deben quedar marcadas y excluidas de cualquier informe de gasto por
categoría, o el usuario verá que "gastó" dinero que solo movió de sitio.