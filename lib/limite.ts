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
  /** Separa las cuentas de dos reglas que usen la misma clave. */
  nombre: string
  maximo: number
  ventanaMs: number
}

export type Consumo = { permitido: boolean; reintentarEnMs: number }

/**
 * Cuántas claves vivas como mucho. Sin tope, quien invente una clave por
 * petición (una IP falsa en `x-forwarded-for`, un email nuevo) llenaría la
 * memoria del servidor: el limitador sería él mismo la denegación de servicio.
 */
export const MAX_CLAVES = 10_000

type Cubo = { reinicio: number; cuenta: number }

const cubos = new Map<string, Cubo>()

/** Quita las ventanas caducadas y, si aún no hay sitio, las más antiguas. */
function hacerSitio(ahora: number): void {
  for (const [clave, cubo] of cubos) {
    if (cubo.reinicio <= ahora) cubos.delete(clave)
  }
  // Un `Map` recorre en orden de inserción: la primera es la más antigua.
  for (const clave of cubos.keys()) {
    if (cubos.size < MAX_CLAVES) break
    cubos.delete(clave)
  }
}

/**
 * Cuenta una petición de `clave` contra `regla` y dice si pasa. Una petición
 * denegada no suma: quien insiste no alarga su propio castigo, pero tampoco
 * consigue pasar antes.
 */
export function consumir(regla: Regla, clave: string, ahora = Date.now()): Consumo {
  const id = `${regla.nombre}:${clave}`
  let cubo = cubos.get(id)
  if (!cubo || cubo.reinicio <= ahora) {
    if (!cubo && cubos.size >= MAX_CLAVES) hacerSitio(ahora)
    cubo = { reinicio: ahora + regla.ventanaMs, cuenta: 0 }
    cubos.set(id, cubo)
  }
  if (cubo.cuenta >= regla.maximo) {
    return { permitido: false, reintentarEnMs: cubo.reinicio - ahora }
  }
  cubo.cuenta++
  return { permitido: true, reintentarEnMs: 0 }
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
  cubos.clear()
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
