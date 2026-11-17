'use client'

/**
 * La pregunta "¿con cuánto empiezas?" dentro de la tarjeta de Patrimonio.
 *
 * Sale sola mientras la persona no ha elegido su patrimonio inicial (invitado
 * nuevo o cuenta que aún no lo tiene) y, después, al pulsar el lápiz para
 * cambiarlo. No es un `GenericForm`: es un único campo dentro de una tarjeta de
 * portada, no un formulario de entidad.
 *
 * Lo que se escribe aquí es el patrimonio TOTAL de HOY, movimientos incluidos:
 * al cambiarlo sale relleno con la cifra que enseña la tarjeta, no con la base.
 * El servidor guarda la base (total - movimientos), así que la portada sigue
 * siendo derivada (regla dura 7) y lo que se anote después se suma a esta cifra.
 */

import { useState, type FormEvent } from 'react'
import { useGuardarPatrimonio } from '@/src/application/hooks/usePerfil'
import { MoneyInput } from '@/src/presentation/components/Forms/GenericForm/MoneyInput'
import { SketchButton } from '@/src/presentation/components/ui'
import { DIVISA_APP } from '@/lib/money'
import styles from './ElegirPatrimonio.module.css'

export interface ElegirPatrimonioProps {
  /** El patrimonio total de hoy, al cambiarlo. `null` la primera vez. */
  actual: number | null
  /** Solo al cambiarlo: la primera vez no hay a dónde volver. */
  onCancelar?: () => void
  onGuardado?: () => void
}

export function ElegirPatrimonio({ actual, onCancelar, onGuardado }: ElegirPatrimonioProps) {
  const [valor, setValor] = useState<number | null>(actual)
  const [error, setError] = useState<string | null>(null)
  const guardar = useGuardarPatrimonio()

  const enviar = (importe: number) => {
    setError(null)
    guardar.mutate(importe, {
      onSuccess: () => onGuardado?.(),
      onError: (e) => setError(e.message),
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // `MoneyInput` publica `null` mientras el texto no es un importe: se avisa
    // en vez de guardar una cifra que no es la que se ve.
    if (valor === null) {
      setError('Escribe un importe, por ejemplo 1.250,00')
      return
    }
    enviar(valor)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <p className={styles.pregunta}>
        {actual === null ? '¿Con cuánto empiezas?' : 'Cambiar el patrimonio'}
      </p>
      <p className={styles.ayuda}>
        Lo que tienes hoy entre cuentas y efectivo. Lo que anotes después se
        sumará o restará a esta cifra.
      </p>

      <MoneyInput
        label="Patrimonio"
        value={valor}
        onChange={(v) => {
          setValor(v)
          setError(null)
        }}
        divisa={DIVISA_APP}
        error={error}
        data-autofocus
      />

      <div className={styles.acciones}>
        <SketchButton type="submit" variant="secondary" size="sm" loading={guardar.isPending}>
          Guardar
        </SketchButton>
        {onCancelar ? (
          <SketchButton type="button" variant="ghost" size="sm" onClick={onCancelar}>
            Cancelar
          </SketchButton>
        ) : (
          // La salida para quien no quiere pensarlo ahora: el cero también es
          // una elección, y deja de preguntarse.
          <SketchButton
            type="button"
            variant="ghost"
            size="sm"
            disabled={guardar.isPending}
            onClick={() => enviar(0)}
          >
            Empezar en 0 €
          </SketchButton>
        )}
      </div>
    </form>
  )
}
