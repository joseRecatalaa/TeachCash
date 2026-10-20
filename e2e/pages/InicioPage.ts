import { expect, type Locator, type Page } from '@playwright/test'
import { esperarTitulo, importe, irPorMenu } from './comun'

/** La portada: el saldo y el resumen del mes. */
export class InicioPage {
  /**
   * La cifra del saldo. `AnimatedMoney` lleva el valor FINAL en `aria-label`
   * (el texto visible puede ir a medio conteo), y solo lo pone cuando ya hay
   * dato: mientras carga, este localizador no casa y las aserciones esperan.
   */
  readonly saldo: Locator

  constructor(private readonly page: Page) {
    this.saldo = page.getByRole('region', { name: 'Patrimonio' }).locator('[aria-label]')
  }

  /** Entrada en frío: la primera visita de un contexto nuevo crea el invitado. */
  async abrir(): Promise<void> {
    await this.page.goto('/')
    await esperarTitulo(this.page, 'Inicio')
  }

  async irPorMenu(): Promise<void> {
    await irPorMenu(this.page, 'Inicio')
    await esperarTitulo(this.page, 'Inicio')
  }

  /** Espera a que el saldo sea exactamente `texto` ("-45,90 €"). */
  async esperarSaldo(texto: string): Promise<void> {
    await expect(this.saldo).toHaveAttribute('aria-label', importe(texto))
  }
}
