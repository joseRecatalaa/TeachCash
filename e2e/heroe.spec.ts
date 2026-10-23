/**
 * El Camino del héroe de punta a punta, contra el Supabase de pruebas: un
 * invitado nuevo abre el módulo desde el menú lateral, entra en Ahorro, lee
 * la primera lección, aprueba el minitest y vuelve al camino con sus
 * estrellas y el siguiente nivel abierto.
 *
 * Lo que solo se ve aquí: que la tabla `hero_progress` existe en el proyecto
 * de los E2E (la migración), que la corrección del servidor casa con el
 * contenido real y que la invalidación de `['heroe']` refresca el camino al
 * volver sin recargar la página.
 */

import { expect, test } from '@playwright/test'
import { InicioPage } from './pages/InicioPage'

test('un invitado supera la primera lección de Ahorro y se le abre la siguiente', async ({ page }) => {
  await new InicioPage(page).abrir()

  // Por el menú de módulos, como una persona: la pestaña lo abre.
  await page.getByRole('button', { name: /menú de módulos/ }).click()
  await page.getByRole('navigation', { name: 'Módulos' }).getByRole('link', { name: /Camino del héroe/ }).click()
  await expect(page.getByRole('heading', { name: 'Camino del héroe' })).toBeVisible({ timeout: 30_000 })

  await page.getByRole('link', { name: /Ahorro/ }).click()
  const primero = page.getByRole('button', { name: /El fondo de emergencia, disponible/ })
  await expect(primero).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: /Practica: monta tu colchón, bloqueado/ })).toBeVisible()

  await primero.click()
  await page.getByRole('dialog').getByRole('link', { name: /Empezar/ }).click()

  // Las cuatro páginas de la lectura.
  await expect(page.getByRole('heading', { name: 'Lo inesperado siempre llega' })).toBeVisible({ timeout: 30_000 })
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('button', { name: 'Al minitest' }).click()

  // El minitest, todo bien.
  await page.getByRole('radio', { name: 'Para cubrir imprevistos sin endeudarte' }).check()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('radio', { name: '6', exact: true }).check()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('radio', { name: 'Falso' }).check()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await page.getByRole('radio', { name: '100.000 € por titular y entidad' }).check()
  await page.getByRole('button', { name: 'Terminar' }).click()

  await expect(page.getByRole('heading', { name: '¡Nivel superado!' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('4 de 4 aciertos · 3 de 3 estrellas')).toBeVisible()

  // De vuelta en el camino, sin recargar: superado con sus estrellas y el siguiente abierto.
  await page.getByRole('link', { name: /Volver al camino/ }).click()
  await expect(
    page.getByRole('button', { name: 'Lectura: El fondo de emergencia, superado, 3 de 3 estrellas' }),
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: /Practica: monta tu colchón, disponible/ })).toBeVisible()
})
