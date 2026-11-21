/**
 * Exporta la presentación (`/presentacion`) a ficheros para la entrega:
 *
 *   - `docs/presentacion/TeachCash-presentacion.pdf`: una página por pantalla,
 *     a 1920x1080 y con el texto como texto (se puede buscar y copiar).
 *   - `docs/presentacion/diapositivas/NN.png`: cada pantalla como imagen, que
 *     es de lo que tira `scripts/presentacion-pptx.py` para el PowerPoint.
 *   - `docs/presentacion/notas.json`: lo que se dice en cada una.
 *
 * Necesita la aplicación en marcha (por defecto en http://localhost:3100) y lee
 * `?imprimir`, que pinta todas las pantallas seguidas. Se emula el movimiento
 * reducido: cada escena se queda en su pose entera, sin fotogramas a medias.
 *
 *   node scripts/exportar-presentacion.mts [url-base]
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:3100'
const SALIDA = join(import.meta.dirname, '..', 'docs', 'presentacion')
const IMAGENES = join(SALIDA, 'diapositivas')

await mkdir(IMAGENES, { recursive: true })

const navegador = await chromium.launch()
const contexto = await navegador.newContext({
  viewport: { width: 1920, height: 1080 },
  reducedMotion: 'reduce',
  // El filtro de bots de la app rechaza "HeadlessChrome" (`auth.actions.ts`).
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
})
const pagina = await contexto.newPage()
// `load` y no `networkidle`: una conexión que se queda abierta (la recarga en
// caliente del desarrollo, por ejemplo) dejaría el script esperando para siempre.
await pagina.goto(`${BASE}/presentacion?imprimir`, { waitUntil: 'load', timeout: 120_000 })
await pagina.locator('[data-diapositiva]').first().waitFor()
await pagina.evaluate(() => document.fonts.ready)

const diapositivas = pagina.locator('[data-diapositiva]')
const total = await diapositivas.count()
const notas: { numero: number; nombre: string; notas: string }[] = []

for (let i = 0; i < total; i++) {
  const d = diapositivas.nth(i)
  const numero = i + 1
  await d.screenshot({ path: join(IMAGENES, `${String(numero).padStart(2, '0')}.png`) })
  notas.push({
    numero,
    nombre: (await d.getAttribute('aria-label')) ?? '',
    notas: (await d.getAttribute('data-notas')) ?? '',
  })
}

await writeFile(join(SALIDA, 'notas.json'), `${JSON.stringify(notas, null, 2)}\n`)
await pagina.emulateMedia({ media: 'print' })
await pagina.pdf({
  path: join(SALIDA, 'TeachCash-presentacion.pdf'),
  width: '1920px',
  height: '1080px',
  printBackground: true,
  preferCSSPageSize: true,
})

await navegador.close()
process.stdout.write(`${total} diapositivas exportadas en ${SALIDA}\n`)
