'use client'

/**
 * Elegir contraseña. Se llega aquí desde el enlace del email (confirmar la
 * cuenta nueva o recuperar la contraseña), que ya deja la sesión iniciada.
 */

import { useState } from 'react'
import Link from 'next/link'
import { PasswordInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconKey } from '@tabler/icons-react'
import { cambiarPassword } from '@/src/application/actions/auth.actions'
import { useCuenta } from '@/src/application/providers/CuentaProvider'
import { SketchButton } from '@/src/presentation/components/ui'
import { AuthError, AuthFormulario, AuthPanel } from './AuthPanel'

/** La misma política que Supabase. Aquí solo es cortesía; la impone el servidor. */
const REQUISITOS: ReadonlyArray<[RegExp, string]> = [
  [/.{10,}/, 'Mínimo 10 caracteres'],
  [/[a-z]/, 'Incluye al menos una minúscula'],
  [/[A-Z]/, 'Incluye al menos una mayúscula'],
  [/[0-9]/, 'Incluye al menos un número'],
  [/[^a-zA-Z0-9]/, 'Incluye al menos un símbolo'],
]

export function CambiarPasswordForm() {
  const { cuenta, entrar } = useCuenta()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const form = useForm({
    initialValues: { password: '', repetir: '' },
    validate: {
      password: (v) => REQUISITOS.find(([regla]) => !regla.test(v))?.[1] ?? null,
      repetir: (v, valores) => (v === valores.password ? null : 'Las contraseñas no coinciden'),
    },
  })

  if (cuenta.tipo === 'invitado') {
    return (
      <AuthPanel
        titulo="Cambiar contraseña"
        explicacion="Para elegir contraseña primero necesitas una cuenta con email confirmado."
        pie={
          <span>
            <Link href="/Registro">Crear cuenta</Link> · <Link href="/Login">Iniciar sesión</Link>
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
      const resultado = await cambiarPassword(valores)
      if (!resultado.ok) {
        setError(resultado.error)
        if (resultado.fieldErrors) form.setErrors(resultado.fieldErrors)
        return
      }
      entrar(resultado.data)
    } catch {
      setError('No se ha podido guardar la contraseña')
    } finally {
      setEnviando(false)
    }
  })

  return (
    <AuthPanel
      titulo="Elige tu contraseña"
      explicacion={
        <>
          Para <strong>{cuenta.email}</strong>. Mínimo 10 caracteres, con mayúsculas,
          minúsculas, números y algún símbolo.
        </>
      }
    >
      <AuthError mensaje={error} />
      <AuthFormulario onSubmit={enviar}>
        <PasswordInput
          label="Contraseña nueva"
          autoComplete="new-password"
          required
          {...form.getInputProps('password')}
        />
        <PasswordInput
          label="Repítela"
          autoComplete="new-password"
          required
          {...form.getInputProps('repetir')}
        />
        <SketchButton
          type="submit"
          fullWidth
          loading={enviando}
          leftSection={<IconKey size={16} stroke={2.2} />}
        >
          Guardar contraseña
        </SketchButton>
      </AuthFormulario>
    </AuthPanel>
  )
}
