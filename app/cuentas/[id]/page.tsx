import { notFound } from 'next/navigation'
import { requireUserId } from '@/lib/auth'
import { formatAmountForInput } from '@/lib/format'
import { Card, CardTitle, PageHeader, Stat, MoneyText } from '@/components/ui'
import { getAccount } from '@/features/accounts/queries'
import { updateAccount } from '@/features/accounts/actions'
import { AccountForm } from '@/features/accounts/components/account-form'
import { ACCOUNT_TYPE_LABELS } from '@/features/accounts/schema'
import { listTransactions } from '@/features/transactions/queries'
import { TransactionTable } from '@/features/transactions/components/transaction-table'

export default async function CuentaPage({ params }: PageProps<'/cuentas/[id]'>) {
  // params es una promesa en Next 16. Sin el await, `id` sale undefined y la
  // consulta devuelve vacío sin quejarse.
  const { id } = await params
  const userId = await requireUserId()

  const account = await getAccount(userId, id)
  if (!account) notFound()

  const movimientos = await listTransactions(userId, { accountId: id, limit: 50 })

  return (
    <>
      <PageHeader
        title={account.name}
        description={`${ACCOUNT_TYPE_LABELS[account.type]} · ${account.balance.currency}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Saldo actual">
              <MoneyText value={account.balance} colored />
            </Stat>
            <Stat label="Saldo de apertura" hint="El que tenía al darla de alta">
              <MoneyText value={account.openingBalance} />
            </Stat>
          </div>

          <Card>
            <CardTitle>Últimos movimientos</CardTitle>
            <div className="mt-4">
              <TransactionTable transactions={movimientos} showAccount={false} />
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <CardTitle>Editar cuenta</CardTitle>
          <div className="mt-4">
            <AccountForm
              action={updateAccount}
              submitLabel="Guardar cambios"
              // Solo los campos que se pintan: lo que se pasa a un componente
              // cliente viaja al navegador dentro del HTML.
              account={{
                id: account.id,
                name: account.name,
                type: account.type,
                currency: account.balance.currency,
                openingBalance: formatAmountForInput(account.openingBalance),
              }}
            />
          </div>
        </Card>
      </div>
    </>
  )
}
