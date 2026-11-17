import { expect, type Locator, type Page } from '@playwright/test'
import { elegirOpcion, esperarTitulo, irPorMenu } from './comun'

export type NuevoMovimiento = {
  categoria: string
  /** Como lo escribe una persona: "45,90". Siempre en positivo. */
  importe: string
  sentido?: 'Gasto' | 'Ingreso'
}

/**
 * Movimientos. Se anota con el modal "Nuevo movimiento" del listado, que es el
 * camino de todos los días: fecha de hoy y la categoría como descripción. Por
 * eso cada fila se reconoce por el nombre de su categoría.
 */
export class MovimientosPage {
  /** Las filas con datos (sin la cabecera). */
  readonly filas: Locator

  constructor(private readonly page: Page) {
    this.filas = page.getByRole('row').filter({ has: page.getByRole('cell') })
  }

  async irPorMenu(): Promise<void> {
    await irPorMenu(this.page, 'Movimientos')
    await esperarTitulo(this.page, 'Movimientos')
  }

  fila(descripcion: string): Locator {
    return this.filas.filter({ hasText: descripcion })
  }

  async anotar({ categoria, importe, sentido = 'Gasto' }: NuevoMovimiento): Promise<void> {
    const { page } = this
    await this.irPorMenu()
    await page.getByRole('button', { name: 'Nuevo movimiento' }).click()

    // El título del modal lleva además la fecha de hoy.
    const modal = page.getByRole('dialog', { name: /Nuevo Movimiento/ })
    if (sentido !== 'Gasto') await elegirOpcion(page, modal.getByRole('combobox', { name: 'Sentido' }), sentido)
    await elegirOpcion(page, modal.getByRole('combobox', { name: 'Categoría' }), categoria)
    await modal.getByRole('textbox', { name: 'Importe' }).fill(importe)
    await modal.getByRole('button', { name: 'Guardar' }).click()

    await expect(modal).toBeHidden()
    await expect(this.fila(categoria)).toBeVisible()
  }

  /** Borra la fila con esa descripción, confirmando el diálogo. */
  async borrar(descripcion: string): Promise<void> {
    const { page } = this
    await this.fila(descripcion).getByRole('button', { name: `Eliminar ${descripcion}` }).click()
    await page
      .getByRole('dialog', { name: 'Confirmar borrado' })
      .getByRole('button', { name: 'Eliminar' })
      .click()
    await expect(this.fila(descripcion)).toHaveCount(0)
  }

  /** Filtro de la columna Categoría. En modo servidor solo hay "es igual a". */
  async filtrarPorCategoria(nombre: string): Promise<void> {
    const { page } = this
    await page.getByRole('button', { name: 'Filtrar por Categoría' }).click()
    await elegirOpcion(page, page.getByRole('combobox', { name: 'Valor' }), nombre)
  }
}
