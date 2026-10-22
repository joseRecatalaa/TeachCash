import { expect, type Locator, type Page } from '@playwright/test'
import { esperarTitulo, importe, irPorMenu } from './comun'

/** La portada: el patrimonio y el resumen del mes. */
export class InicioPage {
  /** La tarjeta de Patrimonio: la cifra, o la pregunta mientras no se ha elegido. */
  readonly tarjeta: Locator

  /**
   * La cifra del patrimonio. `AnimatedMoney` lleva el valor FINAL en
   * `aria-label` (el texto visible puede ir a medio conteo), y solo lo pone
   * cuando ya hay dato: mientras carga, este localizador no casa y las
   * aserciones esperan.
   *
   * `span[aria-label]` y no `[aria-label]` a secas: el lápiz de "Cambiar el
   * patrimonio" es un botón con `aria-label` dentro de la misma tarjeta, y con
   * los dos casando Playwright falla por localizador ambiguo.
   */
  readonly saldo: Locator

  /** La pregunta que sale mientras no se ha elegido el patrimonio inicial. */
  readonly pregunta: Locator

  /** El campo de la pregunta "¿Con cuánto empiezas?". */
  readonly campoPatrimonio: Locator

  constructor(private readonly page: Page) {
    this.tarjeta = page.getByRole('region', { name: 'Patrimonio' })
    this.saldo = this.tarjeta.locator('span[aria-label]')
    this.pregunta = this.tarjeta.getByText('¿Con cuánto empiezas?')
    // Por rol y dentro de la tarjeta: `getByLabel('Patrimonio')` casaría
    // también con la propia región, que se llama igual.
    this.campoPatrimonio = this.tarjeta.getByRole('textbox', { name: 'Patrimonio' })
  }

  /** Entrada en frío: la primera visita de un contexto nuevo crea el invitado. */
  async abrir(): Promise<void> {
    await this.page.goto('/')
    await esperarTitulo(this.page, 'Inicio')
  }

  /**
   * Contesta la pregunta del patrimonio inicial con "Empezar en 0 €". Un
   * invitado nuevo la ve en lugar de la cifra: sin contestarla, `saldo` no
   * existe.
   */
  async empezarEnCero(): Promise<void> {
    await this.tarjeta.getByRole('button', { name: 'Empezar en 0 €' }).click()
  }

  /** Escribe un patrimonio inicial ("1.250,50") y lo guarda. */
  async elegirPatrimonio(texto: string): Promise<void> {
    await this.campoPatrimonio.fill(texto)
    await this.tarjeta.getByRole('button', { name: 'Guardar' }).click()
  }

  /**
   * Espera a que salga la pregunta. Con 30 s, como `esperarTitulo`: en la
   * primera visita, las consultas de la portada llegan detrás de la creación
   * del invitado y Next ejecuta las Server Actions de una en una, cada una con
   * su viaje a Supabase. Con los 10 s de una aserción normal el test fallaba a
   * veces, con todas las tarjetas aún en "—".
   */
  async esperarPregunta(): Promise<void> {
    await expect(this.pregunta).toBeVisible({ timeout: 30_000 })
  }

  /** Cambia el patrimonio inicial desde el lápiz de la tarjeta. */
  async cambiarPatrimonio(texto: string): Promise<void> {
    await this.tarjeta.getByRole('button', { name: 'Cambiar el patrimonio' }).click()
    await this.elegirPatrimonio(texto)
  }

  async irPorMenu(): Promise<void> {
    await irPorMenu(this.page, 'Inicio')
    await esperarTitulo(this.page, 'Inicio')
  }

  /** Espera a que el patrimonio sea exactamente `texto` ("-45,90 €"). */
  async esperarSaldo(texto: string): Promise<void> {
    await expect(this.saldo).toHaveAttribute('aria-label', importe(texto))
  }
}
