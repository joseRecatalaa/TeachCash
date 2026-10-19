import { defineConfig, devices } from '@playwright/test'
import { cargarEntornoE2e } from './e2e/entorno'

/**
 * E2E con Playwright: la aplicación entera, de verdad, contra el proyecto de
 * Supabase `teachcash-e2e` (nunca el de desarrollo: ver `e2e/entorno.ts`).
 *
 * Solo en local (`pnpm test:e2e`): no corre en CI, que ahorra minutos y no
 * obliga a guardar en GitHub las claves de un segundo proyecto. Cómo montarlo
 * y por qué, en `.env.e2e.example` y en docs/TESTS.md.
 *
 * Cada test abre un contexto de navegador nuevo, es decir, sin cookies: la app
 * le crea un INVITADO nuevo. Ese es todo el aislamiento entre tests, y basta:
 * cada invitado solo ve lo suyo (regla dura 4) y el job de pg_cron borra a los
 * caducados. No hay que limpiar la base ni entre tests ni después.
 */

cargarEntornoE2e()

/**
 * Otro puerto que el de `pnpm dev` (3000). Con `reuseExistingServer` apagado
 * no se reutilizaría nada de todos modos, pero así un dev server abierto no
 * hace que el arranque falle por puerto ocupado.
 */
const PUERTO = 3100
const BASE_URL = `http://localhost:${PUERTO}`

/** Los visuales son opt-in (`pnpm test:e2e:visual`): las capturas dependen del SO. */
const VISUAL = !!process.env.E2E_VISUAL

export default defineConfig({
  testDir: './e2e',
  // `.spec.ts` y no `.test.ts`: así Vitest, que recoge `*.test.ts`, no los ve.
  testMatch: '**/*.spec.ts',
  // Los tests no comparten nada (cada uno su invitado), así que van en
  // paralelo. Pocos workers: cada invitado nuevo es una llamada a Supabase Auth,
  // que limita los registros anónimos por IP y hora.
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  reporter: [['html', { open: 'never' }], ['list']],
  // La primera carga incluye crear el invitado (Turnstile + Supabase Auth).
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    // Sin animaciones: `AnimatedMoney` enseña la cifra final al momento en vez
    // de contar hasta ella, y las capturas no salen a medio gesto.
    reducedMotion: 'reduce',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: VISUAL
    ? [
        { name: 'visual-escritorio', grep: /@visual/, use: { ...devices['Desktop Chrome'] } },
        { name: 'visual-movil', grep: /@visual/, use: { ...devices['Pixel 7'] } },
      ]
    : [{ name: 'chromium', grepInvert: /@visual/, use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // El build de PRODUCCIÓN y no `next dev`: es lo que se despliega, con su
    // CSP y sus cookies `secure`, y no compila cada página en la primera visita.
    // Las `NEXT_PUBLIC_*` se incrustan al compilar, así que el build tiene que
    // hacerse con `.env.e2e` cargado, y por eso se rehace siempre.
    command: `pnpm build && pnpm exec next start --port ${PUERTO}`,
    url: BASE_URL,
    // Nunca reutilizar un servidor ya levantado: podría haberse compilado con
    // `.env.local` y los tests escribirían en el proyecto de desarrollo.
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
