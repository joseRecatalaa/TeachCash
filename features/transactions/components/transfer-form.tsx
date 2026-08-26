'use client'

import { useActionState, useEffect, useId, useRef } from 'react'
import { idleState, type ActionState } from '@/lib/forms'
import { Button, Field, FormStatus, Input, Select } from '@/components/ui'
import type { AccountOption } from './transaction-form'

export function TransferForm({
  action,
  accounts,
  today,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  accounts: AccountOption[]
  today: string
}) {
  const [state, formAction, isPending] = useActionState(action, idleState)
  const formRef = useRef<HTMLFormElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)
  const baseKey = useId()

  useEffect(() => {
    if (state.status !== 'success') return
    formRef.current?.reset()
    // Clave nueva tras cada transferencia guardada: la siguiente no es un
    // reenvío de la anterior. Solo DOM, sin setState.
    if (keyRef.current) keyRef.current.value = crypto.randomUUID()
  }, [state])

  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}

  if (accounts.length < 2) {
    return (
      <p className="text-sm text-muted">
        Hacen falta al menos dos cuentas para poder transferir entre ellas.
      </p>
    )
  }

  return (
    <form ref={formRef} action={formAction} className="flex max-w-md flex-col gap-4">
      <input ref={keyRef} type="hidden" name="idempotencyKey" defaultValue={baseKey} />

      <Field label="Desde" htmlFor="fromAccountId" errors={errors.fromAccountId}>
        <Select id="fromAccountId" name="fromAccountId" required defaultValue={accounts[0].id}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Hasta"
        htmlFor="toAccountId"
        errors={errors.toAccountId}
        hint="Las dos cuentas deben estar en la misma divisa."
      >
        <Select id="toAccountId" name="toAccountId" required defaultValue={accounts[1].id}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Importe" htmlFor="transfer-amount" errors={errors.amount}>
        <Input
          id="transfer-amount"
          name="amount"
          inputMode="decimal"
          required
          placeholder="500,00"
        />
      </Field>

      <Field label="Fecha" htmlFor="transfer-date" errors={errors.date}>
        <Input id="transfer-date" name="date" type="date" required defaultValue={today} />
      </Field>

      <Field label="Concepto" htmlFor="transfer-description" errors={errors.description}>
        <Input
          id="transfer-description"
          name="description"
          required
          maxLength={200}
          defaultValue="Traspaso entre cuentas"
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button disabled={isPending}>{isPending ? 'Guardando…' : 'Transferir'}</Button>
        <FormStatus state={state} />
      </div>

      <p className="text-xs text-muted">
        Una transferencia mueve el saldo de las dos cuentas, pero no cuenta como gasto ni
        como ingreso en los informes.
      </p>
    </form>
  )
}
