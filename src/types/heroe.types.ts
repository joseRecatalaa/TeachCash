/**
 * El Camino del héroe: el formato del contenido y lo que viaja al cliente.
 *
 * El CONTENIDO (mundos, niveles, preguntas) son JSON en `content/heroe/`, y
 * estos esquemas son su contrato: los aplica `contenido.ts` al cargarlos y el
 * test `contenido-heroe.test.ts`, que rompe la CI si un JSON está mal. Los
 * tipos salen de los esquemas, así que no pueden divergir de ellos.
 *
 * Objetos ESTRICTOS (`z.strictObject`): una clave de más en un JSON escrito a
 * mano casi siempre es una errata ("explicaion"), y sin esto pasaría en
 * silencio y la explicación no se vería nunca.
 *
 * Cómo se escribe un nivel, con ejemplos: `docs/CONTENIDO-HEROE.md`.
 */

import { z } from 'zod'
import { errorDeMarcas } from '@/lib/marcas'

/** Un tramo de id: minúsculas, cifras y guiones. Va en la URL y en la base. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** El id de un nivel: `<mundo>/<nivel>`, p. ej. `ahorro/01-fondo-emergencia`. */
export const LEVEL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/

const slug = z.string().regex(SLUG, 'Solo minúsculas, cifras y guiones')
const texto = (max: number) => z.string().trim().min(1).max(max)

/**
 * Un título: sin emoticonos. Los títulos van en la letra de titulares (y los
 * de los mundos, en la de píxel), y un emoticono a color al lado se come el
 * estilo; además, el lector de pantalla lee su nombre entero ("cara con los
 * dientes apretados") antes que el título. Donde sí caben es en el texto.
 */
const SIN_EMOTICONOS = /\p{Extended_Pictographic}/u
const titulo = (max: number) =>
  texto(max).refine((t) => !SIN_EMOTICONOS.test(t), 'Sin emoticonos en los títulos')

/**
 * Un texto que admite `**negrita**` y `_cursiva_` (`lib/marcas.ts`). Una marca
 * sin cerrar es una errata: se rechaza, y el error lleva el campo en su ruta
 * ("minitest.2.explicacion: Hay una negrita (**) sin cerrar").
 */
const textoMarcado = (max: number) =>
  texto(max).superRefine((t, ctx) => {
    const error = errorDeMarcas(t)
    if (error) ctx.addIssue({ code: 'custom', message: error })
  })
const sinRepetidos = (lista: readonly string[]) => new Set(lista).size === lista.length

/* ── Las preguntas y los ejercicios ────────────────────────────────────────
 *
 * Son lo mismo: un minitest, un ejercicio interactivo y el jefe usan los
 * mismos seis tipos. Todas llevan su `explicacion`, que se enseña al fallar y
 * es lo que enseña de verdad.
 * ──────────────────────────────────────────────────────────────────────── */

const base = {
  /** Único dentro del nivel. */
  id: slug,
  enunciado: textoMarcado(400),
  explicacion: textoMarcado(700),
}

const opciones = z
  .array(texto(200))
  .min(2)
  .max(5)
  .refine(sinRepetidos, 'Hay opciones repetidas')

/** El índice de la buena tiene que existir. Con un índice, hay UNA sola correcta. */
const conCorrectaDentro = (p: { opciones: string[]; correcta: number }) =>
  p.correcta < p.opciones.length

export const PreguntaSchema = z.discriminatedUnion('tipo', [
  z
    .strictObject({
      ...base,
      tipo: z.literal('opcion'),
      opciones,
      correcta: z.number().int().min(0),
    })
    .refine(conCorrectaDentro, { message: 'La correcta no es ninguna opción', path: ['correcta'] }),
  z.strictObject({
    ...base,
    tipo: z.literal('verdaderoFalso'),
    correcta: z.boolean(),
  }),
  z.strictObject({
    ...base,
    tipo: z.literal('ordenar'),
    /** En el orden BUENO: el cliente los baraja. */
    pasos: z.array(texto(200)).min(3).max(6).refine(sinRepetidos, 'Hay pasos repetidos'),
  }),
  z.strictObject({
    ...base,
    tipo: z.literal('emparejar'),
    /** Cada concepto con SU definición: el cliente baraja las definiciones. */
    pares: z
      .array(z.strictObject({ concepto: texto(80), definicion: texto(200) }))
      .min(3)
      .max(5)
      .refine((p) => sinRepetidos(p.map((x) => x.concepto)), 'Hay conceptos repetidos')
      .refine((p) => sinRepetidos(p.map((x) => x.definicion)), 'Hay definiciones repetidas'),
  }),
  z
    .strictObject({
      ...base,
      tipo: z.literal('hueco'),
      opciones,
      correcta: z.number().int().min(0),
    })
    .refine(conCorrectaDentro, { message: 'La correcta no es ninguna opción', path: ['correcta'] })
    // El hueco va en el enunciado, marcado con tres guiones bajos.
    .refine((p) => p.enunciado.split('___').length === 2, {
      message: 'El enunciado tiene que llevar UN hueco: ___',
      path: ['enunciado'],
    })
    // La frase se pinta en dos mitades, antes y después del hueco: una
    // negrita que lo cruzara se quedaría abierta en las dos.
    .refine((p) => p.enunciado.split('___').every((mitad) => errorDeMarcas(mitad) === null), {
      message: 'Una negrita o cursiva no puede cruzar el hueco ___',
      path: ['enunciado'],
    }),
  z.strictObject({
    ...base,
    tipo: z.literal('calcula'),
    /**
     * En qué unidad se escribe la respuesta, y en qué unidad mínima va la
     * solución (regla dura 1: enteros, nunca decimales):
     *  - `euros`: céntimos, y la pinta `MoneyInput`.
     *  - `porcentaje`: centésimas de punto (5,25 % → 525).
     *  - `numero`: un entero (años, meses, veces).
     */
    unidad: z.enum(['euros', 'porcentaje', 'numero']),
    solucion: z.number().int().min(-1_000_000_000).max(1_000_000_000),
    /** Cuánto se puede desviar la respuesta, en la misma unidad mínima. */
    tolerancia: z.number().int().min(0).max(1_000_000),
  }),
])

export type Pregunta = z.infer<typeof PreguntaSchema>
export type TipoPregunta = Pregunta['tipo']

/* ── Las páginas de una lectura ────────────────────────────────────────── */

/**
 * Los dibujos que puede enseñar un bloque `imagen`: sprites a píxel que ya
 * existen (`components/Pixel/sprites.ts`). Nada de ficheros de imagen: así
 * no hay que tocar la CSP, no pesan y siguen el modo oscuro.
 */
export const SPRITES_IMAGEN = [
  'hucha',
  'cerdito',
  'escudo',
  'montana',
  'tarjeta',
  'libro',
  'mando',
  'monstruo',
  'candado',
  'estrella',
  'billete',
  'nube',
  'pino',
  'destello',
] as const
export type SpriteImagen = (typeof SPRITES_IMAGEN)[number]

export const BloqueSchema = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('parrafo'), texto: textoMarcado(900) }),
  /** La idea que hay que llevarse: se pinta destacada. */
  z.strictObject({ tipo: z.literal('idea'), texto: textoMarcado(300) }),
  /** Un ejemplo con cifras. Los importes, en céntimos y con signo. */
  z.strictObject({
    tipo: z.literal('ejemplo'),
    titulo: textoMarcado(120).refine((t) => !SIN_EMOTICONOS.test(t), 'Sin emoticonos en los títulos'),
    filas: z
      .array(z.strictObject({ concepto: texto(120), importe: z.number().int() }))
      .min(1)
      .max(8),
    nota: textoMarcado(300).optional(),
  }),
  z.strictObject({ tipo: z.literal('lista'), items: z.array(textoMarcado(250)).min(2).max(8) }),
  /**
   * Un dibujo a píxel. El `pie` es lo que lee el lector de pantalla (el
   * dibujo va oculto para él); sin pie, el dibujo es decoración.
   */
  z.strictObject({
    tipo: z.literal('imagen'),
    sprite: z.enum(SPRITES_IMAGEN),
    pie: texto(160).optional(),
  }),
  /**
   * El gancho de una lectura: un dato llamativo, con su FUENTE. Un dato sin
   * fuente no se publica, y por eso es obligatoria.
   */
  z.strictObject({
    tipo: z.literal('dato'),
    texto: textoMarcado(400),
    fuente: texto(120),
  }),
])

export type Bloque = z.infer<typeof BloqueSchema>

export const PaginaSchema = z.strictObject({
  titulo: titulo(120),
  bloques: z.array(BloqueSchema).min(1).max(6),
})

export type Pagina = z.infer<typeof PaginaSchema>

/* ── Los niveles ───────────────────────────────────────────────────────── */

const preguntasSinIdsRepetidos = (lista: readonly Pregunta[]) =>
  sinRepetidos(lista.map((p) => p.id))

const nivelBase = {
  /** `<mundo>/<nivel>`, y tiene que coincidir con la ruta del fichero. */
  id: z.string().regex(LEVEL_ID),
  titulo: titulo(80),
  descripcion: texto(240),
  /** Lo que se tarda, para la ficha del camino. */
  minutos: z.number().int().min(1).max(15),
}

const listaDePreguntas = (min: number, max: number) =>
  z.array(PreguntaSchema).min(min).max(max).refine(preguntasSinIdsRepetidos, 'Hay ids repetidos')

export const NivelSchema = z.discriminatedUnion('tipo', [
  /** Un curso corto que acaba con un minitest (el minijefe). */
  z.strictObject({
    ...nivelBase,
    tipo: z.literal('lectura'),
    paginas: z.array(PaginaSchema).min(1).max(8),
    minitest: listaDePreguntas(3, 5),
  }),
  /** Ejercicios en secuencia. Sin test aparte: ya hace de test. */
  z.strictObject({
    ...nivelBase,
    tipo: z.literal('interactivo'),
    ejercicios: listaDePreguntas(3, 12),
  }),
  /** El test grande del mundo. Declara su propio aprobado. */
  z.strictObject({
    ...nivelBase,
    tipo: z.literal('jefe'),
    preguntas: listaDePreguntas(8, 12),
    /** Porcentaje de aciertos para superarlo. */
    aprobado: z.number().int().min(50).max(100),
  }),
])

export type Nivel = z.infer<typeof NivelSchema>
export type TipoNivel = Nivel['tipo']

/* ── Los mundos ────────────────────────────────────────────────────────── */

/** El dibujo del mundo en el mapa, y la clave de su color (`data-mundo`). */
export const DECORADOS = ['escudo', 'hucha', 'montana', 'tarjeta'] as const
export type Decorado = (typeof DECORADOS)[number]

export const MundoSchema = z.strictObject({
  /** Tiene que coincidir con el nombre de la carpeta. */
  id: slug,
  titulo: titulo(60),
  descripcion: texto(240),
  decorado: z.enum(DECORADOS),
  /** Posición en el mapa. Los mundos están libres: no es un orden de desbloqueo. */
  orden: z.number().int().min(1),
  /**
   * Los niveles en el orden en que se juegan, por el nombre de su fichero sin
   * `.json`. El último tiene que ser el jefe.
   *
   * Vacío = el mundo aún no tiene contenido: sale en el mapa como
   * "Próximamente" y no se puede entrar. Así el mapa enseña desde el
   * principio todos los mundos que va a tener.
   */
  niveles: z.array(slug).max(15).refine(sinRepetidos, 'Hay niveles repetidos'),
})

export type Mundo = z.infer<typeof MundoSchema>

/* ── Lo que viaja al cliente ───────────────────────────────────────────────
 *
 * El progreso de cada nivel y todo lo de mundo y mapa es DERIVADO (regla dura
 * 7): se calcula desde `hero_progress` en cada consulta, no se guarda.
 * ──────────────────────────────────────────────────────────────────────── */

export type EstadoNivel = 'bloqueado' | 'disponible' | 'hecho'
export type Estrellas = 0 | 1 | 2 | 3

export interface MundoResumenDto {
  id: string
  /** Sin niveles todavía: se ve en el mapa pero no se puede entrar. */
  proximamente: boolean
  titulo: string
  descripcion: string
  decorado: Decorado
  hechos: number
  total: number
  estrellas: number
  /** Tres por nivel. */
  estrellasMax: number
}

export interface MapaDto {
  mundos: MundoResumenDto[]
  /** El mundo del último nivel jugado, donde espera el héroe. `null` si no ha jugado. */
  ultimoMundo: string | null
}

export interface NivelEnCaminoDto {
  id: string
  titulo: string
  descripcion: string
  tipo: TipoNivel
  minutos: number
  estado: EstadoNivel
  /** La mejor marca. */
  estrellas: Estrellas
}

export interface MundoDto {
  mundo: Pick<Mundo, 'id' | 'titulo' | 'descripcion' | 'decorado'>
  niveles: NivelEnCaminoDto[]
  /** El primer nivel disponible y sin hacer: adonde camina el héroe. `null` si está todo hecho. */
  siguiente: string | null
}

export interface NivelDto {
  nivel: Nivel
  mundo: Pick<Mundo, 'id' | 'titulo' | 'decorado'>
  /** La mejor marca hasta ahora, para la pantalla final. */
  estrellas: Estrellas
}

/**
 * El `NivelDto` tal como VIAJA: el nivel, con sus soluciones, oculto en un
 * bloque ilegible y la clave para abrirlo (`lib/ocultar.ts`). Lo abre
 * `useNivelHeroe`, así que las pantallas reciben el `NivelDto` de siempre.
 */
export interface NivelOcultoDto extends Omit<NivelDto, 'nivel'> {
  nivel: string
  clave: string
}

export interface ResultadoNivelDto {
  aciertos: number
  total: number
  /** Las de ESTA partida. */
  estrellas: Estrellas
  /** La mejor marca después de esta partida: nunca baja. */
  mejorEstrellas: Estrellas
  superado: boolean
  /** Por pregunta, en orden: si ESTA respuesta era buena según el servidor. */
  correccion: boolean[]
  /** El nivel que se acaba de desbloquear (o el siguiente, si ya lo estaba). `null` si era el último. */
  siguiente: string | null
}
