import { expect, type Page } from '@playwright/test'
import { elegirOpcion, esperarTitulo, irPorMenu } from './comun'

export type NuevaCategoria = {
  nombre: string
  tipo?: 'Gasto' | 'Ingreso'
  /** Obligatorio en las de gasto, como texto ("300" o "300,00"). */
  presupuesto?: string
  /** Por su nombre en el selector ("Lila"). */
  color?: string
}

/**
 * Categorías. Un invitado recién creado no tiene ninguna VISIBLE (las
 * predefinidas nacen ocultas), así que todo flujo que anote un movimiento
 * empieza aquí.
 */
export class CategoriasPage {
  constructor(private readonly page: Page) {}

  async irPorMenu(): Promise<void> {
    await irPorMenu(this.page, 'Categorías')
    await esperarTitulo(this.page, 'Categorías')
  }

  /** Crea una categoría personalizada y vuelve al listado. */
  async crear({ nombre, tipo = 'Gasto', presupuesto, color }: NuevaCategoria): Promise<void> {
    const { page } = this
    await this.irPorMenu()
    await page.getByRole('link', { name: 'Nueva categoría' }).click()
    // El SegmentedControl son radios ocultos: se pulsa su etiqueta.
    await page.getByText('Crear una nueva', { exact: true }).click()

    await page.getByRole('textbox', { name: 'Nombre' }).fill(nombre)
    if (tipo !== 'Gasto') await elegirOpcion(page, page.getByRole('combobox', { name: 'Tipo' }), tipo)
    if (presupuesto) await page.getByRole('textbox', { name: 'Presupuesto mensual' }).fill(presupuesto)
    if (color) {
      await page
        .getByRole('radiogroup', { name: 'Color de la categoría' })
        .getByRole('radio', { name: color })
        .click()
    }
    await page.getByRole('button', { name: 'Guardar' }).click()

    await esperarTitulo(page, 'Categorías')
    await expect(page.getByRole('row').filter({ hasText: nombre })).toBeVisible()
  }
}
