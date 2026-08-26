/**
 * Contrato de repositorio.
 *
 * Un repositorio es el punto donde la aplicación deja de hablar de dominio y
 * empieza a hablar de almacenamiento. Es lo ÚNICO que toca `@/db`, y por eso es
 * lo único que no puede aparecer en un componente cliente.
 *
 * Las cinco operaciones son deliberadamente las cinco de un DataProvider de
 * Refine (getList / getOne / create / update / deleteOne), para que
 * `refine-data-provider.ts` sea una traducción mecánica y no tenga lógica propia.
 * Si una entidad necesita algo que no encaja en las cinco —archivar, restaurar,
 * transferir—, se escribe como función suelta en el mismo fichero y se le da su
 * propia Server Action y su propio hook.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * TODO repositorio recibe el `userId` como PRIMER argumento y lo mete DENTRO del
 * `where` de la consulta. No después, no en un `if` sobre el resultado.
 *   - Regla dura 4 (AGENTS.md): nunca confíes en un id que venga del cliente.
 *   - Un `getOne` que consulta por id y luego comprueba el dueño ya ha leído el
 *     dato ajeno; y la comprobación se pierde en el primer refactor.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Lo que la tabla pide al servidor. Réplica de lo que `usePaginacion` envía. */
export interface ListParams {
  /** Filtros por igualdad/contiene, indexados por campo del DTO. */
  filters?: Record<string, string | number | undefined>
  /** Búsqueda global (la caja de texto del toolbar). */
  search?: string
  /** `false` = devuelve el conjunto completo filtrado, sin paginar. */
  paginate?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export interface ListResult<T> {
  data: T[]
  /** Total SIN paginar. Es lo que necesita el pie de la tabla. */
  total: number
}

/**
 * Un repositorio de entidad. `TList` es lo que devuelve el listado y `TForm` lo
 * que devuelve el detalle: no tienen por qué coincidir, y de hecho casi nunca
 * coinciden (el listado trae el nombre de la cuenta; el formulario, su id).
 */
export interface EntityRepository<TList = unknown, TForm = unknown> {
  list(userId: string, params: ListParams): Promise<ListResult<TList>>
  get(userId: string, id: string): Promise<TForm | null>
  /** Devuelve el id creado. Valida `values` por su cuenta: llega sin tipar. */
  create(userId: string, values: unknown): Promise<{ id: string }>
  update(userId: string, id: string, values: unknown): Promise<{ id: string }>
  remove(userId: string, id: string): Promise<{ id: string }>
}

/**
 * Error de negocio esperado (validación, no encontrado, regla de dominio).
 *
 * Se distingue de un fallo inesperado a propósito: este mensaje SE LE ENSEÑA a
 * la persona que está rellenando el formulario, así que tiene que estar escrito
 * para ella. Lo que no sea un `RepositoryError` se convierte en un mensaje
 * genérico y no filtra el interior de la base de datos.
 */
export class RepositoryError extends Error {
  /** Errores por campo, en el formato que consume `GenericForm`. */
  readonly fieldErrors?: Record<string, string>

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'RepositoryError'
    this.fieldErrors = fieldErrors
  }
}

/** Mismo texto para "no existe" y "no es tuyo": distinguirlos es un oráculo de ids. */
export const NOT_FOUND = 'No encontrado'

/**
 * Traduce un `ZodError` aplanado al formato de `RepositoryError`.
 *
 * Con UN solo campo mal, el mensaje de cabecera es el de ese campo: "El origen y
 * el destino no pueden ser la misma cuenta" dice qué hacer, y "Revisa los campos
 * marcados" obliga a ir a buscarlo. Con varios sí se usa el genérico, porque
 * enseñar uno de tres arbitrariamente es peor que no enseñar ninguno.
 */
export const fromFieldErrors = (
  fieldErrors: Record<string, string[] | undefined>,
  message?: string,
): RepositoryError => {
  const flat: Record<string, string> = {}
  for (const [field, msgs] of Object.entries(fieldErrors)) {
    if (msgs?.length) flat[field] = msgs[0]
  }
  const unicos = Object.values(flat)
  const cabecera =
    message ?? (unicos.length === 1 ? unicos[0] : 'Revisa los campos marcados')
  return new RepositoryError(cabecera, flat)
}
