import Link from 'next/link'
import { requireUserId } from '@/lib/auth'
import { formatMoney } from '@/lib/format'
import { sumByCurrency } from '@/lib/money'
import { Card, CardTitle, EmptyState, MoneyText, PageHeader } from '@/components/ui'
import { ActionButton } from '@/components/ui/action-button'
import { listAccounts } from '@/features/accounts/queries'
import { createAccount, archiveAccount, unarchiveAccount, deleteAccount } from '@/features/accounts/actions'
import { AccountForm } from '@/features/accounts/components/account-form'
import { ACCOUNT_TYPE_LABELS } from '@/features/accounts/schema'
import type { AccountType } from '@/db/schema'

export default async function CuentasPage() {
  const userId = await requireUserId()
  const all = await listAccounts(userId, { includeArchived: true })
  const activas = all.filter((a) => !a.archived)
  const archivadas = all.filter((a) => a.archived)
  const total = sumByCurrency(activas.map((a) => a.balance))

  return (
    <>
      <PageHeader
        title="Cuentas"
        description="Cada cuenta lleva su divisa; los saldos se calculan desde los movimientos."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {activas.length === 0 ? (
            <EmptyState title="Aún no tienes cuentas">
              Crea la primera con el formulario de la derecha.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {activas.map((account) => (
                <li key={account.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <Link
                        href={`/cuentas/${account.id}`}
                        className="font-medium hover:underline"
                      >
                        {account.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {ACCOUNT_TYPE_LABELS[account.type as AccountType]} ·{' '}
                        {account.balance.currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <MoneyText value={account.balance} colored className="text-lg font-medium" />
                      <ActionButton
                        action={archiveAccount}
                        fields={{ id: account.id }}
                        confirm="¿Archivar la cuenta? Sus movimientos se conservan."
                      >
                        Archivar
                      </ActionButton>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {total.length > 0 && (
            <Card>
              <CardTitle>Total en cuentas activas</CardTitle>
              <div className="mt-2 flex flex-wrap gap-6">
                {total.map((m) => (
                  <p key={m.currency} className="text-xl font-semibold tabular">
                    {formatMoney(m)}
                  </p>
                ))}
              </div>
            </Card>
          )}

          {archivadas.length > 0 && (
            <Card>
              <CardTitle>Archivadas</CardTitle>
              <ul className="mt-3 flex flex-col gap-2">
                {archivadas.map((account) => (
                  <li key={account.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted">{account.name}</span>
                    <div className="flex items-center gap-3">
                      <MoneyText value={account.balance} className="text-muted" />
                      <ActionButton action={unarchiveAccount} fields={{ id: account.id }}>
                        Restaurar
                      </ActionButton>
                      <ActionButton
                        action={deleteAccount}
                        fields={{ id: account.id }}
                        variant="danger"
                        confirm="¿Eliminar la cuenta definitivamente?"
                      >
                        Eliminar
                      </ActionButton>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardTitle>Nueva cuenta</CardTitle>
          <div className="mt-4">
            <AccountForm action={createAccount} submitLabel="Crear cuenta" />
          </div>
        </Card>
      </div>
    </>
  )
}
