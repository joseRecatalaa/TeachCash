/**
 * Catálogo de categorías por defecto.  `pnpm db:seed`
 *
 * Idempotente: si el usuario ya tiene categorías, no toca nada.
 */

import { eq } from 'drizzle-orm'
import { createDb, createDbClient } from './client.ts'
import { categories } from './schema.ts'
import { LOCAL_USER_ID } from '../lib/auth.ts'
import type { ClaveColor } from '../lib/colores.ts'

/**
 * Cada categoría nace con un color, y no es adorno: es lo que hace que el
 * gráfico de gasto de la portada se lea sin tocar nada. Los colores se reparten
 * de forma que dos categorías CONSECUTIVAS nunca compartan tono — el gráfico
 * las ordena por importe, así que las vecinas en pantalla son impredecibles,
 * pero el reparto en zigzag evita el caso peor de dos iguales seguidas en la
 * lista de Categorías, que sí va alfabética.
 *
 * Se pueden cambiar uno a uno desde el formulario. Ver `lib/colores.ts`.
 */
const DEFAULTS: ReadonlyArray<{
  name: string
  kind: 'income' | 'expense'
  icon: string
  color: ClaveColor
}> = [
  { name: 'Alimentación', kind: 'expense', icon: '🛒', color: 'cat-3' },
  { name: 'Hogar', kind: 'expense', icon: '🏠', color: 'cat-1' },
  { name: 'Suministros', kind: 'expense', icon: '💡', color: 'cat-4' },
  { name: 'Transporte', kind: 'expense', icon: '🚗', color: 'cat-7' },
  { name: 'Salud', kind: 'expense', icon: '💊', color: 'cat-5' },
  { name: 'Ocio', kind: 'expense', icon: '🎬', color: 'cat-2' },
  { name: 'Restaurantes', kind: 'expense', icon: '🍽️', color: 'cat-8' },
  { name: 'Compras', kind: 'expense', icon: '🛍️', color: 'cat-6' },
  { name: 'Educación', kind: 'expense', icon: '📚', color: 'cat-1' },
  { name: 'Suscripciones', kind: 'expense', icon: '📺', color: 'cat-7' },
  { name: 'Impuestos', kind: 'expense', icon: '🏛️', color: 'cat-5' },
  { name: 'Otros gastos', kind: 'expense', icon: '📦', color: 'cat-2' },
  { name: 'Nómina', kind: 'income', icon: '💼', color: 'cat-6' },
  { name: 'Trabajo por cuenta propia', kind: 'income', icon: '🧾', color: 'cat-3' },
  { name: 'Intereses', kind: 'income', icon: '🏦', color: 'cat-1' },
  { name: 'Reembolsos', kind: 'income', icon: '↩️', color: 'cat-4' },
  { name: 'Otros ingresos', kind: 'income', icon: '➕', color: 'cat-7' },
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
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      // Nacen ocultas: el usuario arranca sin categorías y las elige desde
      // «Nueva categoría» → «Elegir una predefinida», poniendo su presupuesto
      // si son de gasto.
      hidden: true,
      createdAt: now,
    })),
  )
  console.log(`${DEFAULTS.length} categorías creadas.`)
}

client.close()
