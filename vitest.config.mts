import { defineConfig } from 'vitest/config'

/**
 * Dos proyectos, porque hay dos clases de test y cada una necesita su entorno:
 *
 *  - `node`: dominio, repositorios y acciones (`*.test.ts`). Postgres real en
 *    PGlite. `forks` y no hilos: PGlite en varios `threads` se ha colgado.
 *  - `dom`: componentes (`*.test.tsx`) con Testing Library sobre jsdom.
 *
 * Detalle y convenciones en docs/TESTS.md.
 */
export default defineConfig({
  resolve: {
    // Resuelve el alias '@/' del tsconfig: los tests importan igual que la app.
    tsconfigPaths: true,
  },
  test: {
    // Cada test empieza con los dobles limpios: las llamadas de un test no
    // cuentan en el siguiente (clearMocks) y los `vi.spyOn` —p. ej. silenciar
    // console.error— se deshacen solos (restoreMocks).
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./test/setup/fast-check.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['**/*.test.ts'],
          exclude: ['node_modules/**', '.next/**', 'e2e/**'],
          pool: 'forks',
          // Arrancar PGlite y copiar su plantilla lleva cientos de ms; con la
          // máquina cargada, el límite por defecto de 5 s se queda corto.
          testTimeout: 20_000,
          hookTimeout: 20_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['**/*.test.tsx'],
          exclude: ['node_modules/**', '.next/**', 'e2e/**'],
          setupFiles: ['./test/setup/dom.ts'],
        },
      },
    ],
  },
})
