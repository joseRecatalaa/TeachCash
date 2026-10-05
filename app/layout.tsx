import type { Metadata } from 'next'
import { headers } from 'next/headers'
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
import { CABECERA_NONCE } from '@/lib/csp'
import { getCuenta } from '@/src/application/actions/auth.actions'
import { Providers } from '@/src/application/providers/providers'
import { Navbar } from '@/src/presentation/components/Navbar'
import { SplashScreen } from '@/src/presentation/components/Splash/SplashScreen'

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
  title: 'TeachCash',
  description: 'Gestor de finanzas personales',
  // Una aplicación de finanzas personales no tiene nada que indexar, y un
  // rastreador que ejecuta JavaScript crearía un invitado en cada visita.
  robots: { index: false, follow: false },
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

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Quién es, resuelto en el servidor antes de pintar: así la Navbar sale ya
  // con el círculo o con "Iniciar sesión", sin un parpadeo de carga.
  const cuenta = await getCuenta()
  const cuentaInicial = cuenta.ok ? cuenta.data : { tipo: 'ninguna' as const }
  // El nonce de esta petición (lo pone `proxy.ts`). Los dos scripts inline de
  // abajo lo necesitan: sin él la CSP los bloquea y vuelven los fogonazos.
  const nonce = (await headers()).get(CABECERA_NONCE) ?? undefined

  return (
    // `mantineHtmlProps` añade `suppressHydrationWarning`: el script de tema
    // toca el <html> antes de que React hidrate, y sin esto avisa en consola.
    <html lang="es" {...mantineHtmlProps}>
      <head>
        {/* Fija el esquema de color ANTES del primer pintado. Sin él hay un
            fogonazo blanco al entrar en modo oscuro. */}
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
        {/* Y por el mismo motivo que el de arriba: marca el <html> ANTES del
            primer pintado si la pantalla de carga ya se vio en esta sesión del
            navegador. El HTML del servidor la trae siempre, así que si la
            decisión esperase a que React hidrate se vería un fogonazo en cada
            recarga. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem('gf-splash-visto')==='1')document.documentElement.dataset.splash='visto'}catch(e){}`,
          }}
        />
      </head>
      <body className={`${display.variable} ${body.variable} ${geistMono.variable}`}>
        {/* Va FUERA de `Providers` y antes que nada: no necesita Refine ni el
            tema de Mantine —se pinta con los tokens del sistema— y así puede
            aparecer en el primer fotograma, mientras la aplicación hidrata por
            detrás. Se desmonta sola al terminar su animación. */}
        <SplashScreen />
        <Providers cuentaInicial={cuentaInicial}>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
