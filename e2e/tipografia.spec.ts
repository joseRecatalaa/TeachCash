/**
 * Las tres tipografías llegan de verdad a la página.
 *
 * Solo lo puede ver un navegador: jsdom no resuelve CSS. Y falla en silencio:
 * con las clases de `next/font` en `<body>`, `--sd-font-*` (declaradas en
 * `:root`) resolvían `var(--font-body)` en `<html>`, donde aún no existe; la
 * declaración quedaba inválida y TODA la app se pintaba en Times New Roman sin
 * un solo error. Geist Mono no es estética: los importes en columna necesitan
 * cifras de ancho fijo para poder compararse.
 */

import { expect, test } from '@playwright/test'
import { InicioPage } from './pages/InicioPage'

test('texto en Nunito, titulares en Fredoka y dinero en Geist Mono', async ({ page }) => {
  const inicio = new InicioPage(page)
  await inicio.abrir()
  // Sin contestar la pregunta del patrimonio no hay cifra que medir.
  await inicio.empezarEnCero()

  await expect(page.locator('body')).toHaveCSS('font-family', /Nunito/)
  await expect(page.getByRole('heading', { level: 1, name: 'Inicio' })).toHaveCSS('font-family', /Fredoka/)
  await expect(inicio.saldo).toHaveCSS('font-family', /Geist Mono/)
})
