'use client'

import { useActionState } from 'react'
import { ACCOUNT_TYPES } from '@/db/schema'
import { CURRENCIES } from '@/lib/money'
import { idleState, type ActionState } from '@/lib/forms'
import { Button, Field, FormStatus, Input, Select } from '@/components/ui'
import { ACCOUNT_TYPE_LABELS } from '../schema'

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  /** Solo los campos que se pintan, no la fila entera de la base de datos. */
  account?: {
    id: string
    name: string
    type: string
    currency: string
    openingBalance: string
  }
  submitLabel: string
}

export function AccountForm({ action, account, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, idleState)
  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {account && <input type="hidden" name="id" value={account.id} />}

      <Field label="Nombre" htmlFor="name" errors={errors.name}>
        <Input
          id="name"
          name="name"
          defaultValue={account?.name}
          required
          maxLength={60}
          placeholder="BBVA Nómina"
        />
      </Field>

      <Field label="Tipo" htmlFor="type" errors={errors.type}>
        <Select id="type" name="type" defaultValue={account?.type ?? 'checking'}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>

      {account ? (
        // La divisa no se cambia: los movimientos ya registrados están en ella.
        <p className="text-sm text-muted">Divisa: {account.currency}</p>
      ) : (
        <Field label="Divisa" htmlFor="currency" errors={errors.currency}>
          <Select id="currency" name="currency" defaultValue="EUR">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field
        label="Saldo actual"
        htmlFor="openingBalance"
        errors={errors.openingBalance}
        hint="El saldo que tiene hoy la cuenta. Puede ser negativo en una tarjeta."
      >
        {/* inputMode decimal y no type="number": en móvil con teclado español
            type="number" rechaza la coma. */}
        <Input
          id="openingBalance"
          name="openingBalance"
          inputMode="decimal"
          defaultValue={account?.openingBalance ?? '0'}
          placeholder="1.234,56"
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button disabled={isPending}>{isPending ? 'Guardando…' : submitLabel}</Button>
        <FormStatus state={state} />
      </div>
    </form>
  )
}
