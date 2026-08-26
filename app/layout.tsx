import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { NavLinks } from '@/components/nav-links'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finanzas',
  description: 'Gestor de finanzas personales',
}

/**
 * Todas las rutas de la aplicación se renderizan en cada petición.
 *
 * Sin esto, Next prerenderiza estáticamente las páginas que no usan APIs de
 * petición — y el resumen, las cuentas y las categorías quedarían congelados
 * con los datos que hubiera en la base de datos EN EL MOMENTO DEL BUILD. Un
 * saldo que no cambia al anotar un gasto es peor que no tener saldo.
 */
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-6">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Finanzas
            </Link>
            <NavLinks />
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  )
}
