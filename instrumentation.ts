/**
 * Lo que corre UNA vez al arrancar el servidor, antes de atender peticiones.
 *
 * Hoy, solo validar el entorno (`lib/env.ts`): sin esto, una variable que
 * falta se descubre en la primera petición de alguien, como un error genérico
 * y lejos de su causa. Aquí para el arranque con un mensaje que dice cuál es.
 *
 * Solo en el runtime de Node: es el que tiene la base de datos. El de Edge, si
 * algo lo usara, no necesita `DATABASE_URL`.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { validarEntorno } = await import('./lib/env')
  validarEntorno()
}
