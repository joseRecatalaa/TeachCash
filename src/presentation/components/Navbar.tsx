'use client'

/**
 * Barra de navegación superior.
 *
 * Es el sitio donde se da de alta una entidad nueva en el menú: una entrada más
 * en `ENLACES`. El generador de Plop no la toca — decidir si algo va en el menú
 * es una decisión de producto, no de andamiaje.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Anchor, Container, Group, Title } from '@mantine/core'
import {
  IconArrowsLeftRight,
  IconChartPie,
  IconTags,
  IconWallet,
} from '@tabler/icons-react'

const ENLACES = [
  { href: '/Cuentas', label: 'Cuentas', icon: IconWallet },
  { href: '/Movimientos', label: 'Movimientos', icon: IconArrowsLeftRight },
  { href: '/Categorias', label: 'Categorías', icon: IconTags },
  { href: '/Informes', label: 'Informes', icon: IconChartPie },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <Container
      fluid
      px="xl"
      py="sm"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Group justify="space-between" wrap="wrap" gap="md">
        <Anchor component={Link} href="/" underline="never" c="inherit">
          <Title order={4}>Finanzas</Title>
        </Anchor>

        <Group gap="lg">
          {ENLACES.map(({ href, label, icon: Icono }) => {
            // `startsWith` y no igualdad: /Cuentas/Create también debe marcar
            // Cuentas como sección activa.
            const activo = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Anchor
                key={href}
                component={Link}
                href={href}
                underline="never"
                fw={activo ? 600 : 400}
                c={activo ? undefined : 'dimmed'}
              >
                <Group gap={6} wrap="nowrap">
                  <Icono size={16} />
                  {label}
                </Group>
              </Anchor>
            )
          })}
        </Group>
      </Group>
    </Container>
  )
}
