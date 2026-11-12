/**
 * Límite de peticiones por clave (usuario, IP o email), en memoria.
 *
 * Por qué hace falta aunque Supabase ya limite el login: Supabase cuenta por
 * IP, y quien le habla es ESTE servidor, no el navegador. Para Supabase todas
 * las personas vienen de la misma IP, así que su límite ni frena a un atacante
 * concreto ni distingue a nadie. Y las Server Actions de datos no tienen
 * delante ningún límite: sin este, un bucle de `listEntity` con la cookie de un
 * invitado es una consulta a Postgres por iteración (OWASP API4/API6).
 *
 * Ventana FIJA con contador, y no ventana deslizante con marcas de tiempo: es
 * O(1) en memoria por clave. Admite una ráfaga de hasta el doble justo en el
 * cambio de ventana, que para frenar abuso automatizado da igual.
 *
 * Límite conocido, y aceptado: la memoria es la de ESTE proceso. Con varias
 * instancias cada una cuenta lo suyo (el límite real es el máximo por el número
 * de instancias) y un reinicio lo pone a cero. Un límite compartido exige un
 * almacén compartido (Redis, o una tabla con su coste en cada petición); está
 * en "Decisiones abiertas" de AGENTS.md. Lo que este NO hace nunca es dejar
 * pasar más de lo que dice dentro de un mismo proceso.
 */

import { createHash } from 'node:crypto'

export type Regla = {
  /** Separa las cuentas de dos reglas que usen la misma clave. Único por regla. */
  nombre: string
  maximo: number
  ventanaMs: number
}

export type Consumo = { permitido: boolean; reintentarEnMs: number }

/**
 * Cuántas claves vivas como mucho, POR REGLA. Sin tope, quien invente una
 * clave por petición (una IP falsa en `x-forwarded-for`, un email nuevo)
 * llenaría la memoria del servidor: el limitador sería él mismo la denegación
 * de servicio.
 */
export const MAX_CLAVES = 10_000

/**
 * Cuántas se olvidan de golpe al llenarse. De una en una, cada clave nueva con
 * la memoria llena costaría recorrer las 10.000; así se recorren una vez por
 * cada mil.
 */
const LOTE = MAX_CLAVES / 10

type Cubo = { reinicio: number; cuenta: number }

/**
 * Un mapa por regla, y no uno para todas: con uno compartido, inventar IPs
 * contra una regla barata (la de invitados) echaba de la memoria los intentos
 * de contraseña que llevaba otra regla.
 */
const porRegla = new Map<string, Map<string, Cubo>>()

function cubosDe(regla: Regla): Map<string, Cubo> {
  let cubos = porRegla.get(regla.nombre)
  if (!cubos) {
    cubos = new Map()
    porRegla.set(regla.nombre, cubos)
  }
  return cubos
}

/**
 * Hace sitio para una clave nueva. Primero quita las ventanas caducadas. Si no
 * basta, olvida las claves con MENOS cuenta (y de ellas, las que antes
 * caducan), y nunca una bloqueada mientras quede otra.
 *
 * Por qué así y no "la más antigua": olvidar una clave es ponerle la cuenta a
 * cero. Con "la más antigua", quien llenaba la memoria de claves inventadas
 * borraba el bloqueo de una cuenta atacada y volvía a tener sus 10 intentos.
 * Ahora las claves inventadas llevan cuenta 1 y se echan entre ellas.
 */
function hacerSitio(cubos: Map<string, Cubo>, regla: Regla, ahora: number): void {
  for (const [clave, cubo] of cubos) {
    if (cubo.reinicio <= ahora) cubos.delete(clave)
  }
  if (cubos.size < MAX_CLAVES) return

  const libres = [...cubos].filter(([, c]) => c.cuenta < regla.maximo)
  if (libres.length > 0) {
    libres.sort(([, a], [, b]) => a.cuenta - b.cuenta || a.reinicio - b.reinicio)
    for (const [clave] of libres.slice(0, LOTE)) cubos.delete(clave)
    return
  }
  // Todas bloqueadas: hace falta un ejército de IPs para llegar aquí. Se olvida
  // la que antes iba a quedar libre de todos modos, que es la que menos regala.
  let primera: [string, Cubo] | null = null
  for (const entrada of cubos) {
    if (!primera || entrada[1].reinicio < primera[1].reinicio) primera = entrada
  }
  /* v8 ignore next -- con la memoria llena siempre hay una */
  if (primera) cubos.delete(primera[0])
}

/**
 * Cuenta una petición de `clave` contra `regla` y dice si pasa. Una petición
 * denegada no suma: quien insiste no alarga su propio castigo, pero tampoco
 * consigue pasar antes.
 */
export function consumir(regla: Regla, clave: string, ahora = Date.now()): Consumo {
  const cubos = cubosDe(regla)
  let cubo = cubos.get(clave)
  if (!cubo || cubo.reinicio <= ahora) {
    if (!cubo && cubos.size >= MAX_CLAVES) hacerSitio(cubos, regla, ahora)
    cubo = { reinicio: ahora + regla.ventanaMs, cuenta: 0 }
    cubos.set(clave, cubo)
  }
  if (cubo.cuenta >= regla.maximo) {
    return { permitido: false, reintentarEnMs: cubo.reinicio - ahora }
  }
  cubo.cuenta++
  return { permitido: true, reintentarEnMs: 0 }
}

/** Para los tests: cuántas claves guarda ahora una regla. */
export function clavesVivas(regla: Regla): number {
  return porRegla.get(regla.nombre)?.size ?? 0
}

/**
 * Una clave corta y que no guarda el dato: un email o una IP no se quedan en
 * la memoria del proceso tal cual, sino su SHA-256. En minúsculas antes, porque
 * `Pepito@…` y `pepito@…` son la misma cuenta para Supabase.
 */
export function claveSegura(texto: string): string {
  return createHash('sha256').update(texto.toLowerCase()).digest('base64url')
}

/** Para los tests: cada uno empieza con todas las cuentas a cero. */
export function reiniciarLimites(): void {
  porRegla.clear()
}

// ─── Las reglas de la aplicación ─────────────────────────────────────────────
// Holgadas para una persona (nadie hace 300 operaciones en un minuto a mano;
// la portada al cargar hace una docena) y cortas para un script.

/** Cualquier Server Action con sesión, por usuario. */
export const LIMITE_ACCIONES: Regla = { nombre: 'acciones', maximo: 300, ventanaMs: 60_000 }

/**
 * Operaciones de autenticación (entrar, crear cuenta, recuperar, cambiar o
 * borrar), por IP. El CAPTCHA ya pide un token por intento; esto frena a quien
 * los consigue en serie.
 */
export const LIMITE_AUTH_IP: Regla = { nombre: 'auth-ip', maximo: 20, ventanaMs: 10 * 60_000 }

/**
 * Intentos de contraseña contra UNA cuenta, vengan de donde vengan. Es lo que
 * para el credential stuffing repartido entre muchas IP. Que alguien pueda
 * bloquear 15 minutos el login de otro es el precio conocido de esta regla.
 */
export const LIMITE_LOGIN_EMAIL: Regla = { nombre: 'login-email', maximo: 10, ventanaMs: 15 * 60_000 }

/** Invitados nuevos por IP. Cada uno es una fila en `auth.users`. */
export const LIMITE_INVITADO_IP: Regla = { nombre: 'invitado-ip', maximo: 10, ventanaMs: 60 * 60_000 }

/**
 * Peticiones con cookie de sesión que el proxy deja pasar a refrescar, por IP.
 * Una persona navegando no llega (cada página son unas pocas); un script con
 * cookies inventadas, sí. Pasado el límite el proxy no bloquea: solo deja de
 * llamar a Supabase (`lib/supabase/proxy.ts`).
 */
export const LIMITE_REFRESCO_IP: Regla = { nombre: 'refresco-ip', maximo: 120, ventanaMs: 60_000 }
