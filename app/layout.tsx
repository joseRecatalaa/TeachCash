import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Geist_Mono, Nunito, Press_Start_2P } from 'next/font/google'
import localFont from 'next/font/local'
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core'
// El orden importa y no es arbitrario: las reglas dentro de `@layer` pierden
// siempre frente a las no capadas, y varios detalles de mantine-datatable (el
// fondo de las celdas, el borde de la cabecera) dependen de ganarle a core. Por
// eso ninguna de estas hojas se envuelve en una capa.
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import 'mantine-datatable/styles.css'
// Antes de `globals.css`, que tiene que seguir siendo la última hoja.
import styles from './layout.module.css'
// `globals.css` va EL ÚLTIMO: define los tokens del sistema de diseño y
// reapunta las variables de Mantine (`--mantine-color-body`, `--mantine-font-*`).
// Mantine las declara sobre `:root[data-mantine-color-scheme]` y, a igual
// especificidad, gana quien se declare después. Si sube de sitio, la aplicación
// vuelve al gris de fábrica.
import './globals.css'
import { CABECERA_NONCE } from '@/lib/csp'
import {
  CABECERA_RUTA,
  DESCRIPCION_SITIO,
  NOMBRE_SITIO,
  TITULO_SITIO,
  URL_SITIO,
  esPaginaPublica,
} from '@/lib/seo'
import { cuentaDeLaPeticion } from '@/src/application/cuentaDeLaPeticion'
import { Providers } from '@/src/application/providers/providers'
import { catalogoPublico } from '@/src/infrastructure/heroe/catalogo'
import { Navbar } from '@/src/presentation/components/Navbar'
import { MarcoPublico } from '@/src/presentation/components/Publico/MarcoPublico'
import { SideMenu } from '@/src/presentation/components/SideMenu/SideMenu'
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
 *
 * Y una cuarta que no es del sistema sino del MUNDO de píxel: **Press Start 2P**,
 * solo para la pantalla de carga y el Camino del héroe. No se usa para nada que
 * haya que leer seguido; es ancha y cansa en cuanto pasa de una línea.
 */
// Fredoka va en el repo y no por next/font/google: al bajarla de Google, el build
// falló en el CI, sin tocar el código, con "next/font/google queries have exactly
// one entry", y pasaba al repetirlo más tarde. Variable, del 300 al 700.
// next/font/local llama a la familia como a esta constante, y por eso se llama así:
// e2e/tipografia.spec.ts comprueba que los titulares salen en "Fredoka".
const Fredoka = localFont({
  src: './fonts/fredoka-latin-wght-normal.woff2',
  variable: '--font-display',
  weight: '300 700',
})
const body = Nunito({ variable: '--font-body', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const pixel = Press_Start_2P({ variable: '--font-pixel', subsets: ['latin'], weight: '400' })

export const metadata: Metadata = {
  // Las direcciones relativas de la metadata (canónicas, Open Graph) se
  // resuelven contra la canónica, con `www`, y no contra el host de la petición.
  metadataBase: new URL(URL_SITIO),
  applicationName: NOMBRE_SITIO,
  title: { default: TITULO_SITIO, template: `%s | ${NOMBRE_SITIO}` },
  description: DESCRIPCION_SITIO,
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: NOMBRE_SITIO,
    title: TITULO_SITIO,
    description: DESCRIPCION_SITIO,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: TITULO_SITIO, description: DESCRIPCION_SITIO },
  // Por defecto NADA se indexa: el resto de rutas es la aplicación, que sin
  // sesión no enseña nada y con ella enseña los datos de una persona. Las
  // páginas públicas (la portada sin sesión y `/aprende`) lo levantan en su
  // propia metadata. Ver `lib/seo.ts`.
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
  const cuentaInicial = await cuentaDeLaPeticion()
  const cabeceras = await headers()
  // El nonce de esta petición (lo pone `proxy.ts`). Los dos scripts inline de
  // abajo lo necesitan: sin él la CSP los bloquea y vuelven los fogonazos.
  const nonce = cabeceras.get(CABECERA_NONCE) ?? undefined
  // Página pública (la portada sin sesión, los cursos): HTML del servidor, sin
  // aplicación y sin crear invitado. La ruta la pone `proxy.ts`. Esto se decide
  // al CARGAR: una navegación con `<Link>` no vuelve a pasar por el layout, y
  // por eso los enlaces que cruzan entre lo público y la aplicación son `<a>`.
  const conSesion = cuentaInicial.tipo !== 'ninguna'
  const publica = esPaginaPublica(cabeceras.get(CABECERA_RUTA) ?? '', conSesion)

  return (
    // `mantineHtmlProps` añade `suppressHydrationWarning`: el script de tema
    // toca el <html> antes de que React hidrate, y sin esto avisa en consola.
    //
    // Las clases de `next/font` van en el <html> y NO en el <body>: definen
    // `--font-body` y compañía, y `globals.css` las lee desde `:root`
    // (`--sd-font-body: var(--font-body), …`). Un `var()` se resuelve donde se
    // declara; en el <body> llegaban tarde, `--sd-font-*` quedaban inválidas y
    // toda la app se pintaba en Times New Roman sin un solo error. Lo vigila
    // e2e/tipografia.spec.ts.
    <html
      lang="es"
      className={`${Fredoka.variable} ${body.variable} ${geistMono.variable} ${pixel.variable}`}
      {...mantineHtmlProps}
    >
      <head>
        {/* Fija el esquema de color ANTES del primer pintado. Sin él hay un
            fogonazo blanco al entrar en modo oscuro. */}
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
        {/* Y por el mismo motivo que el de arriba: marca el <html> ANTES del
            primer pintado si la pantalla de carga ya se vio en esta sesión del
            navegador, y si el aviso de invitado está cerrado. El HTML del
            servidor trae siempre las dos cosas, así que si la decisión esperase
            a que React hidrate se vería un fogonazo en cada recarga.
            El aviso: misma clave y mismo día de margen (864e5 ms) que
            `AvisoInvitado.tsx`; si cambias uno, cambia el otro. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `try{var d=document.documentElement;if(sessionStorage.getItem('gf-splash-visto')==='1')d.dataset.splash='visto';var a=localStorage.getItem('tc-aviso-invitado-cerrado');if(a&&Date.now()<Date.parse(a)-864e5)d.dataset.avisoInvitado='cerrado'}catch(e){}`,
          }}
        />
      </head>
      <body>
        {publica ? (
          <MarcoPublico conSesion={conSesion} mundos={await catalogoPublico()}>
            {children}
          </MarcoPublico>
        ) : (
          <>
            {/* Va FUERA de `Providers` y antes que nada: no necesita Refine ni el
                tema de Mantine —se pinta con los tokens del sistema— y así puede
                aparecer en el primer fotograma, mientras la aplicación hidrata por
                detrás. Se desmonta sola al terminar su animación. */}
            <SplashScreen />
            <Providers cuentaInicial={cuentaInicial}>
              <Navbar />
              {/* DESPUÉS de la Navbar, no antes: los dos van a z-index 200 y a
                  igualdad gana el último del DOM. Así el panel tapa la cabecera. */}
              <SideMenu />
              {/* El hueco a la izquierda para la pestaña del menú. */}
              <div className={styles.contenido}>{children}</div>
            </Providers>
          </>
        )}
      </body>
    </html>
  )
}
