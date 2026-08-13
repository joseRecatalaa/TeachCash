/**
 * Tabla de movimientos. Server Component: los datos ya vienen agregados y solo
 * cruza al cliente el botón de borrar.
 */

import { EmptyState, MoneyText } from '@/components/ui'
import { ActionButton } from '@/components/ui/action-button'
import { formatDate } from '@/lib/format'
import { deleteTransaction } from '../actions'
import type { TransactionView } from '../queries'

export function TransactionTable({
  transactions,
  showAccount = true,
}: {
  transactions: TransactionView[]
  showAccount?: boolean
}) {
  if (transactions.length === 0) {
    return <EmptyState title="Todavía no hay movimientos aquí." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="py-2 pr-3 font-medium">Fecha</th>
            <th className="py-2 pr-3 font-medium">Concepto</th>
            <th className="py-2 pr-3 font-medium">Categoría</th>
            {showAccount && <th className="py-2 pr-3 font-medium">Cuenta</th>}
            <th className="py-2 pr-3 text-right font-medium">Importe</th>
            <th className="py-2 font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-border/60">
              <td className="py-2.5 pr-3 whitespace-nowrap tabular text-muted">
                {formatDate(tx.date)}
              </td>
              <td className="py-2.5 pr-3">
                {tx.description}
                {tx.transferId && (
                  <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs text-muted">
                    Transferencia
                  </span>
                )}
              </td>
              <td className="py-2.5 pr-3 text-muted">
                {tx.categoryName ? (
                  <>
                    {tx.categoryIcon && <span aria-hidden>{tx.categoryIcon} </span>}
                    {tx.categoryName}
                  </>
                ) : (
                  '—'
                )}
              </td>
              {showAccount && <td className="py-2.5 pr-3 text-muted">{tx.accountName}</td>}
              {/* El signo es la señal principal; el color solo la refuerza. */}
              <td className="py-2.5 pr-3 text-right">
                <MoneyText value={tx.amount} showSign colored />
              </td>
              <td className="py-2.5 text-right">
                <ActionButton
                  action={deleteTransaction}
                  fields={{ id: tx.id }}
                  variant="danger"
                  confirm={
                    tx.transferId
                      ? '¿Eliminar la transferencia? Se borrarán sus dos movimientos.'
                      : '¿Eliminar este movimiento?'
                  }
                >
                  Eliminar
                </ActionButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
