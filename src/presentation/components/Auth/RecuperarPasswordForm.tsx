'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconMailForward } from '@tabler/icons-react'
import { obtenerTokenCaptcha } from '@/lib/turnstile'
import { solicitarRecuperacion } from '@/src/application/actions/auth.actions'
import { SketchButton } from '@/src/presentation/components/ui'
import { validarEmail } from './validacion'
import { AuthError, AuthFormulario, AuthHecho, AuthPanel } from './AuthPanel'

export function RecuperarPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const form = useForm({
    initialValues: { email: '' },
    validate: {
      email: validarEmail,
    },
  })

  const enviar = form.onSubmit(async (valores) => {
    setEnviando(true)
    setError(null)
    try {
      const resultado = await solicitarRecuperacion({
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
      setError(e instanceof Error ? e.message : 'No se ha podido enviar el enlace')
    } finally {
      setEnviando(false)
    }
  })

  return (
    <AuthPanel
      titulo="Recuperar contraseña"
      explicacion="Escribe el email de tu cuenta y te mandaremos un enlace para elegir una contraseña nueva."
      pie={
        <span>
          ¿Te has acordado? <Link href="/Login">Inicia sesión</Link>
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
              leftSection={<IconMailForward size={16} stroke={2.2} />}
            >
              Enviarme el enlace
            </SketchButton>
          </AuthFormulario>
        </>
      )}
    </AuthPanel>
  )
}
