'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Input } from '@/components/ui'

export function PeriodPicker({ period }: { period: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      Mes
      <Input
        type="month"
        value={period}
        aria-busy={isPending}
        onChange={(e) =>
          startTransition(() => router.push(`/informes?periodo=${e.target.value}`))
        }
      />
    </label>
  )
}
