/**
 * La portada pública y la frontera con la aplicación, contra el Supabase de
 * pruebas.
 *
 * Lo que solo se ve aquí: que `/` sin sesión es la portada (HTML del servidor,
 * sin crear invitado), que "Jugar gratis" recarga y entra en la
 * aplicación con su invitado, y que después `/` ya es el Cuadro de mando. Si un
 * enlace de la portada fuera un `<Link>`, la aplicación se pintaría sin sesión
 * ni proveedores (`EnlaceCompleto`).
 */

import { expect, test } from '@playwright/test'

test('sin sesión, /, se ve la portada; al jugar nace el invitado y / pasa a ser su Cuadro', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Educación financiera al alcance de cualquiera' })).toBeVisible()
  // La portada no crea invitado: no está la aplicación ni su pantalla de espera.
  await expect(page.getByText('Preparando tu espacio…')).toHaveCount(0)

  // `exact`: la cabecera tiene otro "Jugar gratis"; el de la portada lleva el ▶ oculto.
  await page.locator('main').getByRole('link', { name: 'Jugar gratis', exact: true }).first().click()
  await expect(page).toHaveURL(/\/CaminoHeroe$/)
  await expect(page.getByRole('heading', { name: 'Camino del héroe' })).toBeVisible({ timeout: 30_000 })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Cuadro de mando' })).toBeAttached({ timeout: 30_000 })
  await expect(page.getByText('Nadie nos enseñó a manejar el dinero')).toHaveCount(0)
})

test('los cursos son públicos e indexables, y un mundo que no existe es un 404', async ({ page }) => {
  await page.goto('/aprende/ahorro')
  await expect(page.getByRole('heading', { level: 1, name: 'Curso para aprender a ahorrar' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow')

  const respuesta = await page.goto('/aprende/no-existe')
  expect(respuesta?.status()).toBe(404)
})
