'use server'

/**
 * Mutaciones de movimientos y transferencias. Solo acciones en este fichero.
 */

import { revalidatePath } from 'next/cache'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { accounts, categories, transactions } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { parseMoney } from '@/lib/format'
import { fail, field, invalid, NOT_FOUND, ok, optionalField, type ActionState } from '@/lib/forms'
import { CreateTransaction, CreateTransfer, UpdateTransaction } from './schema'

const revalidateEverything = () => {
  // Un movimiento cambia saldos, informes y el patrimonio total a la vez.
  revalidatePath('/')
  revalidatePath('/movimientos')
  revalidatePath('/cuentas')
  revalidatePath('/informes')
}

/** Importe con signo a partir de lo escrito y del sentido elegido. */
function signedAmount(formData: FormData): number | null {
  const parsed = parseMoney(field(formData, 'amount'))
  if (!parsed) return null
  const direction = field(formData, 'direction')
  const magnitude = Math.abs(parsed.amount)
  return direction === 'income' ? magnitude : -magnitude
}

/** La cuenta tiene que ser de este usuario. Devuelve su divisa. */
async function ownedAccount(userId: string, accountId: string) {
  const rows = await db
    .select({ id: accounts.id, currency: accounts.currency })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

/** La categoría tiene que ser de este usuario y admitir el signo del importe. */
async function ownedCategory(userId: string, categoryId: string) {
  const rows = await db
    .select({ id: categories.id, kind: categories.kind })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function createTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')
  const userId = session.user.id

  const amount = signedAmount(formData)
  if (amount === null) return invalid({ amount: ['Importe no válido'] })

  const parsed = CreateTransaction.safeParse({
    accountId: field(formData, 'accountId'),
    categoryId: optionalField(formData, 'categoryId'),
    amount,
    date: field(formData, 'date'),
    description: field(formData, 'description'),
    notes: optionalField(formData, 'notes'),
    idempotencyKey: optionalField(formData, 'idempotencyKey'),
  })
  if (!parsed.success) return invalid(z.flattenError(parsed.error).fieldErrors)

  // Se comprueban TODOS los recursos referenciados, no solo la cuenta.
  const account = await ownedAccount(userId, parsed.data.accountId)
  if (!account) return invalid({ accountId: [NOT_FOUND] })

  if (parsed.data.categoryId) {
    const category = await ownedCategory(userId, parsed.data.categoryId)
    if (!category) return invalid({ categoryId: [NOT_FOUND] })
    const expectedKind = parsed.data.amount < 0 ? 'expense' : 'income'
    if (category.kind !== expectedKind) {
      return invalid({ categoryId: ['Esa categoría no corresponde al tipo de movimiento'] })
    }
  }

  // Idempotencia: el segundo envío del mismo formulario no crea dinero nuevo.
  if (parsed.data.idempotencyKey) {
    const existing = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.idempotencyKey, parsed.data.idempotencyKey),
        ),
      )
      .limit(1)
    if (existing.length > 0) return ok('Movimiento guardado')
  }

  await db.insert(transactions).values({
    id: crypto.randomUUID(),
    userId,
    accountId: parsed.data.accountId,
    categoryId: parsed.data.categoryId,
    amount: parsed.data.amount,
    date: parsed.data.date,
    description: parsed.data.description,
    notes: parsed.data.notes,
    idempotencyKey: parsed.data.idempotencyKey,
    createdAt: new Date(),
  })

  revalidateEverything()
  return ok('Movimiento guardado')
}

export async function updateTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')
  const userId = session.user.id

  const amount = signedAmount(formData)
  if (amount === null) return invalid({ amount: ['Importe no válido'] })

  const parsed = UpdateTransaction.safeParse({
    id: field(formData, 'id'),
    accountId: field(formData, 'accountId'),
    categoryId: optionalField(formData, 'categoryId'),
    amount,
    date: field(formData, 'date'),
    description: field(formData, 'description'),
    notes: optionalField(formData, 'notes'),
  })
  if (!parsed.success) return invalid(z.flattenError(parsed.error).fieldErrors)

  const current = await db
    .select({ id: transactions.id, transferId: transactions.transferId })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, parsed.data.id),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1)

  if (current.length === 0) return fail(NOT_FOUND)

  // Editar una sola pata descuadraría la transferencia: la otra seguiría con el
  // importe o la fecha antiguos y dejarían de sumar cero.
  if (current[0].transferId !== null) {
    return fail('Las transferencias no se editan: bórrala y créala de nuevo.')
  }

  const account = await ownedAccount(userId, parsed.data.accountId)
  if (!account) return invalid({ accountId: [NOT_FOUND] })

  if (parsed.data.categoryId) {
    const category = await ownedCategory(userId, parsed.data.categoryId)
    if (!category) return invalid({ categoryId: [NOT_FOUND] })
    const expectedKind = parsed.data.amount < 0 ? 'expense' : 'income'
    if (category.kind !== expectedKind) {
      return invalid({ categoryId: ['Esa categoría no corresponde al tipo de movimiento'] })
    }
  }

  await db
    .update(transactions)
    .set({
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId,
      amount: parsed.data.amount,
      date: parsed.data.date,
      description: parsed.data.description,
      notes: parsed.data.notes,
    })
    .where(and(eq(transactions.id, parsed.data.id), eq(transactions.userId, userId)))

  revalidateEverything()
  return ok('Movimiento actualizado')
}

/**
 * Borrado lógico. Si el movimiento es una pata de transferencia, se borran las
 * dos: dejar una viva sería dinero saliendo de una cuenta sin entrar en ninguna.
 */
export async function deleteTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')
  const userId = session.user.id

  const id = field(formData, 'id')
  if (!id) return fail(NOT_FOUND)

  const rows = await db
    .select({ id: transactions.id, transferId: transactions.transferId })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1)

  if (rows.length === 0) return fail(NOT_FOUND)

  const now = new Date()
  const target = rows[0].transferId
    ? and(eq(transactions.userId, userId), eq(transactions.transferId, rows[0].transferId))
    : and(eq(transactions.userId, userId), eq(transactions.id, id))

  await db.update(transactions).set({ deletedAt: now }).where(target)

  revalidateEverything()
  return ok(rows[0].transferId ? 'Transferencia eliminada' : 'Movimiento eliminado')
}

/** Deshace un borrado lógico. */
export async function restoreTransaction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const id = field(formData, 'id')
  if (!id) return fail(NOT_FOUND)

  const restored = await db
    .update(transactions)
    .set({ deletedAt: null })
    .where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)))
    .returning({ id: transactions.id, transferId: transactions.transferId })

  if (restored.length === 0) return fail(NOT_FOUND)

  // Si era una transferencia, la otra pata tiene que volver con ella.
  if (restored[0].transferId) {
    await db
      .update(transactions)
      .set({ deletedAt: null })
      .where(
        and(
          eq(transactions.userId, session.user.id),
          eq(transactions.transferId, restored[0].transferId),
        ),
      )
  }

  revalidateEverything()
  return ok('Movimiento restaurado')
}

/**
 * Transferencia entre cuentas propias: DOS movimientos con el mismo transferId,
 * negativo en origen y positivo en destino, escritos en una sola transacción.
 *
 * No es un gasto ni un ingreso. Sí mueve los dos saldos.
 */
export async function createTransfer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')
  const userId = session.user.id

  const parsedAmount = parseMoney(field(formData, 'amount'))
  if (!parsedAmount) return invalid({ amount: ['Importe no válido'] })

  const parsed = CreateTransfer.safeParse({
    fromAccountId: field(formData, 'fromAccountId'),
    toAccountId: field(formData, 'toAccountId'),
    amount: Math.abs(parsedAmount.amount),
    date: field(formData, 'date'),
    description: field(formData, 'description'),
    notes: optionalField(formData, 'notes'),
    idempotencyKey: optionalField(formData, 'idempotencyKey'),
  })
  if (!parsed.success) return invalid(z.flattenError(parsed.error).fieldErrors)

  // Una transferencia toca dos cuentas: se validan LAS DOS.
  const from = await ownedAccount(userId, parsed.data.fromAccountId)
  if (!from) return invalid({ fromAccountId: [NOT_FOUND] })
  const to = await ownedAccount(userId, parsed.data.toAccountId)
  if (!to) return invalid({ toAccountId: [NOT_FOUND] })

  // Con divisas distintas cada pata llevaría un importe distinto y haría falta
  // un tipo de cambio con su fecha. Fuera del alcance de la v1.
  if (from.currency !== to.currency) {
    return invalid({ toAccountId: ['Las dos cuentas deben estar en la misma divisa'] })
  }

  if (parsed.data.idempotencyKey) {
    const existing = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.idempotencyKey, parsed.data.idempotencyKey),
        ),
      )
      .limit(1)
    if (existing.length > 0) return ok('Transferencia guardada')
  }

  const transferId = crypto.randomUUID()
  const now = new Date()
  const base = {
    userId,
    date: parsed.data.date,
    description: parsed.data.description,
    notes: parsed.data.notes,
    transferId,
    categoryId: null,
    createdAt: now,
  }

  // Una transferencia a medias es dinero que desaparece. Las dos patas van en la
  // misma transacción o no va ninguna.
  await db.transaction(async (tx) => {
    await tx.insert(transactions).values([
      {
        ...base,
        id: crypto.randomUUID(),
        accountId: parsed.data.fromAccountId,
        amount: -parsed.data.amount,
        idempotencyKey: parsed.data.idempotencyKey,
      },
      {
        ...base,
        id: crypto.randomUUID(),
        accountId: parsed.data.toAccountId,
        amount: parsed.data.amount,
        // La clave de idempotencia es única por usuario: solo puede llevarla una
        // de las dos patas.
        idempotencyKey: null,
      },
    ])
  })

  revalidateEverything()
  return ok('Transferencia guardada')
}

/** Borra las dos patas de una transferencia a la vez. */
export async function deleteTransfer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const transferId = field(formData, 'transferId')
  if (!transferId) return fail(NOT_FOUND)

  const legs = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, session.user.id),
        eq(transactions.transferId, transferId),
        isNull(transactions.deletedAt),
      ),
    )

  if (legs.length === 0) return fail(NOT_FOUND)

  await db
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(transactions.userId, session.user.id),
        inArray(
          transactions.id,
          legs.map((l) => l.id),
        ),
      ),
    )

  revalidateEverything()
  return ok('Transferencia eliminada')
}
