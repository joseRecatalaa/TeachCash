/**
 * Repositorio de Categorías.
 *
 * SOLO SERVIDOR. Ver la nota de `cuentas.repository.ts`.
 */

import { and, asc, desc, eq, isNull, like, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { categories, transactions, CATEGORY_KINDS } from '@/db/schema'
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
  /** Cadena vacía = raíz. La traducción a NULL de base se hace más abajo. */
  padreId: z.string(),
  icono: z.string().trim().max(8, 'Máximo 8 caracteres'),
})

/** El tipo NO se puede cambiar: los movimientos ya clasificados dependen de él. */
const CategoriaUpdate = CategoriaSave.omit({ tipo: true })

/** `''` en el DTO ↔ `null` en la base. Un solo sitio donde se traduce. */
const toDbParent = (padreId: string): string | null => padreId || null

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
      // 'root' y no '' porque un filtro vacío es "sin filtrar", no "las raíz".
      params.filters?.padreId === 'root' ? isNull(categories.parentId) : undefined,
    )

    const column = SORTABLE[params.sortBy as keyof typeof SORTABLE] ?? categories.name
    const order = params.sortDir === 'desc' ? desc(column) : asc(column)

    const rows = await db
      .select({
        id: categories.id,
        nombre: categories.name,
        tipo: categories.kind,
        padreId: categories.parentId,
        icono: categories.icon,
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
    // El nombre del padre sale del propio conjunto ya cargado: la jerarquía es
    // de un solo nivel y son decenas de filas, no un árbol que haya que recorrer.
    const nombrePorId = new Map(rows.map((r) => [r.id, r.nombre]))

    const data = rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      padreId: r.padreId ?? '',
      padreNombre: r.padreId ? (nombrePorId.get(r.padreId) ?? null) : null,
      icono: r.icono,
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
        padreId: categories.parentId,
        icono: categories.icon,
      })
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .limit(1)

    const r = rows[0]
    if (!r) return null
    return { id: r.id, nombre: r.nombre, tipo: r.tipo, padreId: r.padreId ?? '', icono: r.icono ?? '' }
  },

  async create(userId: string, values: unknown): Promise<{ id: string }> {
    const parsed = CategoriaSave.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const padreId = toDbParent(parsed.data.padreId)
    await assertPadreValido(userId, padreId, parsed.data.tipo)
    await assertNombreLibre(userId, parsed.data.nombre, padreId, null)

    const id = crypto.randomUUID()
    await db.insert(categories).values({
      id,
      userId,
      name: parsed.data.nombre,
      kind: parsed.data.tipo,
      parentId: padreId,
      icon: parsed.data.icono || null,
      createdAt: new Date(),
    })
    return { id }
  },

  async update(userId: string, id: string, values: unknown): Promise<{ id: string }> {
    const parsed = CategoriaUpdate.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const actual = await this.get(userId, id)
    if (!actual) throw new RepositoryError(NOT_FOUND)

    const padreId = toDbParent(parsed.data.padreId)
    if (padreId === id) {
      throw new RepositoryError('Una categoría no puede ser su propia padre', {
        padreId: 'Elige otra categoría',
      })
    }
    await assertPadreValido(userId, padreId, actual.tipo)
    await assertNombreLibre(userId, parsed.data.nombre, padreId, id)

    const updated = await db
      .update(categories)
      .set({
        name: parsed.data.nombre,
        parentId: padreId,
        icon: parsed.data.icono || null,
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

    const [{ count: hijas }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories)
      .where(and(eq(categories.parentId, id), eq(categories.userId, userId)))

    if (hijas > 0) {
      throw new RepositoryError('La categoría tiene subcategorías. Bórralas o muévelas primero.')
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
// Reglas de dominio
// ─────────────────────────────────────────────────────────────────────────────

/** La jerarquía es de UN solo nivel y padre e hija comparten tipo. */
async function assertPadreValido(
  userId: string,
  padreId: string | null,
  tipo: string,
): Promise<void> {
  if (!padreId) return

  const rows = await db
    .select({ kind: categories.kind, parentId: categories.parentId })
    .from(categories)
    .where(and(eq(categories.id, padreId), eq(categories.userId, userId)))
    .limit(1)

  const padre = rows[0]
  if (!padre) throw new RepositoryError('La categoría padre no existe', { padreId: NOT_FOUND })
  if (padre.parentId !== null) {
    throw new RepositoryError('La jerarquía es de un solo nivel', {
      padreId: 'Esa categoría ya es una subcategoría',
    })
  }
  if (padre.kind !== tipo) {
    throw new RepositoryError('El padre debe ser del mismo tipo', {
      padreId: 'El tipo no coincide con el de la categoría',
    })
  }
}

/**
 * SQLite considera dos NULL como distintos, así que el UNIQUE del esquema NO
 * impide dos categorías raíz con el mismo nombre. Esa comprobación tiene que
 * hacerse aquí; no se puede delegar en la base.
 */
async function assertNombreLibre(
  userId: string,
  nombre: string,
  padreId: string | null,
  excluirId: string | null,
): Promise<void> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.name, nombre),
        padreId === null ? isNull(categories.parentId) : eq(categories.parentId, padreId),
      ),
    )

  if (rows.some((r) => r.id !== excluirId)) {
    throw new RepositoryError('Ya existe una categoría con ese nombre', {
      nombre: 'Ya existe una categoría con ese nombre en el mismo nivel',
    })
  }
}

/** Catálogo para los `<Select>` de categoría. Ordenado y con el tipo al lado. */
export async function listarCatalogoCategorias(
  userId: string,
): Promise<{ id: string; nombre: string; tipo: string; padreId: string | null }[]> {
  return db
    .select({
      id: categories.id,
      nombre: categories.name,
      tipo: categories.kind,
      padreId: categories.parentId,
    })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.name))
}
