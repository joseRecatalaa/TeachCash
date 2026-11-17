/**
 * Repositorio de Movimientos.
 *
 * SOLO SERVIDOR: importa `@/db`, así que no puede aparecer en un componente
 * cliente. La frontera es `entity.actions.ts`.
 *
 * Un movimiento es un gasto o un ingreso de la cuenta única de la aplicación.
 * No hay cuentas ni transferencias: el saldo es la suma de lo que hay aquí
 * dentro (regla dura 7 — los saldos son derivados y se calculan en
 * `informes.repository.ts`).
 */

import { and, asc, desc, eq, gte, ilike, lte, ne, sql, type SQL } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { db } from '@/db'
import { categories, transactions } from '@/db/schema'
import { compareDates, isCivilDate, latestToday } from '@/lib/dates'
import {
  ID_MAX,
  IMPORTE_MAXIMO,
  MAX_MOVIMIENTOS_CUENTA,
  MAX_MOVIMIENTOS_INVITADO,
  MAX_TEXTO_CUENTA,
  MAX_TEXTO_INVITADO,
} from '@/src/types/limites.types'
import type { MovimientoFormDto, MovimientoListDto } from '@/src/types/movimiento.types'
import { assertBaseConSitio } from './capacidad.repository'
import { esInvitado } from './cuenta.repository'
import { columnaDeOrden, patronContiene, trozo } from './listado'
import { esChoqueUnico } from './postgres-errors'
import { conCandado, type Transaccion } from './transaccion'
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
 * Una fecha civil que no sea futura.
 *
 * El tope es el "hoy" de la zona más adelantada del planeta, no el de Madrid:
 * el servidor no sabe dónde está nadie, y rechazar el "hoy" real de alguien
 * sería impedirle anotar lo que acaba de gastar. Se evalúa en cada validación,
 * no al cargar el módulo, porque el servidor no se reinicia a medianoche.
 */
const fechaCivil = z
  .string()
  .refine(isCivilDate, 'Fecha no válida')
  .refine((f) => compareDates(f, latestToday()) <= 0, 'La fecha no puede ser futura')

export const SENTIDOS = ['expense', 'income'] as const

const MovimientoSave = z.object({
  categoriaId: z.string().min(1, 'Elige una categoría').max(ID_MAX, 'Categoría no encontrada'),
  // Céntimos, SIN signo. El signo lo pone `sentido`. El tope es lo que cabe
  // en la columna (int4): sin él, Postgres lo rechaza con un error genérico.
  importe: z
    .number()
    .int('Importe no válido')
    .positive('El importe debe ser mayor que cero')
    .max(IMPORTE_MAXIMO, 'El importe máximo es de 10.000.000,00 €'),
  sentido: z.enum(SENTIDOS, { message: 'Elige ingreso o gasto' }),
  fecha: fechaCivil,
  descripcion: z
    .string()
    .trim()
    .min(1, 'Pon una descripción')
    .max(200, 'Máximo 200 caracteres'),
  notas: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
})

/**
 * El alta acepta además una clave de idempotencia.
 *
 * Es la clave del CLIENTE: se genera una por formulario abierto y convierte el
 * doble clic en un choque contra el índice único en lugar de en dos movimientos
 * iguales. En una aplicación de dinero eso no es una molestia, es dinero
 * inventado. La edición no la lleva: no tiene sentido "reeditar una sola vez".
 */
const MovimientoCreate = MovimientoSave.extend({
  idempotencyKey: z.string().min(1).max(100).optional(),
})

/** Céntimos con signo a partir del importe sin signo y el sentido. */
const conSigno = (importe: number, sentido: string): number =>
  sentido === 'expense' ? -importe : importe

// ─────────────────────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────────────────────

const SORTABLE = {
  fecha: transactions.date,
  descripcion: transactions.description,
  importe: transactions.amount,
} as const

/**
 * Una fecha de filtro, o `undefined` si no viene. Lo que no es `YYYY-MM-DD`
 * válido se rechaza AQUÍ: si llegara a SQL, Postgres lo rechazaría al
 * convertirlo, y eso sería un error genérico para el usuario y ruido en los
 * logs con el valor dentro.
 */
const fechaDeFiltro = (valor: unknown, campo: 'desde' | 'hasta'): string | undefined => {
  if (valor === undefined || valor === null || valor === '') return undefined
  const texto = String(valor)
  if (!isCivilDate(texto)) {
    throw new RepositoryError(`La fecha "${campo}" del filtro no es válida (AAAA-MM-DD)`)
  }
  return texto
}

const filtros = (userId: string, params: ListParams): SQL | undefined => {
  const f = params.filters ?? {}
  const search = params.search?.trim()
  const desde = fechaDeFiltro(f.desde, 'desde')
  const hasta = fechaDeFiltro(f.hasta, 'hasta')
  return and(
    // Primero, siempre: la consulta no puede devolver algo ajeno.
    eq(transactions.userId, userId),
    desde ? gte(transactions.date, desde) : undefined,
    hasta ? lte(transactions.date, hasta) : undefined,
    f.categoriaId ? eq(transactions.categoryId, String(f.categoriaId)) : undefined,
    // `ilike` y no `like`: en Postgres `like` distingue mayúsculas, y buscar
    // "merca" tiene que encontrar "Mercadona".
    search ? ilike(transactions.description, patronContiene(search)) : undefined,
  )
}

const SELECT_LIST = {
  id: transactions.id,
  fecha: transactions.date,
  descripcion: transactions.description,
  notas: transactions.notes,
  importe: transactions.amount,
  categoriaId: categories.id,
  categoriaNombre: categories.name,
  categoriaColor: categories.color,
} as const

export const movimientosRepository: EntityRepository<MovimientoListDto, MovimientoFormDto> = {
  async list(userId: string, params: ListParams): Promise<ListResult<MovimientoListDto>> {
    const where = filtros(userId, params)

    const column = columnaDeOrden<AnyPgColumn>(SORTABLE, params.sortBy, transactions.date)
    const dir = params.sortDir === 'asc' ? asc : desc
    // Desempate por id: sin él, dos movimientos del mismo día pueden bailar de
    // orden entre recargas y la paginación se salta filas.
    const order = [dir(column), desc(transactions.id)]

    const [{ total }] = await db
      // count(*) es bigint y el driver lo devuelve como TEXTO: sin mapWith,
      // `total` sería "12" y cualquier suma con él concatenaría cadenas.
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(transactions)
      .where(where)

    const query = db
      .select(SELECT_LIST)
      .from(transactions)
      // `innerJoin`: `category_id` es NOT NULL con clave ajena (ver informes).
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where)
      .orderBy(...order)

    // Aquí sí se pagina en SQL: los movimientos son la tabla que crece.
    const { limit, offset } = trozo(params)
    const rows = await query.limit(limit).offset(offset)

    return {
      data: rows.map((r) => ({
        id: r.id,
        fecha: r.fecha,
        descripcion: r.descripcion,
        importe: r.importe,
        categoriaId: r.categoriaId,
        categoriaNombre: r.categoriaNombre,
        categoriaColor: r.categoriaColor ?? '',
        notas: r.notas ?? '',
      })),
      total,
    }
  },

  async get(userId: string, id: string): Promise<MovimientoFormDto | null> {
    const rows = await db
      .select({
        id: transactions.id,
        fecha: transactions.date,
        descripcion: transactions.description,
        notas: transactions.notes,
        importe: transactions.amount,
        categoriaId: transactions.categoryId,
      })
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1)

    const r = rows[0]
    if (!r) return null
    return {
      id: r.id,
      fecha: r.fecha,
      descripcion: r.descripcion,
      notas: r.notas ?? '',
      // El formulario trabaja con magnitud + sentido; la base, con signo.
      importe: Math.abs(r.importe),
      sentido: r.importe < 0 ? 'expense' : 'income',
      categoriaId: r.categoriaId,
    }
  },

  async create(userId: string, values: unknown): Promise<{ id: string }> {
    const parsed = MovimientoCreate.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const d = parsed.data
    await assertCategoriaCompatible(userId, d.categoriaId, d.sentido)

    // Idempotencia: el segundo envío del mismo formulario NO crea dinero nuevo.
    // Devuelve el movimiento que ya existe, así que para quien llama es un éxito
    // — que es exactamente lo que fue: su movimiento está guardado.
    if (d.idempotencyKey) {
      const previo = await idPorClave(userId, d.idempotencyKey)
      if (previo) return { id: previo }
    }

    await assertBaseConSitio()

    try {
      // Contar y escribir con el candado del usuario: sin él, dos altas a la
      // vez cuentan las dos antes de que ninguna escriba, y las dos pasan.
      return await conCandado(userId, async (tx) => {
        await assertCuotaLibre(tx, userId, bytesDeTexto(d.descripcion, d.notas))
        // El id y la fecha de alta los pone la base.
        const [creado] = await tx
          .insert(transactions)
          .values({
            userId,
            categoryId: d.categoriaId,
            amount: conSigno(d.importe, d.sentido),
            date: d.fecha,
            description: d.descripcion,
            notes: d.notas || null,
            idempotencyKey: d.idempotencyKey ?? null,
          })
          .returning({ id: transactions.id })
        return { id: creado.id }
      })
    } catch (err) {
      // Dos envíos simultáneos pasan los dos la comprobación de arriba antes
      // de que ninguno inserte; el segundo choca con el UNIQUE. Tampoco es un
      // error: el movimiento está guardado, y es el del primero.
      if (d.idempotencyKey && esChoqueUnico(err, 'tx_idempotency_key')) {
        const ganador = await idPorClave(userId, d.idempotencyKey)
        if (ganador) return { id: ganador }
      }
      throw err
    }
  },

  async update(userId: string, id: string, values: unknown): Promise<{ id: string }> {
    const parsed = MovimientoSave.safeParse(values)
    if (!parsed.success) throw fromFieldErrors(z.flattenError(parsed.error).fieldErrors)

    const d = parsed.data
    await assertCategoriaCompatible(userId, d.categoriaId, d.sentido)

    const updated = await conCandado(userId, async (tx) => {
      await assertTextoLibreAlEditar(tx, userId, id, bytesDeTexto(d.descripcion, d.notas))
      return tx
        .update(transactions)
        .set({
          categoryId: d.categoriaId,
          amount: conSigno(d.importe, d.sentido),
          date: d.fecha,
          description: d.descripcion,
          notes: d.notas || null,
        })
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning({ id: transactions.id })
    })

    if (updated.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },

  /**
   * Borrado FÍSICO. No hay papelera: el modal de confirmación del formulario
   * es la única red, y por eso es obligatorio en toda la interfaz.
   */
  async remove(userId: string, id: string): Promise<{ id: string }> {
    const borrados = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id })

    if (borrados.length === 0) throw new RepositoryError(NOT_FOUND)
    return { id }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Reglas de dominio
// ─────────────────────────────────────────────────────────────────────────────

/** El movimiento que ya se guardó con esa clave de idempotencia, si lo hay. */
async function idPorClave(userId: string, clave: string): Promise<string | null> {
  const [previo] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.idempotencyKey, clave)))
    .limit(1)
  return previo?.id ?? null
}

/** Lo que ocupa el texto de un movimiento: bytes en UTF-8, como `octet_length`. */
const bytesDeTexto = (descripcion: string, notas: string): number =>
  Buffer.byteLength(descripcion, 'utf8') + Buffer.byteLength(notas, 'utf8')

/** Bytes de texto (descripción + notas) de las filas que se sumen. */
const textoGuardado = () =>
  sql<number>`coalesce(sum(octet_length(${transactions.description}) + coalesce(octet_length(${transactions.notes}), 0)), 0)`.mapWith(
    Number,
  )

const MENSAJE_TEXTO_INVITADO =
  'Has llegado al máximo de texto que puede guardar un invitado. Crea una cuenta para seguir anotando.'
const MENSAJE_TEXTO_CUENTA =
  'Has llegado al máximo de texto de una cuenta. Acorta descripciones o notas, o borra movimientos que ya no necesites.'

/**
 * Cuotas por usuario (`src/types/limites.types.ts`): cuántos movimientos y
 * cuánto texto. Se llama con el candado del usuario puesto (`conCandado`), así
 * que es exacta: dos altas a la vez no pasan de la cuota.
 */
async function assertCuotaLibre(tx: Transaccion, userId: string, bytesNuevos: number): Promise<void> {
  const [{ total, texto }] = await tx
    .select({ total: sql<number>`count(*)`.mapWith(Number), texto: textoGuardado() })
    .from(transactions)
    .where(eq(transactions.userId, userId))
  const invitado = await esInvitado(userId, tx)

  if (invitado && total >= MAX_MOVIMIENTOS_INVITADO) {
    throw new RepositoryError(
      `Has llegado al máximo de ${MAX_MOVIMIENTOS_INVITADO} movimientos como invitado. Crea una cuenta para seguir anotando.`,
    )
  }
  if (total >= MAX_MOVIMIENTOS_CUENTA) {
    throw new RepositoryError(
      `Has llegado al máximo de ${MAX_MOVIMIENTOS_CUENTA} movimientos de una cuenta.`,
    )
  }
  assertTextoCabe(invitado, texto + bytesNuevos)
}

/**
 * Al editar, cuenta el texto de los DEMÁS movimientos más el nuevo de este.
 * Quitar texto siempre se puede, aunque se esté por encima: si la cuota baja,
 * quien ya la pasaba tiene que poder recortar.
 */
async function assertTextoLibreAlEditar(
  tx: Transaccion,
  userId: string,
  id: string,
  bytesNuevos: number,
): Promise<void> {
  const [{ actual }] = await tx
    .select({ actual: textoGuardado() })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
  if (bytesNuevos <= actual) return

  const [{ resto }] = await tx
    .select({ resto: textoGuardado() })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), ne(transactions.id, id)))
  assertTextoCabe(await esInvitado(userId, tx), resto + bytesNuevos)
}

function assertTextoCabe(invitado: boolean, bytes: number): void {
  if (bytes > (invitado ? MAX_TEXTO_INVITADO : MAX_TEXTO_CUENTA)) {
    throw new RepositoryError(invitado ? MENSAJE_TEXTO_INVITADO : MENSAJE_TEXTO_CUENTA)
  }
}

/** Una categoría de gasto en un ingreso descoloca todos los informes. */
async function assertCategoriaCompatible(
  userId: string,
  categoriaId: string,
  sentido: string,
): Promise<void> {
  const rows = await db
    .select({ kind: categories.kind })
    .from(categories)
    .where(and(eq(categories.id, categoriaId), eq(categories.userId, userId)))
    .limit(1)

  const categoria = rows[0]
  if (!categoria) {
    throw new RepositoryError(NOT_FOUND, { categoriaId: 'Categoría no encontrada' })
  }
  if (categoria.kind !== sentido) {
    throw new RepositoryError('La categoría no corresponde al sentido del movimiento', {
      categoriaId: sentido === 'expense' ? 'Elige una categoría de gasto' : 'Elige una de ingreso',
    })
  }
}
