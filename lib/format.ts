/**
 * Formateo y parseo para personas. Es el único milímetro del sistema donde el
 * dinero se convierte en decimal.
 *
 * Depende de lib/money.ts y lib/dates.ts; nunca al revés.
 */

import { money, type Currency, type Money } from './money'
import { partsOf, type CivilDate, type Period } from './dates'

export const LOCALE = 'es-ES'

// Construir un Intl.NumberFormat es caro. En una tabla de 500 movimientos se nota.
const numberFormatters = new Map<string, Intl.NumberFormat>()

const getNumberFormatter = (key: string, build: () => Intl.NumberFormat): Intl.NumberFormat => {
  let f = numberFormatters.get(key)
  if (!f) {
    f = build()
    numberFormatters.set(key, f)
  }
  return f
}

/**
 * Decimales de la divisa, según ICU. EUR y USD tienen 2; JPY tiene 0.
 * Derivarlo en vez de codificar `100` es lo que permite añadir divisas sin
 * descuadrar todos los importes.
 */
export const fractionDigitsOf = (currency: Currency): number => {
  const digits = getNumberFormatter(`digits:${currency}`, () =>
    new Intl.NumberFormat(LOCALE, { style: 'currency', currency }),
  ).resolvedOptions().maximumFractionDigits
  // El tipo lo declara opcional; con style 'currency' siempre viene. El 2 es una
  // red por si alguna implementación no lo informa, no la fuente de verdad.
  /* v8 ignore next -- Intl siempre informa maximumFractionDigits de una divisa. */
  return digits ?? 2
}

/** Factor entre la unidad mínima y la unidad principal. 100 para EUR. */
export const scaleOf = (currency: Currency): number => 10 ** fractionDigitsOf(currency)

/** `1.234,56 €`. En es-ES el símbolo va detrás, precedido de espacio no separable. */
export function formatMoney(m: Money, locale: string = LOCALE): string {
  const f = getNumberFormatter(`money:${locale}:${m.currency}`, () =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: m.currency }),
  )
  return f.format(m.amount / scaleOf(m.currency))
}

/**
 * `+1.234,56 €` / `-1.234,56 €`, con el signo siempre visible salvo en el cero.
 * El color no puede ser la única señal de ingreso/gasto: el par rojo/verde es
 * justo el que no distingue la deuteranopía.
 */
export function formatMoneySigned(m: Money, locale: string = LOCALE): string {
  const f = getNumberFormatter(`signed:${locale}:${m.currency}`, () =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: m.currency,
      signDisplay: 'exceptZero',
    }),
  )
  return f.format(m.amount / scaleOf(m.currency))
}

/**
 * `1,2 mil €`. Solo para ticks de eje en gráficos, donde no cabe la cifra
 * completa. Nunca en un tooltip: quien pasa el ratón quiere el importe exacto.
 */
export function formatMoneyCompact(m: Money, locale: string = LOCALE): string {
  const f = getNumberFormatter(`compact:${locale}:${m.currency}`, () =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: m.currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }),
  )
  return f.format(m.amount / scaleOf(m.currency))
}

/**
 * El importe tal y como debe aparecer dentro de un `<input>`: "1234,56".
 *
 * Sin símbolo y SIN separador de miles a propósito — "1.234" es ambiguo al
 * volver a parsearlo, y este valor está pensado justo para eso: que el usuario
 * lo edite y se reenvíe.
 */
export function formatAmountForInput(m: Money, locale: string = LOCALE): string {
  const digits = fractionDigitsOf(m.currency)
  const f = getNumberFormatter(`input:${locale}:${digits}`, () =>
    new Intl.NumberFormat(locale, {
      style: 'decimal',
      useGrouping: false,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }),
  )
  return f.format(m.amount / scaleOf(m.currency))
}

type Separadores = { decimal: '.' | ',' | null; miles: '.' | ',' | null }

/**
 * Cuál de los dos signos es el separador decimal y cuál el de miles:
 * - si aparecen los dos, el decimal es el último en aparecer ("1.234,56", "1,234.56");
 * - si uno aparece varias veces, es de miles: no existe un número con dos comas decimales;
 * - si solo hay uno y una vez, se asume decimal. "1.234" se lee 1,23 €: es una
 *   ambigüedad real del castellano y hay que resolverla en alguna dirección.
 */
function separadoresDe(texto: string): Separadores {
  const puntos = texto.split('.').length - 1
  const comas = texto.split(',').length - 1

  if (puntos > 0 && comas > 0) {
    return texto.lastIndexOf(',') > texto.lastIndexOf('.')
      ? { decimal: ',', miles: '.' }
      : { decimal: '.', miles: ',' }
  }
  if (puntos === 1) return { decimal: '.', miles: ',' }
  if (comas === 1) return { decimal: ',', miles: '.' }
  if (puntos > 1) return { decimal: null, miles: '.' }
  if (comas > 1) return { decimal: null, miles: ',' }
  return { decimal: null, miles: null }
}

/**
 * La parte entera sin separadores de miles, o `null` si no agrupa de verdad:
 * 1-3 dígitos y luego grupos de exactamente 3. Sin esto, "1,2,3" pasaría por
 * 123 en lugar de rechazarse.
 */
function sinMiles(entero: string, miles: string | null): string | null {
  if (!miles || !entero.includes(miles)) return entero
  const grupos = entero.split(miles)
  const agrupa = /^\d{1,3}$/.test(grupos[0]) && grupos.slice(1).every((g) => /^\d{3}$/.test(g))
  return agrupa ? grupos.join('') : null
}

/**
 * Parsea lo que escribe una persona ("1.234,56", "1234,56", "1234.56", "12 €")
 * a un importe entero.
 *
 * Devuelve `null` en lugar de lanzar: que el usuario escriba algo inválido es un
 * caso esperado, no una excepción. Quien llama decide el mensaje de error.
 */
export function parseMoney(input: string, currency: Currency = 'EUR'): Money | null {
  // \s en JavaScript incluye el espacio no separable (U+00A0) y el fino (U+202F),
  // que son los que mete Intl antes del símbolo. `trim()` a secas no los quitaría.
  const cleaned = input.trim().replace(/[\s€$£+]/g, '')
  if (!cleaned) return null

  const { decimal, miles } = separadoresDe(cleaned)
  const corte = decimal ? cleaned.lastIndexOf(decimal) : cleaned.length
  const negativo = cleaned.startsWith('-')
  const entero = sinMiles(cleaned.slice(negativo ? 1 : 0, corte), miles)
  const fraccion = cleaned.slice(corte + 1)

  if (entero === null || !/^\d+$/.test(entero)) return null
  if (fraccion !== '' && !/^\d+$/.test(fraccion)) return null

  const digits = fractionDigitsOf(currency)
  // Trunca, no redondea: si alguien escribe 1,999 quiere decir 1,99, no 2,00.
  // Una divisa sin decimales (JPY) no tiene parte menor. Hoy no hay ninguna en
  // CURRENCIES; la rama está para que añadirla no descuadre nada.
  /* v8 ignore next */
  const minor = digits === 0 ? 0 : Number(fraccion.padEnd(digits, '0').slice(0, digits))
  const amount = (negativo ? -1 : 1) * (Number(entero) * 10 ** digits + minor)

  return Number.isSafeInteger(amount) ? money(amount, currency) : null
}

/** '2026-08-13' → '13/08/2026'. Sin `Date`: no hay huso que pueda mover el día. */
export function formatDate(date: CivilDate): string {
  const { year, month, day } = partsOf(date)
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>()

const getDateFormatter = (key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  let f = dateTimeFormatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: 'UTC' })
    dateTimeFormatters.set(key, f)
  }
  return f
}

/** '2026-08-13' → '13 de agosto de 2026'. */
export function formatDateLong(date: CivilDate): string {
  const { year, month, day } = partsOf(date)
  // Date en UTC + formateo en UTC: el instante da igual mientras ambos coincidan.
  return getDateFormatter('long', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  )
}

/** '2026-08' → 'agosto de 2026'. */
export function formatPeriod(period: Period): string {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  return getDateFormatter('period', { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  )
}

/** '2026-08' → 'ago' — para ejes de gráficos, donde no cabe el mes completo. */
export function formatPeriodShort(period: Period): string {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  return getDateFormatter('periodShort', { month: 'short' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  )
}

/** Porcentaje ya calculado (0.85 → '85 %'). */
export function formatPercent(ratio: number, maximumFractionDigits = 0): string {
  const f = getNumberFormatter(`percent:${maximumFractionDigits}`, () =>
    new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits }),
  )
  return f.format(ratio)
}
