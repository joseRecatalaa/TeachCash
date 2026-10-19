/**
 * Lo que comparten los Page Objects. Se busca como lo busca una persona (rol y
 * nombre accesible), igual que en los tests de componente: si un selector de
 * aquí deja de casar, casi siempre es que la interfaz ha perdido un nombre
 * accesible, y eso también es un bug.
 */

import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Navega por el MENÚ, no con `page.goto`. No es comodidad: `goto` recarga la
 * página y tira la caché de React Query, y con ella desaparecería justo lo que
 * hay que probar — que cada mutación invalida el saldo y los gráficos
 * (`['informes']`). Sin invalidación, una navegación interna enseña la cifra
 * vieja; una recarga, no.
 */
export async function irPorMenu(page: Page, enlace: string): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: enlace, exact: true })
    .click()
}

/** Un `Select` de Mantine: el campo es un `combobox` y sus opciones van en un portal. */
export async function elegirOpcion(page: Page, campo: Locator, opcion: string): Promise<void> {
  await campo.click()
  await page.getByRole('option', { name: opcion, exact: true }).click()
}

/**
 * Un importe tal y como lo pinta `formatMoney` en es-ES ("-45,90 €"). Entre la
 * cifra y el símbolo va un espacio DURO, y por eso se compara con `\s`.
 */
export function importe(texto: string): RegExp {
  const escapado = texto.replaceAll(/[.*+?^${}()|[\]\\-]/g, String.raw`\$&`).replace(' ', String.raw`\s`)
  return new RegExp(`^${escapado}$`)
}

/** La aplicación ha terminado de crear el invitado y pinta la página pedida. */
export async function esperarTitulo(page: Page, titulo: string): Promise<void> {
  // La primera visita pasa por Turnstile y por Supabase Auth: tarda más que
  // una aserción normal.
  await expect(page.getByRole('heading', { level: 1, name: titulo, exact: true })).toBeVisible({ timeout: 30_000 })
}
