/**
 * Fechas civiles y periodos contables.
 *
 * Regla dura 5 del proyecto: la fecha de un movimiento es una fecha civil, no un
 * instante. "Comí fuera el día 30" no tiene hora ni huso. Se representa como
 * cadena 'YYYY-MM-DD' y se opera con aritmética de enteros, nunca con `Date`.
 *
 * El único sitio donde aparece un `Date` es `today()`, porque "qué día es hoy"
 * sí depende del reloj y del huso del usuario.
 */

/** Fecha civil 'YYYY-MM-DD'. */
export type CivilDate = string
/** Periodo mensual 'YYYY-MM'. */
export type Period = string

/** Huso del usuario. Cuando haya preferencias, sale de ahí. */
export const USER_TIME_ZONE = 'Europe/Madrid'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const PERIOD_RE = /^(\d{4})-(\d{2})$/

export const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Días del mes. `month` es 1-12. */
export const daysInMonth = (year: number, month: number): number =>
  month === 2 && isLeapYear(year) ? 29 : MONTH_LENGTHS[month - 1]

/** ¿Es una fecha civil válida? Rechaza también días que no existen (2026-02-30). */
export const isCivilDate = (value: string): boolean => {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const [, y, mo, d] = m
  const year = Number(y)
  const month = Number(mo)
  const day = Number(d)
  if (month < 1 || month > 12) return false
  return day >= 1 && day <= daysInMonth(year, month)
}

export const isPeriod = (value: string): boolean => {
  const m = PERIOD_RE.exec(value)
  if (!m) return false
  const month = Number(m[2])
  return month >= 1 && month <= 12
}

const assertCivilDate = (value: string): void => {
  if (!isCivilDate(value)) throw new TypeError(`Fecha civil inválida: ${value}`)
}

const assertPeriod = (value: string): void => {
  if (!isPeriod(value)) throw new TypeError(`Periodo inválido: ${value}`)
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0')

export const civilDate = (year: number, month: number, day: number): CivilDate =>
  `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`

/** Descompone una fecha civil. No usa `Date`, así que no hay huso que la mueva. */
export const partsOf = (date: CivilDate): { year: number; month: number; day: number } => {
  assertCivilDate(date)
  const m = DATE_RE.exec(date)!
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

/**
 * Días transcurridos desde 1970-01-01, calculado sobre el calendario civil.
 * Algoritmo de Howard Hinnant (days_from_civil): aritmética entera pura, sin
 * `Date`, así que no hay cambios de hora ni husos que puedan desplazar un día.
 */
// Nombrados en vez de literales: `yoe / 100` es la regla de siglos del calendario
// gregoriano, no una conversión de céntimos, y así no lo confunde ni el auditor
// de dinero ni quien lea esto dentro de un año.
const YEARS_PER_CENTURY = 100
const YEARS_PER_ERA = 400
const DAYS_PER_ERA = 146097
const DAYS_FROM_0000_TO_EPOCH = 719468

export const toEpochDay = (date: CivilDate): number => {
  const { year, month, day } = partsOf(date)
  const y = year - (month <= 2 ? 1 : 0)
  const era = Math.floor(y / YEARS_PER_ERA)
  const yoe = y - era * YEARS_PER_ERA
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / YEARS_PER_CENTURY) + doy
  return era * DAYS_PER_ERA + doe - DAYS_FROM_0000_TO_EPOCH
}

/** Inversa de `toEpochDay` (civil_from_days). */
export const fromEpochDay = (epochDay: number): CivilDate => {
  const z = epochDay + DAYS_FROM_0000_TO_EPOCH
  const era = Math.floor(z / DAYS_PER_ERA)
  const doe = z - era * DAYS_PER_ERA
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  )
  const y = yoe + era * YEARS_PER_ERA
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / YEARS_PER_CENTURY))
  const mp = Math.floor((5 * doy + 2) / 153)
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp + (mp < 10 ? 3 : -9)
  return civilDate(y + (month <= 2 ? 1 : 0), month, day)
}

export const addDays = (date: CivilDate, days: number): CivilDate =>
  fromEpochDay(toEpochDay(date) + days)

/** Días entre dos fechas civiles (b - a). */
export const daysBetween = (a: CivilDate, b: CivilDate): number =>
  toEpochDay(b) - toEpochDay(a)

/** Comparación de fechas civiles. El formato ISO ordena bien como texto. */
export const compareDates = (a: CivilDate, b: CivilDate): number =>
  a === b ? 0 : a < b ? -1 : 1

/** El día de hoy en el huso del usuario. El único punto que mira el reloj. */
export const today = (timeZone: string = USER_TIME_ZONE, now: Date = new Date()): CivilDate => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * La zona horaria que va más adelantada del planeta (UTC+14). Su "hoy" es el
 * último día que ya ha empezado en alguna parte.
 */
export const LATEST_TIME_ZONE = 'Pacific/Kiritimati'

/**
 * El "hoy" más adelantado del planeta: ninguna persona, esté donde esté, vive
 * en un día posterior a este.
 *
 * Es el tope de las fechas de movimiento. Usar el `today()` de Madrid
 * rechazaría el "hoy" real de quien anota desde Auckland, y el servidor no
 * sabe en qué huso está nadie.
 */
export const latestToday = (now: Date = new Date()): CivilDate => today(LATEST_TIME_ZONE, now)

export const periodOf = (date: CivilDate): Period => {
  assertCivilDate(date)
  return date.slice(0, 7)
}

export const currentPeriod = (timeZone: string = USER_TIME_ZONE): Period => periodOf(today(timeZone))

/** Primer y último día del mes, ambos inclusive. Es el rango de toda consulta mensual. */
export const monthRange = (period: Period): { from: CivilDate; to: CivilDate } => {
  assertPeriod(period)
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  return { from: `${period}-01`, to: `${period}-${pad(daysInMonth(year, month), 2)}` }
}

/**
 * Desplaza un periodo n meses. Aritmética entera sobre año/mes: nunca produce el
 * "31 de febrero" que sale de sumar meses a un `Date`.
 */
export const addMonths = (period: Period, n: number): Period => {
  assertPeriod(period)
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const total = year * 12 + (month - 1) + n
  return `${pad(Math.floor(total / 12), 4)}-${pad((total % 12) + 1, 2)}`
}

/** Los n periodos que terminan en `end`, del más antiguo al más reciente. */
export const lastNMonths = (n: number, end: Period = currentPeriod()): Period[] =>
  Array.from({ length: n }, (_, i) => addMonths(end, i - (n - 1)))

/** Todos los días del rango, ambos extremos incluidos. Para rellenar series de saldo. */
export const eachDay = (from: CivilDate, to: CivilDate): CivilDate[] => {
  const start = toEpochDay(from)
  const end = toEpochDay(to)
  if (end < start) return []
  return Array.from({ length: end - start + 1 }, (_, i) => fromEpochDay(start + i))
}
