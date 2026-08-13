import { z } from 'zod'
import { ACCOUNT_TYPES } from '@/db/schema'
import { CURRENCIES } from '@/lib/money'

export const ACCOUNT_TYPE_LABELS: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  checking: 'Cuenta corriente',
  savings: 'Ahorro',
  card: 'Tarjeta de crédito',
  cash: 'Efectivo',
  investment: 'Inversión',
}

export const CreateAccount = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(60, 'Máximo 60 caracteres'),
  type: z.enum(ACCOUNT_TYPES, { message: 'Tipo de cuenta no válido' }),
  currency: z.enum(CURRENCIES, { message: 'Divisa no válida' }),
  // Céntimos. Puede ser negativo: una tarjeta de crédito empieza en descubierto.
  openingBalance: z.number().int('El saldo inicial debe ser un importe válido'),
})

/** La divisa no se puede cambiar: los movimientos ya registrados están en ella. */
export const UpdateAccount = CreateAccount.omit({ currency: true }).extend({
  id: z.string().min(1),
})

export type CreateAccountInput = z.infer<typeof CreateAccount>
export type UpdateAccountInput = z.infer<typeof UpdateAccount>
