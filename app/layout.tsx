import type { Metadata } from 'next'
import { Fredoka, Geist_Mono, Nunito } from 'next/font/google'
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core'
// El orden importa y no es arbitrario: las reglas dentro de `@layer` pierden
// siempre frente a las no capadas, y varios detalles de mantine-datatable (el
// fondo de las celdas, el borde de la cabecera) dependen de ganarle a core. Por
// eso ninguna de estas hojas se envuelve en una capa.
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import 'mantine-datatable/styles.css'
// `globals.css` va EL ÚLTIMO: define los tokens del sistema de diseño y
// reapunta las variables de Mantine (`--mantine-color-body`, `--mantine-font-*`).
// Mantine las declara sobre `:root[data-mantine-color-scheme]` y, a igual
// especificidad, gana quien se declare después. Si sube de sitio, la aplicación
// vuelve al gris de fábrica.
import './globals.css'
import { Providers } from '@/src/application/providers/providers'
import { Navbar } from '@/src/presentation/components/Navbar'

/**
 * Las tres familias del sistema, y por qué son tres:
 *
 *   - **Fredoka** para titulares, botones y etiquetas. Es la que pone el tono
 *     desenfadado; en párrafos largos cansa, así que no se usa como texto.
 *   - **Nunito** para el texto corrido. Redondeada como Fredoka pero pensada
 *     para leerse seguido.
 *   - **Geist Mono** para el dinero, y esta no es una decisión estética: las
 *     cifras tienen que ser de ancho fijo para poder compararse en columna.
 *     Ninguna tipografía redondeada garantiza eso.
 */
const display = Fredoka({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})
const body = Nunito({ variable: '--font-body', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finanzas',
  description: 'Gestor de finanzas personales',
}

/**
 * Todas las rutas se renderizan en cada petición.
 *
 * Sin esto, Next prerenderiza estáticamente las páginas que no usan APIs de
 * petición. Aunque los datos los pida el cliente vía Refine, el prerender
 * congelaría el envoltorio y, sobre todo, ejecutaría las Server Actions de
 * lectura en tiempo de BUILD si algún día una página vuelve a ser Server
 * Component. Un saldo que no cambia al anotar un gasto es peor que no tenerlo.
 */
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // `mantineHtmlProps` añade `suppressHydrationWarning`: el script de tema
    // toca el <html> antes de que React hidrate, y sin esto avisa en consola.
    <html lang="es" {...mantineHtmlProps}>
      <head>
        {/* Fija el esquema de color ANTES del primer pintado. Sin él hay un
            fogonazo blanco al entrar en modo oscuro. */}
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body className={`${display.variable} ${body.variable} ${geistMono.variable}`}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
