import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import vitest from "@vitest/eslint-plugin";

/**
 * Las capas de la arquitectura, impuestas por el linter (AGENTS.md →
 * "Arquitectura"). Hasta ahora eran una convención; una convención se rompe en
 * el primer import que el editor autocompleta.
 */
const SIN_INFRAESTRUCTURA = {
  group: ["@/src/infrastructure", "@/src/infrastructure/**", "**/infrastructure/**"],
  message:
    "config/ y presentation/ no importan de src/infrastructure: lo que compartan sube a src/types. Los repositorios importan @/db y no pueden acabar en el navegador.",
};

const SIN_DB = {
  group: ["@/db", "@/db/**"],
  message:
    "Solo los repositorios (src/infrastructure/repositories) importan @/db: es lo que impide que la conexión acabe en un componente cliente.",
};

const SIN_SRC = {
  group: ["@/src/**", "**/src/**"],
  message: "lib/ y db/ no importan de src/: las dependencias van de src/ hacia lib/ y db/, nunca al revés.",
};

const restringir = (...patterns) => ["error", { patterns }];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  sonarjs.configs.recommended,

  // ── Reglas de todo el código ───────────────────────────────────────────────
  {
    rules: {
      // Más de 15 es una función que ya no se puede leer de una vez.
      "sonarjs/cognitive-complexity": ["error", 15],
      // Los errores del servidor pasan por lib/log.ts (que usa console.error);
      // un console.log olvidado acaba en los logs de producción con datos dentro.
      "no-console": ["error", { allow: ["error", "warn"] }],
      // Las tareas pendientes se cuentan como deuda (lección 8): aviso, no
      // error. `sonarjs/todo-tag` no sirve aquí: no distingue mayúsculas y en
      // castellano marca "Todo movimiento tiene categoría". Esta solo mira la
      // marca al principio del comentario.
      "sonarjs/todo-tag": "off",
      "no-warning-comments": ["warn", { terms: ["todo", "fixme"], location: "start" }],
      // `type CivilDate = string` no es redundante: documenta QUÉ cadena es
      // (regla dura 5), y es lo que lee quien abre la firma de una función.
      "sonarjs/redundant-type-aliases": "off",
    },
  },

  // ── Capas ──────────────────────────────────────────────────────────────────
  // Una regla por grupo de ficheros: en ESLint plano, un segundo
  // `no-restricted-imports` para el mismo fichero SUSTITUYE al primero.
  {
    files: ["src/config/**", "src/presentation/**"],
    rules: { "no-restricted-imports": restringir(SIN_INFRAESTRUCTURA, SIN_DB) },
  },
  {
    files: ["src/application/**", "src/types/**", "app/**", "proxy.ts", "instrumentation.ts"],
    ignores: ["**/__tests__/**"],
    rules: { "no-restricted-imports": restringir(SIN_DB) },
  },
  {
    files: ["lib/**", "db/**"],
    ignores: ["**/__tests__/**"],
    rules: { "no-restricted-imports": restringir(SIN_SRC) },
  },

  // ── Scripts de línea de comandos: hablan por consola, es su trabajo ────────
  {
    files: ["db/migrate.mts", "plopfile.mjs", "**/*.mjs"],
    rules: { "no-console": "off" },
  },

  // ── Tests ──────────────────────────────────────────────────────────────────
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "test/**"],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      // Un `.only` olvidado deja la suite en verde ejecutando UN test.
      "vitest/no-focused-tests": "error",
      "vitest/no-disabled-tests": "error",
      // Un test sin aserción pasa siempre. Los ayudantes `esperar*` aseguran
      // por dentro, y `fc.assert` es la aserción de una propiedad.
      "vitest/expect-expect": [
        "error",
        { assertFunctionNames: ["expect", "expect.*", "esperar*", "fc.assert"] },
      ],
      // Duplica a `vitest/expect-expect` y no conoce los ayudantes `esperar*`.
      "sonarjs/assertions-in-tests": "off",
      // Los tests leen fixtures y montan datos con bucles y literales que
      // sonarjs marcaría como código de producción.
      "sonarjs/no-hardcoded-passwords": "off",
      "sonarjs/no-nested-functions": "off",
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/pseudo-random": "off",
    },
  },

  globalIgnores([
    // Ignorados por defecto de eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generado por drizzle-kit, y el informe de coverage.
    "db/migrations/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
