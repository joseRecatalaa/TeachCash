'use client'

/**
 * La esquina de la cuenta, arriba a la derecha de la Navbar.
 *
 *   - **Invitado**: botón "Iniciar sesión".
 *   - **Con sesión**: un círculo con la inicial del email. Es la señal de que
 *     hay una cuenta iniciada; al pulsarlo, el email completo, "Cerrar sesión"
 *     y, aparte, "Borrar mi cuenta".
 */

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, Menu, UnstyledButton } from '@mantine/core'
import { IconLogin2, IconLogout, IconMail, IconTrash } from '@tabler/icons-react'
import { useCuenta } from '@/src/application/providers/CuentaProvider'
import { SketchButton } from '@/src/presentation/components/ui'
import styles from './CuentaMenu.module.css'

export function CuentaMenu() {
  const { cuenta, salir } = useCuenta()
  const [saliendo, setSaliendo] = useState(false)

  if (cuenta.tipo === 'invitado') {
    return (
      <SketchButton
        href="/Login"
        size="sm"
        variant="secondary"
        leftSection={<IconLogin2 size={16} stroke={2.2} />}
      >
        Iniciar sesión
      </SketchButton>
    )
  }

  const inicial = cuenta.email.charAt(0).toUpperCase()

  return (
    <Menu position="bottom-end" width={260} withinPortal>
      <Menu.Target>
        <UnstyledButton className={styles.disparador} aria-label={`Cuenta de ${cuenta.email}`}>
          <Avatar radius="xl" size={36}>
            {inicial}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Has iniciado sesión como</Menu.Label>
        <div className={styles.email}>
          <IconMail size={15} stroke={2} aria-hidden />
          <span>{cuenta.email}</span>
        </div>
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconLogout size={16} stroke={2} />}
          disabled={saliendo}
          onClick={async () => {
            setSaliendo(true)
            try {
              await salir()
            } finally {
              setSaliendo(false)
            }
          }}
        >
          Cerrar sesión
        </Menu.Item>
        {/* Separado y al final: es lo único del menú que no tiene vuelta atrás.
            Lleva a una página que pide la contraseña, no borra desde aquí. */}
        <Menu.Divider />
        <Menu.Item
          component={Link}
          href="/BorrarCuenta"
          leftSection={<IconTrash size={16} stroke={2} />}
        >
          Borrar mi cuenta
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
