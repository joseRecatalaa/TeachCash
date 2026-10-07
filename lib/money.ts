/**
 * Aritmética de dinero.
 *
 * Regla dura 1 del proyecto: un importe es un ENTERO en la unidad mínima de su
 * divisa (céntimos para EUR). Nunca un decimal, nunca un float. El decimal solo
 * aparece al formatear para una persona → lib/format.ts
 *
 * Este fichero no importa nada. Es la base de la que depende todo lo demás.
 */

export const CURRENCIES = ['EUR', 'USD', 'GBP'] as const

export type Currency = (typeof CURRENCIES)[number]

/**
 * La divisa de la aplicación.
 *
 * No se guarda en ninguna tabla: hay una sola cuenta y una sola moneda, así que
 * la divisa no es un dato, es una constante. Todo lo demás —la aritmética de
 * abajo, `lib/format.ts`, el `MoneyInput`— sigue trabajando con `Money`, que
 * lleva su divisa dentro y LANZA al mezclar dos. Esa red se queda puesta a
 * propósito: es lo que hace que el día que haya más de una divisa, este sea el
 * único sitio del que hay que tirar.
 */
export const DIVISA_APP: Currency = 'EUR'

/** Valida una divisa que viene de la base de datos o de un formulario. */
export const isCurrency = (value: string): value is Currency =>
  (CURRENCIES as readonly string[]).includes(value)

/**
 * La columna `currency` es texto en SQLite: el tipo `Currency` es una promesa al
 * compilador, no una garantía. Este es el punto donde se comprueba de verdad.
 */
export const asCurrency = (value: string): Currency => {
  if (!isCurrency(value)) throw new TypeError(`Divisa desconocida: ${value}`)
  return value
}

/** Importe en unidad mínima. `{ amount: 1234, currency: 'EUR' }` = 12,34 €. */
export type Money = { readonly amount: number; readonly currency: Currency }

/**
 * Construye un importe. Lanza si no es entero: esa red es la que caza el día en
 * que alguien meta un `precio * 1.21` sin redondear.
 */
export const money = (amount: number, currency: Currency = 'EUR'): Money => {
  if (!Number.isSafeInteger(amount)) {
    throw new TypeError(`Money.amount debe ser un entero seguro, recibido ${amount}`)
  }
  // Normaliza -0 a 0: Object.is(-0, 0) es false y un -0 colado por un Math.round
  // hace fallar comparaciones mucho más adelante, donde ya no se entiende por qué.
  return { amount: amount === 0 ? 0 : amount, currency }
}

export const zero = (currency: Currency = 'EUR'): Money => money(0, currency)

const assertSame = (a: Money, b: Money): void => {
  if (a.currency !== b.currency) {
    throw new TypeError(`No se pueden operar importes en ${a.currency} y ${b.currency}`)
  }
}

export const add = (a: Money, b: Money): Money => {
  assertSame(a, b)
  return money(a.amount + b.amount, a.currency)
}

export const sub = (a: Money, b: Money): Money => {
  assertSame(a, b)
  return money(a.amount - b.amount, a.currency)
}

export const neg = (a: Money): Money => money(-a.amount, a.currency)

export const abs = (a: Money): Money => money(Math.abs(a.amount), a.currency)

/** Multiplica por un escalar. Redondea a entero; la política se puede cambiar. */
export const mul = (a: Money, factor: number, round: (n: number) => number = Math.round): Money =>
  money(round(a.amount * factor), a.currency)

export const isZero = (a: Money): boolean => a.amount === 0
export const isNegative = (a: Money): boolean => a.amount < 0
export const isPositive = (a: Money): boolean => a.amount > 0

/** -1, 0 o 1. Lanza si las divisas no coinciden: ordenar peras y manzanas no significa nada. */
export const compare = (a: Money, b: Money): number => {
  assertSame(a, b)
  return a.amount === b.amount ? 0 : a.amount < b.amount ? -1 : 1
}

export const equals = (a: Money, b: Money): boolean =>
  a.currency === b.currency && a.amount === b.amount

/**
 * Suma una lista. La divisa explícita hace falta porque de una lista vacía no se
 * puede inferir: sumar cero euros y cero dólares no es lo mismo.
 */
export const sum = (items: readonly Money[], currency: Currency = 'EUR'): Money =>
  items.reduce<Money>((acc, m) => add(acc, m), zero(currency))

/**
 * Agrupa por divisa y suma cada grupo. Es la forma correcta de totalizar cuentas
 * mixtas: un único número que mezcla euros y dólares no significa nada.
 * Devuelve las divisas en orden alfabético, para que la UI sea estable.
 */
export const sumByCurrency = (items: readonly Money[]): Money[] => {
  const totals = new Map<Currency, number>()
  for (const m of items) totals.set(m.currency, (totals.get(m.currency) ?? 0) + m.amount)
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, amount]) => money(amount, currency))
}

/**
 * Reparte un importe en partes proporcionales a los pesos, de forma que las
 * partes sumen EXACTAMENTE el total.
 *
 * Repartir 100 € entre 3 no da 33,33 € × 3 — eso son 99,99 €. El céntimo que
 * falta tiene que ir a alguien de forma determinista, no evaporarse.
 *
 * Los céntimos sobrantes van, de uno en uno, a las partes con MAYOR PARTE
 * DECIMAL (método del resto mayor): a quien más cerca estaba de merecerlos.
 * 1,01 € al 10/45/45 da 0,10 / 0,46 / 0,45, no 0,11 / 0,45 / 0,45, que es lo
 * que daba repartirlos por orden. A igual parte decimal desempata la posición,
 * así que el resultado sigue siendo determinista.
 */
export const allocate = (total: Money, weights: readonly number[]): Money[] => {
  if (weights.length === 0) {
    throw new TypeError('allocate necesita al menos un peso')
  }
  if (weights.some((w) => !Number.isFinite(w) || w < 0)) {
    throw new TypeError('Los pesos deben ser números finitos no negativos')
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight === 0) {
    throw new TypeError('La suma de los pesos no puede ser cero')
  }

  // Math.floor en lugar de Math.round: así el resto es siempre >= 0 y se reparte
  // en una sola dirección, tanto para totales positivos como negativos.
  const shares = weights.map((w) => Math.floor((total.amount * w) / totalWeight))
  let remainder = total.amount - shares.reduce((a, b) => a + b, 0)

  // Lo que le faltó a cada parte para el céntimo siguiente, en unidades de
  // `totalWeight`: es la parte decimal sin dividir, así que con pesos enteros
  // se compara sin error de coma flotante.
  const faltante = weights.map((w, i) => total.amount * w - shares[i] * totalWeight)

  // Solo a quien tenga peso: dar un céntimo a alguien con peso 0 es repartirle
  // algo de lo que se dijo que no le tocaba nada.
  const orden = weights
    .flatMap((w, i) => (w > 0 ? [i] : []))
    .sort((a, b) => faltante[b] - faltante[a] || a - b)

  // El resto es la suma de las partes decimales, así que nunca supera el número
  // de partes con peso; el módulo es solo una red contra el redondeo flotante
  // con pesos no enteros.
  for (let k = 0; remainder > 0; k++, remainder--) {
    shares[orden[k % orden.length]]++
  }

  return shares.map((s) => money(s, total.currency))
}
