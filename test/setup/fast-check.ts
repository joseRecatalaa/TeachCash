/**
 * Semilla de fast-check reproducible.
 *
 * Una propiedad que falla imprime su semilla. Para repetir EXACTAMENTE esa
 * ejecución —en local o en CI— se lanza con `FC_SEED=<semilla> pnpm test`.
 * Sin la variable, cada ejecución explora casos nuevos, que es lo que se quiere.
 */

import fc from 'fast-check'

const semilla = process.env.FC_SEED

if (semilla) fc.configureGlobal({ seed: Number(semilla) })
