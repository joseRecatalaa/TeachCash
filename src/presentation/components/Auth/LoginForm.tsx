'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Alert, PasswordInput, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconInfoCircle, IconLogin2 } from '@tabler/icons-react'
import { obtenerTokenCaptcha } from '@/lib/turnstile'
import { iniciarSesion } from '@/src/application/actions/auth.actions'
import { useCuenta } from '@/src/application/providers/CuentaProvider'
import { SketchButton } from '@/src/presentation/components/ui'
import { AuthError, AuthFormulario, AuthHecho, AuthPanel } from './AuthPanel'

export function LoginForm() {
  const { cuenta, entrar } = useCuenta()
  const enlaceInvalido = useSearchParams().get('enlace') === 'invalido'
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : 'Escribe un email válido'),
      password: (v) => (v ? null : 'Escribe tu contraseña'),
    },
  })

  if (cuenta.tipo === 'usuario') {
    return (
      <AuthPanel titulo="Ya has iniciado sesión">
        <AuthHecho>
          Estás dentro como <strong>{cuenta.email}</strong>.
        </AuthHecho>
        <SketchButton href="/" fullWidth>
          Ir al inicio
        </SketchButton>
      </AuthPanel>
    )
  }

  const enviar = form.onSubmit(async (valores) => {
    setEnviando(true)
    setError(null)
    try {
      const resultado = await iniciarSesion({
        ...valores,
        captchaToken: await obtenerTokenCaptcha(),
      })
      if (!resultado.ok) {
        setError(resultado.error)
        if (resultado.fieldErrors) form.setErrors(resultado.fieldErrors)
        return
      }
      entrar(resultado.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido iniciar sesión')
    } finally {
      setEnviando(false)
    }
  })

  return (
    <AuthPanel
      titulo="Iniciar sesión"
      explicacion="Entra con tu cuenta para ver tus datos desde cualquier dispositivo."
      pie={
        <>
          <span>
            ¿No tienes cuenta? <Link href="/Registro">Crea una</Link>
          </span>
          <span>
            <Link href="/RecuperarPassword">¿Has olvidado tu contraseña?</Link>
          </span>
        </>
      }
    >
      {enlaceInvalido && (
        <Alert color="red" icon={<IconInfoCircle size={18} />}>
          El enlace no es válido o ha caducado. Si lo abriste en otro navegador, ábrelo en el
          mismo donde lo pediste, o pide uno nuevo.
        </Alert>
      )}

      {/* Entrar en una cuenta EXISTENTE cambia de usuario: lo anotado como
          invitado se queda en el invitado. Se avisa antes, no después. */}
      <Alert icon={<IconInfoCircle size={18} />}>
        Lo que hayas anotado como invitado <strong>no se pasará</strong> a la cuenta en la que
        entres. Si quieres conservarlo, <Link href="/Registro">crea una cuenta nueva</Link>.
      </Alert>

      <AuthError mensaje={error} />

      <AuthFormulario onSubmit={enviar}>
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          required
          {...form.getInputProps('email')}
        />
        <PasswordInput
          label="Contraseña"
          autoComplete="current-password"
          required
          {...form.getInputProps('password')}
        />
        <SketchButton
          type="submit"
          fullWidth
          loading={enviando}
          leftSection={<IconLogin2 size={16} stroke={2.2} />}
        >
          Entrar
        </SketchButton>
      </AuthFormulario>
    </AuthPanel>
  )
}
