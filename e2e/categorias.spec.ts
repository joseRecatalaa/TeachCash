/**
 * Una categoría nueva sirve para clasificar y para filtrar: el camino entero,
 * del formulario de categoría al filtro del listado, que en Movimientos lo
 * resuelve el REPOSITORIO (modo servidor) y no la tabla.
 */

import { expect, test } from '@playwright/test'
import { importe } from './pages/comun'
import { CategoriasPage } from './pages/CategoriasPage'
import { InicioPage } from './pages/InicioPage'
import { MovimientosPage } from './pages/MovimientosPage'

test('un movimiento en una categoría nueva aparece al filtrar por ella', async ({ page }) => {
  await new InicioPage(page).abrir()
  const categorias = new CategoriasPage(page)
  const movimientos = new MovimientosPage(page)
  // Dos categorías y un movimiento en cada una: con una sola, un filtro que no
  // filtrara nada pasaría igual.
  await categorias.crear({ nombre: 'Veterinario', presupuesto: '50', color: 'Lila' })
  await categorias.crear({ nombre: 'Libros', presupuesto: '20' })
  await movimientos.anotar({ categoria: 'Veterinario', importe: '12' })
  await movimientos.anotar({ categoria: 'Libros', importe: '30' })
  await expect(movimientos.filas).toHaveCount(2)

  await movimientos.filtrarPorCategoria('Veterinario')

  await expect(movimientos.filas).toHaveCount(1)
  const fila = movimientos.fila('Veterinario')
  await expect(fila.getByRole('cell').filter({ hasText: importe('-12,00 €') })).toHaveCount(1)
  // El color elegido viaja como clave hasta la insignia de la fila ("Lila" es
  // `cat-3` en lib/colores.ts), no como un valor pintado a mano.
  await expect(fila.locator('[data-tono]')).toHaveAttribute('data-tono', 'cat-3')
})
