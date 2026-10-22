/**
 * El patrimonio inicial: se pregunta a quien llega, se guarda en la base y la
 * cifra de la portada parte de él.
 *
 * Solo un E2E prueba el camino entero: que un invitado recién creado no tiene
 * fila en `profiles` (y por eso ve la pregunta), que guardar escribe de verdad
 * en Supabase y que, al recargar —caché de React Query vacía—, la pregunta no
 * vuelve. Los tests de componente y de repositorio prueban cada pieza por
 * separado; esto prueba que encajan.
 */

import { expect, test } from '@playwright/test'
import { InicioPage } from './pages/InicioPage'

test('un invitado elige su patrimonio, lo cambia y sigue ahí al recargar', async ({ page }) => {
  const inicio = new InicioPage(page)
  await inicio.abrir()

  // Invitado nuevo: la pregunta ocupa el sitio de la cifra.
  await inicio.esperarPregunta()
  await expect(inicio.saldo).toHaveCount(0)

  // Cinco cifras a propósito: con cuatro, es-ES no pone separador de miles
  // ("1250,50 €") y el test no probaría que el campo acepta el punto.
  await inicio.elegirPatrimonio('12.500,50')
  await inicio.esperarSaldo('12.500,50 €')

  await inicio.cambiarPatrimonio('20000')
  await inicio.esperarSaldo('20.000,00 €')

  // Una recarga tira la caché: lo que se ve ahora sale de la base.
  await page.reload()
  await inicio.esperarSaldo('20.000,00 €')
  await expect(inicio.pregunta).toHaveCount(0)
})
