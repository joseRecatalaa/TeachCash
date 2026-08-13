'use client'

/**
 * Botón que dispara una Server Action sobre un recurso concreto.
 *
 * Es un `form` de verdad, no un onClick: así funciona igual con JavaScript
 * deshabilitado y el id viaja en el cuerpo del POST, no en la URL.
 */

import { useActionState } from 'react'
import { Button } from '.'
import { idleState, type ActionState } from '@/lib/forms'

export function ActionButton({
  action,
  fields,
  children,
  confirm,
  variant = 'secondary',
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  fields: Record<string, string>
  children: React.ReactNode
  confirm?: string
  variant?: 'primary' | 'secondary' | 'danger'
}) {
  const [state, formAction, isPending] = useActionState(action, idleState)

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault()
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button variant={variant} disabled={isPending}>
        {children}
      </Button>
      {state.status === 'error' && state.error && (
        <span role="alert" className="text-xs text-expense">
          {state.error}
        </span>
      )}
    </form>
  )
}
