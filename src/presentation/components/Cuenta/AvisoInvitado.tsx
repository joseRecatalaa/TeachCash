'use client'

/**
 * La franja bajo la Navbar que ve un invitado: cuándo se borran sus datos y
 * cómo evitarlo.
 *
 * No se puede cerrar. Es la única señal de que lo que está anotando
 * desaparecerá, y una franja que se cierra se cierra el primer día y no se
 * vuelve a leer.
 */

import Link from 'next/link'
import { IconClockExclamation } from '@tabler/icons-react'
import { useCuenta } from '@/src/application/providers/CuentaProvider'
import styles from './AvisoInvitado.module.css'

/**
 * `caducaEl` es un INSTANTE (cuándo corre el job de limpieza), no una fecha
 * civil, así que aquí sí se formatea con hora y en el huso de quien mira.
 */
const formato = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

export function AvisoInvitado() {
  const { cuenta } = useCuenta()
  if (cuenta.tipo !== 'invitado') return null

  return (
    <div className={styles.franja} role="note">
      <IconClockExclamation size={18} stroke={2} aria-hidden className={styles.icono} />
      <p className={styles.texto}>
        Estás como <strong>invitado</strong>: tus datos se borrarán el{' '}
        <strong suppressHydrationWarning>{formato.format(new Date(cuenta.caducaEl))}</strong>.{' '}
        <Link href="/Registro" className={styles.enlace}>
          Crea una cuenta
        </Link>{' '}
        para conservarlos.
      </p>
    </div>
  )
}
