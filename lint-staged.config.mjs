/**
 * Lo que se comprueba en cada commit, SOLO sobre los ficheros que entran en él
 * (lo llama `.husky/pre-commit`). Rápido a propósito: el commit no puede
 * tardar lo que tarda la suite; eso lo hace el CI (`.github/workflows/calidad.yml`).
 *
 * `eslint --fix` arregla lo que sabe (orden, comillas…) y lint-staged vuelve a
 * añadir el resultado al commit. Lo que no sabe arreglar, lo bloquea.
 * `--no-warn-ignored`: un fichero que ESLint ignora a propósito (migraciones,
 * `next-env.d.ts`) no es un aviso, es lo esperado.
 *
 * El typecheck no va aquí: tsc con ficheros sueltos ignora el tsconfig. Va
 * entero en el hook.
 */
const config = {
  '*.{ts,tsx,mts,mjs,js}': 'eslint --fix --no-warn-ignored',
}

export default config
