/**
 * Repositorio de Categorías.
 *
 * SOLO SERVIDOR: importa `@/db`, así que nunca se importa desde un componente
 * cliente. La frontera es `entity.actions.ts`.
 */

import { and, asc, desc, eq, isNull, like, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { categories, transactions, CATEGORY_KINDS } from '@/db/schema'
import { CLAVES_COLOR } from '@/lib/colores'
import type { CategoriaFormDto, CategoriaListDto } from '@/src/types/categoria.types'
import {
  fromFieldErrors,
  NOT_FOUND,
  RepositoryError,
  type EntityRepository,
  type ListParams,
  type ListResult,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Validación
// ─────────────────────────────────────────────────────────────────────────────

const CategoriaSave = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(40, 'Máximo 40 caracteres'),
  // Una categoría es de ingreso o de gasto, nunca las dos: es lo que permite
  // filtrar el selector de categorías según el sentido del movimiento.
  tipo: z.enum(CATEGORY_KINDS, { message: 'Tipo no válido' }),
  icono: z.string().trim().max(8, 'Máximo 8 caracteres'),
  // Se guarda la CLAVE de la paleta, no el color. Ver `lib/colores.ts`: si
  // mañana se ajusta un tono, las categorías ya guardadas lo heredan solas.
  // Cadena vacía = sin color asignado, que es válido.
  color: z.union([z.literal(''), z.enum(CLAVES_COLOR)], { message: 'Color no válido' }),
  // Obligatorio en gasto, ignorado en ingreso: lo comprueba
  // `assertPresupuestoValido`, no este esquema, porque en `update` el tipo no
  // viaja en el payload (es inmutable) y hay que mirar el de la fila actual.
  presupuesto: z.number().int('Importe no válido').nonnegative('El importe no puede ser negativo').nullable(),
})

/** El tipo NO se puede cambiar: los movimientos ya clasificados dependen de él. */
const CategoriaUpdate = CategoriaSave.omit({ tipo: true })

/**
 * El presupuesto mensual es obligatorio en una categoría de gasto: es lo que
 * hace que Planificación mensual no tenga que distinguir "sin planificar" de
 * "planificado a cero". En ingreso se ignora siempre, aunque llegue uno.
 */
function assertPresupuestoValido(tipo: string, presupuesto: number | null): void {
  if (tipo === 'expense' && (presupuesto === null || presupuesto <= 0)) {
    throw new RepositoryError(
      'El presupuesto mensual es obligatorio para una categoría de gasto',
      { presupuesto: 'Indica cuánto planeas gastar al mes' },
    )
  }
}

/**
 * Ya existe una categoría con ese nombre para este usuario.
 *
 * Sin jerarquía, el nombre es único por usuario y punto: no hace falta
 * comprobar "en el mismo nivel", así que el UNIQUE del esquema
 * (`categories_user_name`) sí puede imponerlo, pero se comprueba aquí primero
 * para devolver un error de campo legible en vez de una excepción de SQLite.
 */
async function assertNombreLibre(
  userId: string,
  nombre: string,
  excluirId: string | null,
): Promise<void> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.name, nombre)))

  if (rows.some((r) => r.id !== excluirId)) {
    throw new RepositoryError('Ya existe una categoría con ese nombre', {
      nombre: 'Ya existe una categoría con ese nombre',
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────────────────────

const SORTABLE = {
  nombre: categories.name,
  tipo: categories.kind,
} as const

export const categoriasRepository: EntityRepository<CategoriaListDto, CategoriaFormDto> = {
  async list(userId: string, params: ListParams): Promise<ListResult<CategoriaListDto>> {
    const search = params.search?.trim()

    const where = and(
      eq(categories.userId, userId),
      search ? like(categories.name, `%${search}%`) : undefined,
      params.filters?.tipo ? eq(categories.kind, String(params.filters.tipo)) : undefined,
      params.filters?.oculta !== undefined
        ? eq(categories.hidden, String(params.filters.oculta) === 'true')
        : undefined,
    )

    const column = SORTABLE[params.sortBy as keyof typeof SORTABLE] ?? categories.name
    const order = params.sortDir === 'desc' ? desc(column) : asc(column)

    const rows = await db
      .select({
        id: categories.id,
        nombre: categories.name,
        tipo: categories.kind,
        icono: categories.icon,
        color: categories.color,
        presupuesto: categories.monthlyBudget,
        oculta: categories.hidden,
      })
      .from(categories)
      .where(where)
      .orderBy(order)

    // Los usos se cuentan de una sola pasada, no una consulta por fila.
    const usos = await db
      .select({ categoryId: transactions.categoryId, total: sql<number>`count(*)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .groupBy(transactions.categoryId)

    const usosPorCategoria = new Map(usos.map((u) => [u.categoryId, u.total]))

    const data = rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      icono: r.icono,
      color: r.color ?? '',
      presupuesto: r.presupuesto ?? null,
      oculta: r.oculta,
      usos: usosPorCategoria.get(r.id) ?? 0,
    }))

    const total = data.length
    if (params.paginate === false) return { data, total }

    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    return { data: data.slice((page - 1) * pageSize, page * pageSize), total }
  },

  async get(userId: string, id: string): Promise<CategoriaFormDto | null> {
    const rows = await db
      .select({
        id: categories.id,
        nombre: categories.name,
        tipo: categories.kind,
        icono: categories.icon,
        color: categories.color,
        presupuesto: categories.monthlyBudget,
      })
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .limit(1)

    const r = rows[0]
    if (!r) return null
    return {
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      icono: r.icono ?? '',
      color: r.color ?? '',
      presupuesto: r.presupuesto ?? null,
    }
  },

  async create(userId: string, values: unknown): Promise<{ id: string }> {
    const parsed = CategoriaSave.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    await assertNombreLibre(userId, parsed.data.nombre, null)
    assertPresupuestoValido(parsed.data.tipo, parsed.data.presupuesto)

    const id = crypto.randomUUID()
    await db.insert(categories).values({
      id,
      userId,
      name: parsed.data.nombre,
      kind: parsed.data.tipo,
      icon: parsed.data.icono || null,
      color: parsed.data.color || null,
      // Una categoría de ingreso nunca guarda presupuesto, aunque llegue uno.
      monthlyBudget: parsed.data.tipo === 'expense' ? parsed.data.presupuesto : null,
      hidden: false,
      createdAt: new Date(),
    })
    return { id }
  },

  async update(userId: string, id: string, values: unknown): Promise<{ id: string }> {
    const parsed = CategoriaUpdate.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const actual = await this.get(userId, id)
    if (!actual) throw new RepositoryError(NOT_FOUND)

    await assertNombreLibre(userId, parsed.data.nombre, id)
    assertPresupuestoValido(actual.tipo, parsed.data.presupuesto)

    const updated = await db
      .update(categories)
      .set({
        name: parsed.data.nombre,
        icon: parsed.data.icono || null,
        color: parsed.data.color || null,
        monthlyBudget: actual.tipo === 'expense' ? parsed.data.presupuesto : null,
      })
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning({ id: categories.id })

    if (updated.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },

  /**
   * No se borra una categoría en uso: los movimientos que la usan perderían su
   * clasificación y los informes de meses cerrados cambiarían solos.
   */
  async remove(userId: string, id: string): Promise<{ id: string }> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId)))

    if (count > 0) {
      throw new RepositoryError(
        `La categoría tiene ${count} movimiento(s). Reclasifícalos antes de borrarla.`,
      )
    }

    const deleted = await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning({ id: categories.id })

    if (deleted.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogos y operaciones fuera del CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Catálogo para los `<Select>` de categoría. Ordenado.
 *
 * Solo categorías VISIBLES: una oculta no debe poder elegirse en un
 * movimiento nuevo, aunque siga siendo un destino válido para los que ya la
 * usan (esos se leen por id, no por este catálogo).
 */
export async function listarCatalogoCategorias(
  userId: string,
): Promise<{ id: string; nombre: string; tipo: string; color: string | null }[]> {
  return db
    .select({
      id: categories.id,
      nombre: categories.name,
      tipo: categories.kind,
      color: categories.color,
    })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.hidden, false)))
    .orderBy(asc(categories.name))
}

/**
 * Activa una categoría oculta (predefinida sin usar todavía, o una que el
 * propio usuario ocultó antes). Si es de gasto, el presupuesto tiene que
 * quedar fijado al terminar: se acepta el que llega, o si no se manda ninguno
 * se conserva el que ya tuviera de una activación anterior.
 */
export async function activarCategoria(
  userId: string,
  id: string,
  presupuesto?: number | null,
): Promise<{ id: string }> {
  const actual = await categoriasRepository.get(userId, id)
  if (!actual) throw new RepositoryError(NOT_FOUND)

  const nuevoPresupuesto =
    actual.tipo === 'expense' ? (presupuesto ?? actual.presupuesto) : null
  assertPresupuestoValido(actual.tipo, nuevoPresupuesto)

  const updated = await db
    .update(categories)
    .set({ hidden: false, monthlyBudget: nuevoPresupuesto })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning({ id: categories.id })

  if (updated.length === 0) throw new RepositoryError(NOT_FOUND)
  return { id }
}

/**
 * Oculta una categoría sin borrarla: deja de ofrecerse en los `<Select>` de
 * movimiento y en Planificación mensual, pero los movimientos que ya la usan
 * la conservan sin cambios.
 */
export async function ocultarCategoria(userId: string, id: string): Promise<{ id: string }> {
  const updated = await db
    .update(categories)
    .set({ hidden: true })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning({ id: categories.id })

  if (updated.length === 0) throw new RepositoryError(NOT_FOUND)
  return { id }
}
