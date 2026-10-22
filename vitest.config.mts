import { availableParallelism } from 'node:os'
import { defineConfig } from 'vitest/config'

/**
 * Cuántos ficheros de test a la vez, como mucho.
 *
 * Cada fichero de `node` arranca su propio PGlite (Postgres en WASM) y le
 * aplica las migraciones. Libre, eso son cientos de ms; con quince arrancando a
 * la vez —lo que hace Vitest por defecto en una máquina de 16 núcleos: núcleos
 * menos uno— compiten por CPU y memoria, tardan más de 30 s y revientan el
 * `hookTimeout` de 20 s. Subir el timeout solo aplazaba el fallo: ya se subió
 * una vez de 5 s a 20 s y el siguiente fichero con base lo volvió a romper.
 *
 * Medido en 16 núcleos (2026-10-22): 15 procesos, ~200 s y 10-14 ficheros en
 * timeout; 4 → 87 s, 6 → 69 s, 8 → 60 s, todos en verde. Con menos procesos
 * peleándose, cada uno acaba antes y la suite entera tarda un tercio.
 *
 * `min` con el valor por defecto para no pedir más procesos que núcleos en una
 * máquina pequeña: el runner del CI tiene 4 y sigue con sus 3 de siempre.
 * Global y no por proyecto: por proyecto, Vitest obliga a correr `node` y `dom`
 * uno detrás de otro (`sequence.groupOrder`), y los dos sufren la carga.
 */
const MAX_PROCESOS = Math.min(8, Math.max(availableParallelism() - 1, 1))

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
    maxWorkers: MAX_PROCESOS,
    // Cada test empieza con los dobles limpios: las llamadas de un test no
    // cuentan en el siguiente (clearMocks) y los `vi.spyOn` —p. ej. silenciar
    // console.error— se deshacen solos (restoreMocks).
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      // Lo que se mide: el código de la app. Fuera, lo que no es lógica
      // (tipos, la vista declarada en src/config —la vigilan las guardas de
      // src/__tests__/invariantes.test.ts—, estilos y migraciones generadas) y
      // el propio andamiaje de test.
      // Solo código: con `db/**` a secas entraban los .sql y .json y el
      // informe reventaba al intentar analizarlos.
      include: [
        'lib/**/*.ts',
        'src/**/*.{ts,tsx}',
        'app/**/*.{ts,tsx}',
        'db/**/*.{ts,mts}',
        'proxy.ts',
        'instrumentation.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.css',
        'src/types/**',
        'src/config/**',
        'db/migrations/**',
        'db/testing.ts',
      ],
      /**
       * Umbrales POR NIVELES (lección 10: 100/80/0), por fichero y no en
       * media: una media alta esconde un fichero crítico a medias.
       *
       *  - CORE 100 %: el dinero, las fechas y la seguridad de las rutas. Un
       *    fallo aquí es una cifra mal o un agujero; no hay rama que sobre.
       *  - CORE 90 %: repositorios, acciones y sesión. Lo que queda fuera son
       *    ramas de carreras entre peticiones, marcadas con su porqué.
       *  - IMPORTANT 80 %: GenericForm, AppTable y hooks. Los cubren los
       *    tests de componente (`*.test.tsx`) y, en AppTable, los puros de
       *    `columnas.ts`.
       *  - INFRA 0 %: lo excluido arriba.
       *
       * Un umbral NO se baja para que pase: o se escribe el test, o la rama
       * inalcanzable se marca con `/* v8 ignore next *\/` y su porqué.
       */
      thresholds: {
        ...Object.fromEntries(
          ['lib/money.ts', 'lib/dates.ts', 'lib/format.ts', 'lib/rutas.ts', 'lib/csp.ts'].map(
            (f) => [f, { lines: 100, branches: 100, functions: 100, statements: 100 }],
          ),
        ),
        ...Object.fromEntries(
          [
            'src/infrastructure/repositories/**',
            'src/application/actions/**',
            'lib/auth.ts',
            'lib/env.ts',
            'lib/log.ts',
          ].map((f) => [f, { lines: 90, branches: 90, functions: 90, statements: 90 }]),
        ),
        ...Object.fromEntries(
          [
            'src/presentation/components/Forms/GenericForm/**',
            'src/presentation/components/AppTable/**',
            'src/application/hooks/**',
          ].map((f) => [f, { lines: 80, branches: 80, functions: 80, statements: 80 }]),
        ),
      },
    },
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
          // máquina cargada, el límite por defecto de 5 s se queda corto. Es
          // la red: lo que evita la carga es `MAX_PROCESOS`, no este número.
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
          // `userEvent` teclea carácter a carácter, como una persona. Con la
          // suite entera en paralelo y la cobertura instrumentando, un
          // formulario de tres contraseñas pasaba de los 5 s por defecto.
          testTimeout: 15_000,
        },
      },
    ],
  },
})
