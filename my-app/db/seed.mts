/**
 * Catálogo de categorías por defecto.  `pnpm db:seed`
 *
 * Idempotente: si el usuario ya tiene categorías, no toca nada. No se puede
 * delegar en ON CONFLICT porque el UNIQUE incluye `parent_id`, y SQLite trata
 * dos NULL como valores distintos: las categorías raíz no chocarían nunca.
 */

import { eq } from 'drizzle-orm'
import { createDb, createDbClient } from './client.ts'
import { categories } from './schema.ts'
import { LOCAL_USER_ID } from '../lib/auth.ts'

const DEFAULTS: ReadonlyArray<{ name: string; kind: 'income' | 'expense'; icon: string }> = [
  { name: 'Alimentación', kind: 'expense', icon: '🛒' },
  { name: 'Hogar', kind: 'expense', icon: '🏠' },
  { name: 'Suministros', kind: 'expense', icon: '💡' },
  { name: 'Transporte', kind: 'expense', icon: '🚗' },
  { name: 'Salud', kind: 'expense', icon: '💊' },
  { name: 'Ocio', kind: 'expense', icon: '🎬' },
  { name: 'Restaurantes', kind: 'expense', icon: '🍽️' },
  { name: 'Compras', kind: 'expense', icon: '🛍️' },
  { name: 'Educación', kind: 'expense', icon: '📚' },
  { name: 'Suscripciones', kind: 'expense', icon: '📺' },
  { name: 'Impuestos', kind: 'expense', icon: '🏛️' },
  { name: 'Otros gastos', kind: 'expense', icon: '📦' },
  { name: 'Nómina', kind: 'income', icon: '💼' },
  { name: 'Trabajo por cuenta propia', kind: 'income', icon: '🧾' },
  { name: 'Intereses', kind: 'income', icon: '🏦' },
  { name: 'Reembolsos', kind: 'income', icon: '↩️' },
  { name: 'Otros ingresos', kind: 'income', icon: '➕' },
]

const client = createDbClient()
const db = createDb(client)

const existing = await db
  .select({ id: categories.id })
  .from(categories)
  .where(eq(categories.userId, LOCAL_USER_ID))
  .limit(1)

if (existing.length > 0) {
  console.log('El catálogo de categorías ya existe; no se toca nada.')
} else {
  const now = new Date()
  await db.insert(categories).values(
    DEFAULTS.map((c) => ({
      id: crypto.randomUUID(),
      userId: LOCAL_USER_ID,
      name: c.name,
      parentId: null,
      kind: c.kind,
      icon: c.icon,
      color: null,
      createdAt: now,
    })),
  )
  console.log(`${DEFAULTS.length} categorías creadas.`)
}

client.close()
