/**
 * Repositorio de Categorías.
 *
 * SOLO SERVIDOR: importa `@/db`, así que nunca se importa desde un componente
 * cliente. La frontera es `entity.actions.ts`.
 */

import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import { categories, transactions, CATEGORY_KINDS } from '@/db/schema'
import { CLAVES_COLOR, type ClaveColor } from '@/lib/colores'
import type { CategoriaFormDto, CategoriaListDto } from '@/src/types/categoria.types'
import { IMPORTE_MAXIMO, MAX_CATEGORIAS } from '@/src/types/limites.types'
import { columnaDeOrden, patronContiene, trozo } from './listado'
import { esChoqueUnico } from './postgres-errors'
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

/**
 * Un presupuesto mensual: céntimos enteros (regla dura 1), sin signo y que
 * quepan en la columna (int4). Es una función para que `activarCategoria`, que
 * no pasa por `CategoriaSave`, valide exactamente con la misma regla.
 */
const presupuestoSchema = () =>
  z
    .number('Importe no válido')
    .int('Importe no válido')
    .nonnegative('El importe no puede ser negativo')
    .max(IMPORTE_MAXIMO, 'El presupuesto máximo es de 10.000.000,00 €')

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
  presupuesto: presupuestoSchema().nullable(),
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
 * para devolver un error de campo legible en vez de una error de restricción de Postgres.
 */
/** El error de nombre repetido, lo detecte quien lo detecte. */
const nombreOcupado = () =>
  new RepositoryError('Ya existe una categoría con ese nombre', {
    nombre: 'Ya existe una categoría con ese nombre',
  })

/**
 * Traduce el choque con `categories_user_name` a su error de campo. Dos
 * peticiones simultáneas con el mismo nombre pasan las dos `assertNombreLibre`
 * antes de que ninguna escriba, y quien las para es el UNIQUE.
 */
async function conNombreUnico<T>(escribir: () => Promise<T>): Promise<T> {
  try {
    return await escribir()
  } catch (err) {
    if (esChoqueUnico(err, 'categories_user_name')) throw nombreOcupado()
    throw err
  }
}

/** Cuota de categorías por usuario. Contra el abuso; ver `limites.types.ts`. */
async function assertCuotaLibre(userId: string): Promise<void> {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(categories)
    .where(eq(categories.userId, userId))
  if (total >= MAX_CATEGORIAS) {
    throw new RepositoryError(
      `Has llegado al máximo de ${MAX_CATEGORIAS} categorías. Borra alguna que no uses para crear otra.`,
    )
  }
}

async function assertNombreLibre(
  userId: string,
  nombre: string,
  excluirId: string | null,
): Promise<void> {
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.name, nombre)))

  if (rows.some((r) => r.id !== excluirId)) throw nombreOcupado()
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
      search ? ilike(categories.name, patronContiene(search)) : undefined,
      params.filters?.tipo ? eq(categories.kind, String(params.filters.tipo)) : undefined,
      params.filters?.oculta !== undefined
        ? eq(categories.hidden, String(params.filters.oculta) === 'true')
        : undefined,
    )

    const column = columnaDeOrden<AnyPgColumn>(SORTABLE, params.sortBy, categories.name)
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
      .select({
        categoryId: transactions.categoryId,
        // bigint → texto en el driver. Ver movimientos.repository.ts.
        total: sql<number>`count(*)`.mapWith(Number),
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
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

    // Aquí se pagina en memoria: un usuario tiene decenas de categorías
    // (`MAX_CATEGORIAS` como mucho) y los usos ya se han traído enteros.
    const { limit, offset } = trozo(params)
    return { data: data.slice(offset, offset + limit), total: data.length }
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
    await assertCuotaLibre(userId)

    const [creada] = await conNombreUnico(() =>
      db
        .insert(categories)
        .values({
          userId,
          name: parsed.data.nombre,
          kind: parsed.data.tipo,
          icon: parsed.data.icono || null,
          color: parsed.data.color || null,
          // Una categoría de ingreso nunca guarda presupuesto, aunque llegue uno.
          monthlyBudget: parsed.data.tipo === 'expense' ? parsed.data.presupuesto : null,
          hidden: false,
        })
        .returning({ id: categories.id }),
    )
    return { id: creada.id }
  },

  async update(userId: string, id: string, values: unknown): Promise<{ id: string }> {
    const parsed = CategoriaUpdate.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const actual = await this.get(userId, id)
    if (!actual) throw new RepositoryError(NOT_FOUND)

    await assertNombreLibre(userId, parsed.data.nombre, id)
    assertPresupuestoValido(actual.tipo, parsed.data.presupuesto)

    const updated = await conNombreUnico(() =>
      db
        .update(categories)
        .set({
          name: parsed.data.nombre,
          icon: parsed.data.icono || null,
          color: parsed.data.color || null,
          monthlyBudget: actual.tipo === 'expense' ? parsed.data.presupuesto : null,
        })
        .where(and(eq(categories.id, id), eq(categories.userId, userId)))
        .returning({ id: categories.id }),
    )

    // Solo si otra petición la borra entre el `get` de arriba y este `update`.
    /* v8 ignore next */
    if (updated.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },

  /**
   * Borrar una categoría se propaga a sus movimientos: no hay estado
   * "sin clasificar" a donde reubicarlos (la categoría es obligatoria en un
   * movimiento) ni papelera donde archivarlos (el borrado es físico), así que
   * se borran con ella. En una transacción: sin los movimientos fuera de en
   * medio, el `delete` de la categoría chocaría contra su FK.
   */
  async remove(userId: string, id: string): Promise<{ id: string }> {
    return db.transaction(async (tx) => {
      await tx
        .delete(transactions)
        .where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId)))

      const deleted = await tx
        .delete(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)))
        .returning({ id: categories.id })

      if (deleted.length === 0) throw new RepositoryError(NOT_FOUND)
      return { id }
    })
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
  // No pasa por `CategoriaSave`, así que valida el presupuesto por su cuenta,
  // con la misma regla, antes de leer nada.
  if (presupuesto !== undefined && presupuesto !== null) {
    const valido = presupuestoSchema().safeParse(presupuesto)
    if (!valido.success) {
      throw fromFieldErrors({ presupuesto: valido.error.issues.map((i) => i.message) })
    }
  }

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

  // Solo si otra petición la borra entre el `get` de arriba y este `update`.
  /* v8 ignore next */
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

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo inicial
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Las categorías con las que nace todo usuario, invitado o no.
 *
 * Cada una trae un color, y no es adorno: es lo que hace que el gráfico de gasto
 * de la portada se lea sin tocar nada. Se reparten de forma que dos categorías
 * CONSECUTIVAS nunca compartan tono — el gráfico las ordena por importe, así que
 * las vecinas en pantalla son impredecibles, pero el reparto en zigzag evita el
 * caso peor de dos iguales seguidas en la lista de Categorías, que va alfabética.
 */
const CATALOGO_INICIAL: ReadonlyArray<{
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

/**
 * Da al usuario el catálogo de fábrica. Se llama al crear un invitado y al
 * confirmar una cuenta.
 *
 * Solo actúa si el usuario no tiene NINGUNA categoría: así no resucita una
 * predefinida que borró a mano. Y si dos peticiones llegan a la vez (dos
 * pestañas abriéndose), las dos pasan esa comprobación, insertan, y el UNIQUE
 * (user_id, name) descarta lo repetido en vez de duplicar el catálogo.
 *
 * Nacen ocultas: el usuario las activa desde «Nueva categoría» → «Elegir una
 * predefinida», poniendo su presupuesto si son de gasto.
 */
export async function asegurarCatalogoInicial(userId: string): Promise<void> {
  const alguna = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1)
  if (alguna.length > 0) return

  await db
    .insert(categories)
    .values(
      CATALOGO_INICIAL.map((c) => ({
        userId,
        name: c.name,
        kind: c.kind,
        icon: c.icon,
        color: c.color,
        hidden: true,
      })),
    )
    .onConflictDoNothing({ target: [categories.userId, categories.name] })
}
