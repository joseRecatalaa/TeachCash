/**
 * Regresión visual de la portada, en escritorio y en móvil. Opt-in:
 * `pnpm test:e2e:visual` (la primera vez, con `--update-snapshots`).
 *
 * Solo local y nunca en CI: el mismo HTML rasteriza distinto en Windows, macOS y
 * Linux (fuentes, antialiasing), así que las capturas de referencia son de esta
 * máquina. Lo que vigila es el sistema de diseño —trazo, sombras, rejilla,
 * tipografía—, que un cambio en `globals.css` o en `mantine-sketch.module.css`
 * puede romper sin que falle ningún otro test.
 *
 * Se tapa lo que cambia solo con el calendario: el mes en curso, los ejes de los
 * gráficos y la fecha de caducidad del invitado.
 */

import { expect, test } from '@playwright/test'
import { InicioPage } from './pages/InicioPage'

test('Inicio de un invitado recién llegado @visual', async ({ page }) => {
  const inicio = new InicioPage(page)
  await inicio.abrir()
  await inicio.empezarEnCero()
  await inicio.esperarSaldo('0,00 €')

  await expect(page).toHaveScreenshot('inicio.png', {
    fullPage: true,
    // Holgura para el antialiasing entre ejecuciones, no para cambios reales.
    maxDiffPixels: 200,
    mask: [
      page.getByText(/^\p{L}+ de \d{4}$/u),
      page.locator('.recharts-responsive-container'),
      page.getByRole('note'),
    ],
  })
})
