/**
 * Comprobaciones de cortesía de los formularios de auth: avisan antes del viaje
 * al servidor. Quien valida de verdad es `auth.actions.ts`, con Zod.
 */

const MENSAJE_EMAIL = 'Escribe un email válido'

/**
 * "Algo@algo.algo", sin espacios. Sin expresión regular a propósito: la
 * anterior (`/^\S+@\S+\.\S+$/`) tenía retroceso cuadrático, y esto corre en el
 * navegador con cada tecla.
 */
export function validarEmail(valor: string): string | null {
  const email = valor.trim()
  if (/\s/.test(email)) return MENSAJE_EMAIL

  const arroba = email.lastIndexOf('@')
  const punto = email.lastIndexOf('.')
  const valido = arroba > 0 && punto > arroba + 1 && punto < email.length - 1
  return valido ? null : MENSAJE_EMAIL
}
