import { z } from 'zod'
import { isCivilDate } from '@/lib/dates'

/**
 * En el formulario el importe se escribe SIN signo y el sentido se elige aparte.
 * Pedirle a alguien que escriba "-45,90" para registrar una compra es pedirle
 * que se acuerde de una convención interna de la base de datos.
 */
export const DIRECTIONS = ['expense', 'income'] as const
export type Direction = (typeof DIRECTIONS)[number]

const civilDate = z
  .string()
  .refine(isCivilDate, 'Fecha no válida')

export const CreateTransaction = z.object({
  accountId: z.string().min(1, 'Elige una cuenta'),
  categoryId: z.string().min(1).nullable(),
  /** Céntimos con signo, ya resuelto a partir del importe y el sentido. */
  amount: z
    .number()
    .int()
    .refine((n) => n !== 0, 'El importe no puede ser cero'),
  date: civilDate,
  description: z.string().trim().min(1, 'Pon una descripción').max(200, 'Máximo 200 caracteres'),
  notes: z.string().trim().max(1000).nullable(),
  idempotencyKey: z.string().min(1).max(100).nullable(),
})

export const UpdateTransaction = CreateTransaction.omit({ idempotencyKey: true }).extend({
  id: z.string().min(1),
})

export const CreateTransfer = z
  .object({
    fromAccountId: z.string().min(1, 'Elige la cuenta de origen'),
    toAccountId: z.string().min(1, 'Elige la cuenta de destino'),
    /** Siempre positivo: el signo lo pone cada pata. */
    amount: z.number().int().positive('El importe debe ser mayor que cero'),
    date: civilDate,
    description: z.string().trim().min(1, 'Pon una descripción').max(200),
    notes: z.string().trim().max(1000).nullable(),
    idempotencyKey: z.string().min(1).max(100).nullable(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: 'El origen y el destino no pueden ser la misma cuenta',
    path: ['toAccountId'],
  })

export type CreateTransactionInput = z.infer<typeof CreateTransaction>
export type CreateTransferInput = z.infer<typeof CreateTransfer>
