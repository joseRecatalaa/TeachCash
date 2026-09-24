'use client'

/**
 * Barra de navegación superior.
 *
 * Es el sitio donde se da de alta una entidad nueva en el menú: una entrada más
 * en `ENLACES`. El generador de Plop no la toca — decidir si algo va en el menú
 * es una decisión de producto, no de andamiaje.
 *
 * El aspecto vive en `Navbar.module.css`. Se dejó de usar el `<Anchor>` de
 * Mantine porque el estado activo necesita tres señales a la vez (peso, trazo y
 * fondo) y con las props de Mantine eso eran tres condicionales en el JSX.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Container } from '@mantine/core'
import {
  IconArrowsLeftRight,
  IconCalendarStats,
  IconLayoutDashboard,
  IconTags,
  IconWallet,
} from '@tabler/icons-react'
import styles from './Navbar.module.css'

const ENLACES = [
  { href: '/', label: 'Inicio', icon: IconLayoutDashboard },
  { href: '/Planificacion', label: 'Planificación', icon: IconCalendarStats },
  { href: '/Categorias', label: 'Categorías', icon: IconTags },
  { href: '/Movimientos', label: 'Movimientos', icon: IconArrowsLeftRight },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className={styles.shell}>
      <Container fluid px="xl" py="sm">
        <nav className={styles.inner} aria-label="Principal">
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden>
              <IconWallet size={19} stroke={2.2} />
            </span>
            <span className={styles.brandName}>TeachCash</span>
          </Link>

          <div className={styles.links}>
            {ENLACES.map(({ href, label, icon: Icono }) => {
              // `startsWith` y no igualdad: /Movimientos/Create también debe
              // marcar Movimientos como sección activa.
              //
              // La raíz es la excepción y hay que tratarla aparte: TODA ruta
              // empieza por '/', así que con la regla general Inicio saldría
              // activo en las tres pantallas a la vez.
              const activo =
                href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={activo ? `${styles.link} ${styles.active}` : styles.link}
                  // Lo que ve quien navega con lector de pantalla. El fondo y el
                  // trazo no le llegan.
                  aria-current={activo ? 'page' : undefined}
                >
                  <span className={styles.icon} aria-hidden>
                    <Icono size={16} stroke={2} />
                  </span>
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>
      </Container>
    </header>
  )
}
