'use client'

/**
 * Elegir o cambiar la contraseña.
 *
 * Se llega desde el enlace del email (confirmar la cuenta nueva o recuperar la
 * contraseña), que ya deja la sesión iniciada y no pide la actual: quien llega
 * así no la conoce. Con una sesión abierta escribiendo la contraseña, sí se
 * pide. Quién es quién lo decide el servidor (`requisitosCambioPassword`); aquí
 * solo se pinta el campo cuando hace falta.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PasswordInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconKey } from '@tabler/icons-react'
import { obtenerTokenCaptcha } from '@/lib/turnstile'
import {
  cambiarPassword,
  requisitosCambioPassword,
} from '@/src/application/actions/auth.actions'
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
  // `null` mientras se pregunta: hasta saberlo no se deja enviar, para no
  // mandar el formulario sin la actual cuando sí hacía falta.
  const [pideActual, setPideActual] = useState<boolean | null>(null)

  const esUsuario = cuenta.tipo === 'usuario'
  useEffect(() => {
    if (!esUsuario) return
    let vigente = true
    requisitosCambioPassword()
      .then((r) => {
        if (!vigente) return
        if (r.ok) setPideActual(r.data.pideActual)
        else setError(r.error)
      })
      .catch(() => vigente && setError('No se ha podido preparar el formulario'))
    return () => {
      vigente = false
    }
  }, [esUsuario])

  const form = useForm({
    initialValues: { passwordActual: '', password: '', repetir: '' },
    validate: {
      passwordActual: (v) => (pideActual && !v ? 'Escribe tu contraseña actual' : null),
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
      const resultado = await cambiarPassword(
        pideActual
          ? { ...valores, captchaToken: await obtenerTokenCaptcha() }
          : { password: valores.password, repetir: valores.repetir },
      )
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
      titulo={pideActual ? 'Cambiar contraseña' : 'Elige tu contraseña'}
      explicacion={
        <>
          Para <strong>{cuenta.email}</strong>. Mínimo 10 caracteres, con mayúsculas,
          minúsculas, números y algún símbolo.
        </>
      }
    >
      <AuthError mensaje={error} />
      <AuthFormulario onSubmit={enviar}>
        {pideActual && (
          <PasswordInput
            label="Contraseña actual"
            autoComplete="current-password"
            required
            {...form.getInputProps('passwordActual')}
          />
        )}
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
          disabled={pideActual === null}
          leftSection={<IconKey size={16} stroke={2.2} />}
        >
          Guardar contraseña
        </SketchButton>
      </AuthFormulario>
    </AuthPanel>
  )
}
