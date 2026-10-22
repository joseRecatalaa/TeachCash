/**
 * El saldo de la portada sigue a los movimientos, sin recargar.
 *
 * Es el fallo más caro de esta aplicación, porque no parece un fallo: si una
 * mutación no invalida `['informes']`, la portada enseña la cifra de antes y
 * nadie sospecha de ella. Por eso se navega siempre por el menú (ver
 * `irPorMenu`): una recarga lo taparía.
 */

import { expect, test } from '@playwright/test'
import { importe } from './pages/comun'
import { CategoriasPage } from './pages/CategoriasPage'
import { InicioPage } from './pages/InicioPage'
import { MovimientosPage } from './pages/MovimientosPage'

const CATEGORIA = 'Supermercado'

test.beforeEach(async ({ page }) => {
  // Invitado nuevo (contexto nuevo): sin movimientos y empezando en cero, así
  // que el saldo es la suma de lo que anote cada test y nada más.
  const inicio = new InicioPage(page)
  await inicio.abrir()
  await inicio.empezarEnCero()
  await inicio.esperarSaldo('0,00 €')
  await new CategoriasPage(page).crear({ nombre: CATEGORIA, presupuesto: '300' })
})

test('anotar un gasto cambia el saldo de la portada', async ({ page }) => {
  const inicio = new InicioPage(page)

  await new MovimientosPage(page).anotar({ categoria: CATEGORIA, importe: '45,90' })
  await inicio.irPorMenu()

  await expect(inicio.saldo).toHaveAttribute('aria-label', importe('-45,90 €'))
})

test('borrar el gasto devuelve el saldo a donde estaba', async ({ page }) => {
  const inicio = new InicioPage(page)
  const movimientos = new MovimientosPage(page)
  await movimientos.anotar({ categoria: CATEGORIA, importe: '45,90' })
  await inicio.irPorMenu()
  await inicio.esperarSaldo('-45,90 €')

  await movimientos.irPorMenu()
  await movimientos.borrar(CATEGORIA)
  await inicio.irPorMenu()

  await expect(inicio.saldo).toHaveAttribute('aria-label', importe('0,00 €'))
})
