'use client'

// Cliente solo por usePathname, que es lo único que necesita el navegador aquí.
// El layout que lo contiene sigue siendo Server Component.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Resumen' },
  { href: '/cuentas', label: 'Cuentas' },
  { href: '/movimientos', label: 'Movimientos' },
  { href: '/informes', label: 'Informes' },
  { href: '/categorias', label: 'Categorías' },
] as const

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Secciones">
      {LINKS.map((link) => {
        const active =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition ${
              active ? 'bg-surface font-medium' : 'text-muted hover:text-foreground'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
