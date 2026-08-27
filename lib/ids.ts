/**
 * Identificadores únicos, también fuera de un contexto seguro.
 *
 * ─── Por qué existe este fichero ────────────────────────────────────────────
 *
 * `crypto.randomUUID()` **solo está disponible en un contexto seguro**: HTTPS o
 * `localhost`. En el navegador, abriendo la aplicación por la IP de la red local
 * —que es justo lo que este proyecto soporta a propósito, ver `allowedDevOrigins`
 * en `next.config.ts`— la función sencillamente NO EXISTE, y la llamada revienta
 * con "crypto.randomUUID is not a function".
 *
 * Es un fallo que no aparece nunca en desarrollo desde `localhost` ni en los
 * tests (Node no tiene esa restricción), así que se descubre en el móvil, con el
 * formulario a medio rellenar.
 *
 * `crypto.getRandomValues()`, en cambio, SÍ está en contextos inseguros. La
 * única pieza restringida es `randomUUID` (y `crypto.subtle`), así que el
 * respaldo sigue siendo aleatoriedad criptográfica de verdad, no un
 * `Math.random()` disfrazado. Eso importa aquí: este id es la clave de
 * idempotencia que impide que un doble clic cree dos movimientos iguales, y una
 * colisión sería un movimiento que se pierde en silencio.
 *
 * El SERVIDOR no necesita esto: los repositorios llaman a `crypto.randomUUID()`
 * directamente porque en Node no hay contextos inseguros.
 */

/** UUID v4 en el formato canónico 8-4-4-4-12. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // Los dos marcadores que convierten 16 bytes al azar en un UUID *versión 4*:
  // el nibble alto del byte 6 es la versión (4) y los dos bits altos del byte 8
  // son la variante (10xx). Sin ellos es una cadena aleatoria con formato de
  // UUID, que vale igual como clave pero deja de ser un UUID.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}
