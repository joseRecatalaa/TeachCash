/**
 * El catálogo de la tienda del héroe, en código y no en JSON ni en la base: cada
 * objeto necesita su dibujo (`components/Pixel/spritesGrande.ts`), así que un
 * objeto nuevo es un cambio de código de todas formas.
 *
 * Tres calidades por tipo, que son un mismo dibujo con tres paletas. Los precios
 * están pensados contra las estrellas que existen: 4 mundos x 9 niveles x 3 son
 * 108. Ir entero de lo mejor cuesta 75, así que se puede, pero no da para
 * comprarlo todo y hay que elegir.
 *
 * Las estrellas no son dinero: son enteros sin divisa y no pasan por `lib/money`.
 */

export const CALIDADES = ['basica', 'media', 'alta'] as const
export type Calidad = (typeof CALIDADES)[number]

/** Dónde se lleva un objeto. Hay uno equipado por hueco. */
export const HUECOS = ['casco', 'armadura', 'guantes', 'botas', 'arma', 'escudo', 'alas'] as const
export type Hueco = (typeof HUECOS)[number]

export const TIPOS_OBJETO = [
  'casco',
  'armadura',
  'guantes',
  'botas',
  'espada',
  'martillo',
  'escudo',
  'alas',
] as const
export type TipoObjeto = (typeof TIPOS_OBJETO)[number]

export interface Objeto {
  /** Estable: es lo que se guarda en `hero_items.item_id`. */
  id: string
  tipo: TipoObjeto
  hueco: Hueco
  calidad: Calidad
  nombre: string
  /** En estrellas. */
  precio: number
}

const CUERO = { basica: 'de cuero', media: 'de hierro', alta: 'de oro' }
const MADERA = { basica: 'de madera', media: 'de hierro', alta: 'de oro' }

const FICHAS: Record<TipoObjeto, { hueco: Hueco; nombre: string; material: Record<Calidad, string> }> = {
  casco: { hueco: 'casco', nombre: 'Casco', material: CUERO },
  armadura: { hueco: 'armadura', nombre: 'Armadura', material: CUERO },
  guantes: { hueco: 'guantes', nombre: 'Guantes', material: CUERO },
  botas: { hueco: 'botas', nombre: 'Botas', material: CUERO },
  espada: { hueco: 'arma', nombre: 'Espada', material: MADERA },
  martillo: { hueco: 'arma', nombre: 'Martillo', material: MADERA },
  escudo: { hueco: 'escudo', nombre: 'Escudo', material: MADERA },
  alas: { hueco: 'alas', nombre: 'Alas', material: { basica: 'de plumas', media: 'de plata', alta: 'de oro' } },
}

const PRECIOS: Record<Calidad, number> = { basica: 3, media: 6, alta: 10 }
/** Las alas de oro son el capricho: lo único que se sale de la tabla. */
const PRECIO_ALAS_DE_ORO = 15

export const CATALOGO: readonly Objeto[] = TIPOS_OBJETO.flatMap((tipo) =>
  CALIDADES.map((calidad) => ({
    id: `${tipo}-${calidad}`,
    tipo,
    hueco: FICHAS[tipo].hueco,
    calidad,
    nombre: `${FICHAS[tipo].nombre} ${FICHAS[tipo].material[calidad]}`,
    precio: tipo === 'alas' && calidad === 'alta' ? PRECIO_ALAS_DE_ORO : PRECIOS[calidad],
  })),
)

const POR_ID = new Map(CATALOGO.map((o) => [o.id, o]))

/** `undefined` para un id que no está en el catálogo, venga de donde venga. */
export const objetoPorId = (id: string): Objeto | undefined => POR_ID.get(id)

/** Los ids de un hueco: la espada y el martillo comparten el del arma. */
export const idsDelHueco = (hueco: Hueco): string[] =>
  CATALOGO.filter((o) => o.hueco === hueco).map((o) => o.id)

/**
 * Lo que vale lo que se lleva puesto, en estrellas de catálogo. Un id que ya no
 * esté en el catálogo no suma.
 */
export const precioDeEquipo = (ids: readonly string[]): number =>
  ids.reduce((suma, id) => suma + (objetoPorId(id)?.precio ?? 0), 0)

/** Lo más que se puede llevar puesto a la vez: lo más caro de cada hueco. */
export const MAXIMO_EQUIPABLE = HUECOS.reduce(
  (suma, hueco) =>
    suma + Math.max(...CATALOGO.filter((o) => o.hueco === hueco).map((o) => o.precio)),
  0,
)

/**
 * El equipo tal y como quedaría con `id` puesto: sustituye a lo que hubiera en
 * su hueco. Es lo que pinta el probador de la tienda sin comprar nada.
 */
export function conObjetoPuesto(equipo: readonly string[], id: string): string[] {
  const objeto = objetoPorId(id)
  if (!objeto) return [...equipo]
  const delHueco = new Set(idsDelHueco(objeto.hueco))
  return [...equipo.filter((e) => !delHueco.has(e)), id]
}
