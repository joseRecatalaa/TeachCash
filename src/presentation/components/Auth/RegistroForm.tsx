'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconUserPlus } from '@tabler/icons-react'
import { obtenerTokenCaptcha } from '@/lib/turnstile'
import { registrarse } from '@/src/application/actions/auth.actions'
import { useCuenta } from '@/src/application/providers/CuentaProvider'
import { SketchButton } from '@/src/presentation/components/ui'
import { AuthError, AuthFormulario, AuthHecho, AuthPanel } from './AuthPanel'

export function RegistroForm() {
  const { cuenta } = useCuenta()
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const form = useForm({
    initialValues: { email: '' },
    validate: {
      email: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? null : 'Escribe un email válido'),
    },
  })

  if (cuenta.tipo === 'usuario') {
    return (
      <AuthPanel titulo="Ya tienes una cuenta">
        <AuthHecho>
          Has iniciado sesión como <strong>{cuenta.email}</strong>.
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
      const resultado = await registrarse({
        ...valores,
        captchaToken: await obtenerTokenCaptcha(),
      })
      if (!resultado.ok) {
        setError(resultado.error)
        if (resultado.fieldErrors) form.setErrors(resultado.fieldErrors)
        return
      }
      setHecho(resultado.data.mensaje)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido crear la cuenta')
    } finally {
      setEnviando(false)
    }
  })

  return (
    <AuthPanel
      titulo="Crear cuenta"
      explicacion={
        <>
          Todo lo que has anotado como invitado <strong>se queda en tu cuenta</strong>. Te
          mandaremos un enlace por email; al abrirlo eliges tu contraseña y listo.
        </>
      }
      pie={
        <span>
          ¿Ya tienes cuenta? <Link href="/Login">Inicia sesión</Link>
        </span>
      }
    >
      {hecho ? (
        <AuthHecho>
          {hecho} Ábrelo en <strong>este mismo navegador</strong>.
        </AuthHecho>
      ) : (
        <>
          <AuthError mensaje={error} />
          <AuthFormulario onSubmit={enviar}>
            <TextInput
              label="Email"
              type="email"
              autoComplete="email"
              required
              {...form.getInputProps('email')}
            />
            <SketchButton
              type="submit"
              fullWidth
              loading={enviando}
              leftSection={<IconUserPlus size={16} stroke={2.2} />}
            >
              Enviarme el enlace
            </SketchButton>
          </AuthFormulario>
        </>
      )}
    </AuthPanel>
  )
}
