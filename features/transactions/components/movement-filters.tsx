'use client'

// Cliente porque escribe en la URL al cambiar un filtro. Los datos siguen
// viniendo del servidor: esto solo navega.

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { Input, Select } from '@/components/ui'

type Option = { id: string; name: string }

export function MovementFilters({
  period,
  accounts,
  categories,
  search,
  accountId,
  categoryId,
}: {
  period: string
  accounts: Option[]
  categories: Option[]
  search: string
  accountId: string
  categoryId: string
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    // Al cambiar un filtro se vuelve a la primera página: si no, se queda en
    // una página que puede no existir con el nuevo filtro.
    next.delete('pagina')
    startTransition(() => router.push(`/movimientos?${next.toString()}`))
  }

  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy={isPending}
    >
      <label className="flex flex-col gap-1 text-xs text-muted">
        Mes
        <Input
          type="month"
          value={period}
          onChange={(e) => setParam('periodo', e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted">
        Cuenta
        <Select value={accountId} onChange={(e) => setParam('cuenta', e.target.value)}>
          <option value="">Todas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted">
        Categoría
        <Select value={categoryId} onChange={(e) => setParam('categoria', e.target.value)}>
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted">
        Buscar
        <Input
          type="search"
          defaultValue={search}
          placeholder="Concepto…"
          onBlur={(e) => setParam('q', e.target.value)}
        />
      </label>
    </div>
  )
}
