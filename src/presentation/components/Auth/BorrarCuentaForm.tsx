'use client'

/**
 * Borrar la cuenta. Pide la contraseña otra vez aunque haya sesión: es lo
 * único de la aplicación que no tiene vuelta atrás.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Alert, PasswordInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconAlertTriangle, IconTrash } from '@tabler/icons-react'
import { obtenerTokenCaptcha } from '@/lib/turnstile'
import { borrarCuenta } from '@/src/application/actions/auth.actions'
import { useCuenta } from '@/src/application/providers/CuentaProvider'
import { VIDA_INVITADO_DIAS } from '@/src/types/cuenta.types'
import { SketchButton } from '@/src/presentation/components/ui'
import { AuthError, AuthFormulario, AuthPanel } from './AuthPanel'

export function BorrarCuentaForm() {
  const { cuenta, cuentaBorrada } = useCuenta()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const form = useForm({
    initialValues: { password: '' },
    validate: { password: (v) => (v ? null : 'Escribe tu contraseña') },
  })

  if (cuenta.tipo === 'invitado') {
    return (
      <AuthPanel
        titulo="Borrar mi cuenta"
        explicacion={`Estás como invitado: no hay cuenta que borrar. Lo que anotes se borra solo a los ${VIDA_INVITADO_DIAS} días.`}
        pie={
          <span>
            <Link href="/">Volver al inicio</Link>
          </span>
        }
      >
        {null}
      </AuthPanel>
    )
  }

  const enviar = form.onSubmit(async (valores) => {
    setEnviando(true)
    setError(null)
    try {
      const resultado = await borrarCuenta({
        ...valores,
        captchaToken: await obtenerTokenCaptcha(),
      })
      if (!resultado.ok) {
        setError(resultado.error)
        if (resultado.fieldErrors) form.setErrors(resultado.fieldErrors)
        return
      }
      cuentaBorrada()
    } catch {
      setError('No se ha podido borrar la cuenta')
    } finally {
      setEnviando(false)
    }
  })

  return (
    <AuthPanel
      titulo="Borrar mi cuenta"
      explicacion={
        <>
          Vas a borrar <strong>{cuenta.email}</strong>.
        </>
      }
      pie={
        <span>
          <Link href="/">Cancelar y volver al inicio</Link>
        </span>
      }
    >
      <Alert icon={<IconAlertTriangle size={18} />}>
        Se borrarán <strong>para siempre</strong> la cuenta, todos tus movimientos y tus
        categorías. No se puede deshacer. Si quieres conservar algo, expórtalo antes desde
        Movimientos.
      </Alert>

      <AuthError mensaje={error} />

      <AuthFormulario onSubmit={enviar}>
        <PasswordInput
          label="Tu contraseña, para confirmar"
          autoComplete="current-password"
          required
          {...form.getInputProps('password')}
        />
        <SketchButton
          type="submit"
          variant="danger"
          fullWidth
          loading={enviando}
          leftSection={<IconTrash size={16} stroke={2.2} />}
        >
          Borrar mi cuenta para siempre
        </SketchButton>
      </AuthFormulario>
    </AuthPanel>
  )
}
