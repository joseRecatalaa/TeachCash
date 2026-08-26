import { requireUserId } from '@/lib/auth'
import { currentPeriod, monthRange, today } from '@/lib/dates'
import { Card, CardTitle, EmptyState, PageHeader } from '@/components/ui'
import { listAccounts } from '@/features/accounts/queries'
import { listCategories } from '@/features/categories/queries'
import { countTransactions, listTransactions } from '@/features/transactions/queries'
import { createTransaction, createTransfer } from '@/features/transactions/actions'
import { TransactionForm } from '@/features/transactions/components/transaction-form'
import { TransferForm } from '@/features/transactions/components/transfer-form'
import { TransactionTable } from '@/features/transactions/components/transaction-table'
import { MovementFilters } from '@/features/transactions/components/movement-filters'

const PAGE_SIZE = 50

export default async function MovimientosPage({ searchParams }: PageProps<'/movimientos'>) {
  // searchParams también es una promesa en Next 16.
  const { periodo, cuenta, categoria, q, pagina } = await searchParams
  const userId = await requireUserId()

  const period = typeof periodo === 'string' && periodo ? periodo : currentPeriod()
  const range = monthRange(period)
  const page = Number(typeof pagina === 'string' ? pagina : '1') || 1

  const filters = {
    from: range.from,
    to: range.to,
    accountId: typeof cuenta === 'string' && cuenta ? cuenta : undefined,
    categoryId: typeof categoria === 'string' && categoria ? categoria : undefined,
    search: typeof q === 'string' && q ? q : undefined,
  }

  const [accounts, categories, movimientos, total] = await Promise.all([
    listAccounts(userId),
    listCategories(userId),
    listTransactions(userId, { ...filters, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countTransactions(userId, filters),
  ])

  const accountOptions = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.balance.currency,
  }))
  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    icon: c.icon,
  }))

  return (
    <>
      <PageHeader title="Movimientos" description={`${total} en el periodo seleccionado`} />

      {accounts.length === 0 ? (
        <EmptyState title="Necesitas una cuenta antes de anotar movimientos">
          Crea una en la sección Cuentas.
        </EmptyState>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <MovementFilters
              period={period}
              accounts={accountOptions}
              categories={categoryOptions}
              search={filters.search ?? ''}
              accountId={filters.accountId ?? ''}
              categoryId={filters.categoryId ?? ''}
            />

            <Card>
              <TransactionTable transactions={movimientos} />
              {total > PAGE_SIZE && (
                <p className="mt-4 text-xs text-muted">
                  Mostrando {movimientos.length} de {total}. Afina los filtros para ver el
                  resto.
                </p>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card className="h-fit">
              <CardTitle>Nuevo movimiento</CardTitle>
              <div className="mt-4">
                <TransactionForm
                  action={createTransaction}
                  accounts={accountOptions}
                  categories={categoryOptions}
                  today={today()}
                  submitLabel="Guardar movimiento"
                />
              </div>
            </Card>

            <Card className="h-fit">
              <CardTitle>Transferencia entre cuentas</CardTitle>
              <div className="mt-4">
                <TransferForm
                  action={createTransfer}
                  accounts={accountOptions}
                  today={today()}
                />
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
