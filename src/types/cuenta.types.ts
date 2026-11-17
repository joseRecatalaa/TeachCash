/**
 * Qué sabe la interfaz de quién está usando la aplicación.
 *
 * Es lo único de la sesión que cruza al cliente, y no lleva el id del usuario:
 * la interfaz no lo necesita para nada, y lo que no viaja no se puede filtrar.
 */
export type CuentaDto =
  /** Aún no hay sesión: la aplicación está creando la de invitado. */
  | { tipo: 'ninguna' }
  /** Invitado. `caducaEl` es un instante ISO: cuándo se borran sus datos. */
  | { tipo: 'invitado'; caducaEl: string }
  | { tipo: 'usuario'; email: string }

/**
 * Cuánto vive un invitado desde que se crea, use la aplicación o no.
 *
 * Lo aplica el job de pg_cron de `db/sql/limpieza-invitados.sql`; este valor
 * solo sirve para avisar al invitado. Si cambias uno, cambia el otro.
 */
export const VIDA_INVITADO_DIAS = 4
