'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { idleState, type ActionState } from '@/lib/forms'
import { Button, Field, FormStatus, Input, Select, Textarea } from '@/components/ui'
import type { Direction } from '../schema'

export type AccountOption = { id: string; name: string; currency: string }
export type CategoryOption = { id: string; name: string; kind: string; icon: string | null }

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  accounts: AccountOption[]
  categories: CategoryOption[]
  today: string
  transaction?: {
    id: string
    accountId: string
    categoryId: string | null
    /** Magnitud sin signo, ya formateada para el input. */
    amount: string
    direction: Direction
    date: string
    description: string
    notes: string | null
  }
  submitLabel: string
}

export function TransactionForm({
  action,
  accounts,
  categories,
  today,
  transaction,
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, idleState)
  const [direction, setDirection] = useState<Direction>(transaction?.direction ?? 'expense')
  const formRef = useRef<HTMLFormElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)

  // useId es estable entre servidor y cliente: la primera clave no provoca
  // discrepancia de hidratación.
  const baseKey = useId()

  useEffect(() => {
    if (state.status !== 'success' || transaction) return
    formRef.current?.reset()
    // reset() devuelve el campo oculto a su defaultValue. La clave tiene que ser
    // otra o el siguiente movimiento legítimo chocaría contra el índice único y
    // se tomaría por un duplicado. Se toca el DOM, no el estado de React: un
    // setState aquí encadenaría renders sin necesidad.
    if (keyRef.current) keyRef.current.value = crypto.randomUUID()
    // El sentido elegido se mantiene a propósito: quien anota tres gastos
    // seguidos no quiere volver a marcarlo cada vez.
  }, [state, transaction])

  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}
  // Una categoría es de ingreso o de gasto: el selector solo ofrece las que
  // encajan con el sentido elegido.
  const visibleCategories = categories.filter((c) =>
    direction === 'expense' ? c.kind === 'expense' : c.kind === 'income',
  )

  return (
    <form ref={formRef} action={formAction} className="flex max-w-md flex-col gap-4">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      {!transaction && (
        <input ref={keyRef} type="hidden" name="idempotencyKey" defaultValue={baseKey} />
      )}

      <fieldset className="flex gap-2">
        <legend className="mb-1.5 text-sm font-medium">Tipo</legend>
        {(['expense', 'income'] as const).map((value) => (
          <label
            key={value}
            className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm ${
              direction === value ? 'border-accent font-medium' : 'border-border text-muted'
            }`}
          >
            <input
              type="radio"
              name="direction"
              value={value}
              checked={direction === value}
              onChange={() => setDirection(value)}
              className="sr-only"
            />
            {value === 'expense' ? 'Gasto' : 'Ingreso'}
          </label>
        ))}
      </fieldset>

      <Field
        label="Importe"
        htmlFor="amount"
        errors={errors.amount}
        hint={direction === 'expense' ? 'Se registrará como salida' : 'Se registrará como entrada'}
      >
        <Input
          id="amount"
          name="amount"
          inputMode="decimal"
          required
          defaultValue={transaction?.amount}
          placeholder="45,90"
        />
      </Field>

      <Field label="Fecha" htmlFor="date" errors={errors.date}>
        {/* type="date" devuelve exactamente 'YYYY-MM-DD': la fecha civil que
            guarda la base de datos, sin hora ni huso por medio. */}
        <Input id="date" name="date" type="date" required defaultValue={transaction?.date ?? today} />
      </Field>

      <Field label="Cuenta" htmlFor="accountId" errors={errors.accountId}>
        <Select id="accountId" name="accountId" defaultValue={transaction?.accountId} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Categoría" htmlFor="categoryId" errors={errors.categoryId}>
        <Select id="categoryId" name="categoryId" defaultValue={transaction?.categoryId ?? ''}>
          <option value="">Sin categoría</option>
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ${c.name}` : c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Descripción" htmlFor="description" errors={errors.description}>
        <Input
          id="description"
          name="description"
          required
          maxLength={200}
          defaultValue={transaction?.description}
          placeholder="Compra semanal"
        />
      </Field>

      <Field label="Notas" htmlFor="notes" errors={errors.notes}>
        <Textarea id="notes" name="notes" maxLength={1000} defaultValue={transaction?.notes ?? ''} />
      </Field>

      <div className="flex items-center gap-3">
        <Button disabled={isPending}>{isPending ? 'Guardando…' : submitLabel}</Button>
        <FormStatus state={state} />
      </div>
    </form>
  )
}
