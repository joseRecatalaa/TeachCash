'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { CATEGORY_KINDS } from '@/db/schema'
import { idleState, type ActionState } from '@/lib/forms'
import { Button, Field, FormStatus, Input, Select } from '@/components/ui'
import { CATEGORY_KIND_LABELS } from '../schema'

export type ParentOption = { id: string; name: string; kind: string }

export function CategoryForm({
  action,
  parents,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  parents: ParentOption[]
}) {
  const [state, formAction, isPending] = useActionState(action, idleState)
  const [kind, setKind] = useState<string>('expense')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    // Solo DOM: vaciar los campos tras guardar. El tipo elegido se mantiene,
    // que es lo cómodo si se están creando varias categorías de gasto seguidas.
    if (state.status === 'success') formRef.current?.reset()
  }, [state])

  const errors = state.status === 'error' ? (state.fieldErrors ?? {}) : {}
  // Una subcategoría de gasto no puede colgar de una categoría de ingresos.
  const visibleParents = parents.filter((p) => p.kind === kind)

  return (
    <form ref={formRef} action={formAction} className="flex max-w-md flex-col gap-4">
      <Field label="Nombre" htmlFor="cat-name" errors={errors.name}>
        <Input id="cat-name" name="name" required maxLength={40} placeholder="Farmacia" />
      </Field>

      <Field label="Tipo" htmlFor="cat-kind" errors={errors.kind}>
        <Select
          id="cat-kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {CATEGORY_KINDS.map((k) => (
            <option key={k} value={k}>
              {CATEGORY_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Depende de"
        htmlFor="cat-parent"
        errors={errors.parentId}
        hint="Solo se admite un nivel de subcategorías."
      >
        <Select id="cat-parent" name="parentId" defaultValue="">
          <option value="">Ninguna (categoría principal)</option>
          {visibleParents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Icono" htmlFor="cat-icon" errors={errors.icon}>
        <Input id="cat-icon" name="icon" maxLength={8} placeholder="💊" />
      </Field>

      <div className="flex items-center gap-3">
        <Button disabled={isPending}>{isPending ? 'Guardando…' : 'Crear categoría'}</Button>
        <FormStatus state={state} />
      </div>
    </form>
  )
}
