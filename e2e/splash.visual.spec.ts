/**
 * Regresión visual de la pantalla de carga. Opt-in, como `visual.spec.ts`:
 * `pnpm test:e2e:visual`.
 *
 * Vigila que el héroe se siga pintando igual: sus sprites y su paleta los
 * comparten el splash y el Camino del héroe (`components/Pixel/`), y un
 * retoque pensado para el camino puede cambiar el splash sin que falle nada
 * más.
 *
 * El reloj va CONGELADO y el movimiento, reducido (lo pone la configuración):
 * así la escena queda en la pose final, la barra en 0 % y los temporizadores
 * que la retiran no llegan a disparar nunca.
 */

import { expect, test } from '@playwright/test'

test('pantalla de carga con el héroe @visual', async ({ page }) => {
  const inicio = new Date('2026-01-01T10:00:00')
  await page.clock.install({ time: inicio })
  await page.clock.pauseAt(new Date(inicio.getTime() + 1000))

  await page.goto('/')
  const barra = page.getByRole('progressbar', { name: 'Cargando la aplicación' })
  await expect(barra).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  await expect(page).toHaveScreenshot('splash.png', { maxDiffPixels: 200 })
})
