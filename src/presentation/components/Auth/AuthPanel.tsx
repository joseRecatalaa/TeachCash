'use client'

/**
 * La carcasa de las pantallas de acceso (entrar, crear cuenta, recuperar y
 * cambiar contraseña): una ficha centrada con título, explicación, el
 * formulario y los enlaces de abajo.
 *
 * Estas pantallas NO usan `GenericForm`, y es a propósito: `GenericForm` es el
 * formulario de una ENTIDAD (carga su metadata por recurso, sus botones son
 * "Cancelar / Guardar" y navega al listado). Aquí no hay entidad, hay dos o
 * tres campos y un botón con un verbo concreto. Los inputs siguen siendo los
 * de Mantine, así que heredan el trazo del tema igual.
 */

import type { ReactNode } from 'react'
import { Alert } from '@mantine/core'
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import styles from './AuthPanel.module.css'

export function AuthPanel({
  titulo,
  explicacion,
  children,
  pie,
}: {
  titulo: string
  explicacion?: ReactNode
  children: ReactNode
  pie?: ReactNode
}) {
  return (
    <main className={styles.pagina}>
      <section className={styles.ficha} aria-labelledby="auth-titulo">
        <h1 id="auth-titulo" className={styles.titulo}>
          {titulo}
        </h1>
        {explicacion && <p className={styles.explicacion}>{explicacion}</p>}
        {children}
        {pie && <div className={styles.pie}>{pie}</div>}
      </section>
    </main>
  )
}

/** El `<form>` de la ficha: campos en columna y botón a todo el ancho. */
export function AuthFormulario({
  onSubmit,
  children,
}: {
  onSubmit: (evento: React.FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  return (
    <form className={styles.formulario} onSubmit={onSubmit} noValidate>
      {children}
    </form>
  )
}

/** El error de la última acción, encima del formulario. */
export function AuthError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <Alert color="red" icon={<IconAlertTriangle size={18} />} role="alert">
      {mensaje}
    </Alert>
  )
}

/** Lo que se enseña EN LUGAR del formulario cuando ya está hecho. */
export function AuthHecho({ children }: { children: ReactNode }) {
  return (
    <Alert icon={<IconCircleCheck size={18} />} role="status">
      {children}
    </Alert>
  )
}
