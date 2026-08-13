'use server'

/**
 * Mutaciones de cuentas.
 *
 * 'use server' convierte TODOS los exports de este fichero en endpoints POST
 * públicos: aquí solo hay acciones, nada de helpers ni lecturas.
 *
 * Cada acción, en este orden: autenticar → validar → autorizar → mutar.
 * → skill `server-action-safety`
 */

import { revalidatePath } from 'next/cache'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { accounts, transactions } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { parseMoney } from '@/lib/format'
import { fail, field, invalid, NOT_FOUND, ok, type ActionState } from '@/lib/forms'
import { CreateAccount, UpdateAccount } from './schema'

const revalidateAccounts = () => {
  revalidatePath('/cuentas')
  revalidatePath('/')
}

export async function createAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const currency = field(formData, 'currency')
  const openingText = field(formData, 'openingBalance')
  const opening = openingText === '' ? { amount: 0 } : parseMoney(openingText)
  if (!opening) return invalid({ openingBalance: ['Importe no válido'] })

  const parsed = CreateAccount.safeParse({
    name: field(formData, 'name'),
    type: field(formData, 'type'),
    currency,
    openingBalance: opening.amount,
  })
  if (!parsed.success) return invalid(z.flattenError(parsed.error).fieldErrors)

  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    // El userId sale de la sesión, jamás del formulario.
    userId: session.user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    currency: parsed.data.currency,
    openingBalance: parsed.data.openingBalance,
    createdAt: new Date(),
  })

  revalidateAccounts()
  return ok('Cuenta creada')
}

export async function updateAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const openingText = field(formData, 'openingBalance')
  const opening = openingText === '' ? { amount: 0 } : parseMoney(openingText)
  if (!opening) return invalid({ openingBalance: ['Importe no válido'] })

  const parsed = UpdateAccount.safeParse({
    id: field(formData, 'id'),
    name: field(formData, 'name'),
    type: field(formData, 'type'),
    openingBalance: opening.amount,
  })
  if (!parsed.success) return invalid(z.flattenError(parsed.error).fieldErrors)

  const updated = await db
    .update(accounts)
    .set({
      name: parsed.data.name,
      type: parsed.data.type,
      openingBalance: parsed.data.openingBalance,
    })
    // La propiedad se comprueba en el WHERE: no hay forma de tocar lo ajeno.
    .where(and(eq(accounts.id, parsed.data.id), eq(accounts.userId, session.user.id)))
    .returning({ id: accounts.id })

  if (updated.length === 0) return fail(NOT_FOUND)

  revalidateAccounts()
  revalidatePath(`/cuentas/${parsed.data.id}`)
  return ok('Cuenta actualizada')
}

export async function archiveAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const id = field(formData, 'id')
  if (!id) return fail(NOT_FOUND)

  const archived = await db
    .update(accounts)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(accounts.id, id),
        eq(accounts.userId, session.user.id),
        isNull(accounts.archivedAt),
      ),
    )
    .returning({ id: accounts.id })

  if (archived.length === 0) return fail(NOT_FOUND)

  revalidateAccounts()
  return ok('Cuenta archivada')
}

export async function unarchiveAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const id = field(formData, 'id')
  if (!id) return fail(NOT_FOUND)

  const restored = await db
    .update(accounts)
    .set({ archivedAt: null })
    .where(and(eq(accounts.id, id), eq(accounts.userId, session.user.id)))
    .returning({ id: accounts.id })

  if (restored.length === 0) return fail(NOT_FOUND)

  revalidateAccounts()
  return ok('Cuenta restaurada')
}

/**
 * Borrado real, solo para cuentas sin movimientos. Con movimientos se archiva:
 * borrar arrastraría el histórico y dejaría los totales de meses pasados mal.
 */
export async function deleteAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession()
  if (!session) return fail('No autorizado')

  const id = field(formData, 'id')
  if (!id) return fail(NOT_FOUND)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(eq(transactions.accountId, id), eq(transactions.userId, session.user.id)))

  if (count > 0) {
    return fail('La cuenta tiene movimientos. Archívala en lugar de borrarla.')
  }

  const deleted = await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, session.user.id)))
    .returning({ id: accounts.id })

  if (deleted.length === 0) return fail(NOT_FOUND)

  revalidateAccounts()
  return ok('Cuenta eliminada')
}
