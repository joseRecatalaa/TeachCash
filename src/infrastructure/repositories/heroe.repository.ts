/**
 * Repositorio del Camino del héroe: el progreso de cada usuario sobre el
 * contenido de `content/heroe/`.
 *
 * SOLO SERVIDOR. No implementa `EntityRepository` ni está en `REPOSITORIES`:
 * no es un CRUD, igual que el perfil. Sus acciones van en `heroe.actions.ts`.
 *
 * Dos garantías viven aquí y no en la interfaz (regla dura 6):
 *
 *  - El ORDEN. Dentro de un mundo, un nivel solo se abre si el anterior está
 *    superado. Un nivel bloqueado no se puede ni leer ni enviar, y responde lo
 *    mismo que uno que no existe.
 *  - La CORRECCIÓN. El cliente tiene las soluciones (las necesita para el
 *    feedback inmediato), pero lo que manda son las respuestas en bruto: los
 *    aciertos, las estrellas y si se supera los calcula este fichero.
 *
 * Todo lo que no sea la mejor marca de cada nivel es derivado (regla dura 7).
 */

import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { heroProgress } from '@/db/schema'
import { APROBADO_POR_DEFECTO, esCorrecta, estrellas as calcularEstrellas, supera } from '@/lib/heroe'
import type {
  Estrellas,
  EstadoNivel,
  MapaDto,
  Mundo,
  MundoDto,
  Nivel,
  NivelDto,
  NivelEnCaminoDto,
  Pregunta,
  ResultadoNivelDto,
} from '@/src/types/heroe.types'
import { contenido } from '../heroe/contenido'
import { NOT_FOUND, RepositoryError } from './types'

type Progreso = { stars: number; completedAt: Date | null; updatedAt: Date }

async function progresoDe(userId: string): Promise<Map<string, Progreso>> {
  const filas = await db
    .select({
      levelId: heroProgress.levelId,
      stars: heroProgress.stars,
      completedAt: heroProgress.completedAt,
      updatedAt: heroProgress.updatedAt,
    })
    .from(heroProgress)
    .where(eq(heroProgress.userId, userId))
  return new Map(filas.map(({ levelId, ...p }) => [levelId, p]))
}

const idsDe = (mundo: Mundo) => mundo.niveles.map((slug) => `${mundo.id}/${slug}`)

/** El estado de cada nivel de un mundo, en orden: hecho, disponible o bloqueado. */
function estados(mundo: Mundo, progreso: Map<string, Progreso>): EstadoNivel[] {
  let anteriorHecho = true
  return idsDe(mundo).map((id): EstadoNivel => {
    const hecho = progreso.get(id)?.completedAt != null
    const abierto = anteriorHecho
    anteriorHecho = hecho
    if (hecho) return 'hecho'
    return abierto ? 'disponible' : 'bloqueado'
  })
}

const estrellasDe = (progreso: Map<string, Progreso>, id: string) =>
  (progreso.get(id)?.stars ?? 0) as Estrellas

/**
 * El nivel y su mundo, si existe y está abierto para este usuario. Si no, el
 * mismo "No encontrado" en los dos casos: distinguir "bloqueado" de "no
 * existe" no le sirve a nadie que juegue por la interfaz.
 */
async function nivelAbierto(userId: string, levelId: string) {
  const datos = await contenido()
  const nivel = datos.niveles.get(levelId)
  const mundo = datos.mundos.find((m) => levelId.startsWith(`${m.id}/`))
  if (!nivel || !mundo) throw new RepositoryError(NOT_FOUND)

  const progreso = await progresoDe(userId)
  const ids = idsDe(mundo)
  const i = ids.indexOf(levelId)
  if (estados(mundo, progreso)[i] === 'bloqueado') throw new RepositoryError(NOT_FOUND)
  return { nivel, mundo, progreso, ids, i, datos }
}

/* ── Lecturas ─────────────────────────────────────────────────────────── */

export async function getMapa(userId: string): Promise<MapaDto> {
  const { mundos } = await contenido()
  const progreso = await progresoDe(userId)

  // El último jugado, por `updated_at`: ahí espera el héroe en el mapa.
  let ultimo: { mundo: string; cuando: number } | null = null
  for (const [levelId, p] of progreso) {
    const mundo = mundos.find((m) => idsDe(m).includes(levelId))
    if (mundo && (!ultimo || p.updatedAt.getTime() > ultimo.cuando)) {
      ultimo = { mundo: mundo.id, cuando: p.updatedAt.getTime() }
    }
  }

  return {
    mundos: mundos.map((m) => {
      const ids = idsDe(m)
      return {
        id: m.id,
        proximamente: ids.length === 0,
        titulo: m.titulo,
        descripcion: m.descripcion,
        decorado: m.decorado,
        hechos: estados(m, progreso).filter((e) => e === 'hecho').length,
        total: ids.length,
        estrellas: ids.reduce((suma, id) => suma + estrellasDe(progreso, id), 0),
        estrellasMax: ids.length * 3,
      }
    }),
    ultimoMundo: ultimo?.mundo ?? null,
  }
}

export async function getMundo(userId: string, mundoId: string): Promise<MundoDto> {
  const datos = await contenido()
  const mundo = datos.mundos.find((m) => m.id === mundoId)
  // Un mundo "Próximamente" (sin niveles) no tiene camino que enseñar.
  if (!mundo || mundo.niveles.length === 0) throw new RepositoryError(NOT_FOUND)

  const progreso = await progresoDe(userId)
  const estadoDe = estados(mundo, progreso)
  const niveles: NivelEnCaminoDto[] = idsDe(mundo).map((id, i) => {
    const nivel = datos.niveles.get(id) as Nivel
    return {
      id,
      titulo: nivel.titulo,
      descripcion: nivel.descripcion,
      tipo: nivel.tipo,
      minutos: nivel.minutos,
      estado: estadoDe[i],
      estrellas: estrellasDe(progreso, id),
    }
  })

  return {
    mundo: { id: mundo.id, titulo: mundo.titulo, descripcion: mundo.descripcion, decorado: mundo.decorado },
    niveles,
    siguiente: niveles.find((n) => n.estado === 'disponible')?.id ?? null,
  }
}

export async function getNivel(userId: string, levelId: string): Promise<NivelDto> {
  const { nivel, mundo, progreso } = await nivelAbierto(userId, levelId)
  return {
    nivel,
    mundo: { id: mundo.id, titulo: mundo.titulo, decorado: mundo.decorado },
    estrellas: estrellasDe(progreso, levelId),
  }
}

/**
 * Todas las estrellas ganadas, sumando solo niveles que existen en el contenido:
 * lo mismo que enseña el mapa. Son lo que se puede gastar en la tienda.
 */
export async function getEstrellasGanadas(userId: string): Promise<number> {
  const { mundos } = await contenido()
  const progreso = await progresoDe(userId)
  return mundos
    .flatMap(idsDe)
    .reduce((suma, id) => suma + estrellasDe(progreso, id), 0)
}

/* ── Enviar una partida ───────────────────────────────────────────────── */

/** Lo que se corrige de un nivel: el minitest, los ejercicios o las preguntas del jefe. */
export function evaluables(nivel: Nivel): Pregunta[] {
  switch (nivel.tipo) {
    case 'lectura':
      return nivel.minitest
    case 'interactivo':
      return nivel.ejercicios
    case 'jefe':
      return nivel.preguntas
  }
}

const aprobadoDe = (nivel: Nivel) => (nivel.tipo === 'jefe' ? nivel.aprobado : APROBADO_POR_DEFECTO)

/** Una permutación de 0..n-1: cada índice una vez. */
const permutacion = (n: number) =>
  z
    .array(z.number().int().min(0).max(n - 1))
    .length(n)
    .refine((r) => new Set(r).size === n)

/**
 * La FORMA que tiene que tener la respuesta a cada pregunta. Si es buena o no
 * lo decide `esCorrecta`; esto solo separa "una respuesta equivocada" (cuenta
 * como fallo) de "basura" (no se guarda nada y se avisa).
 */
function formaDeRespuesta(p: Pregunta): z.ZodType {
  switch (p.tipo) {
    case 'opcion':
    case 'hueco':
      return z.number().int().min(0).max(p.opciones.length - 1)
    case 'verdaderoFalso':
      return z.boolean()
    case 'ordenar':
      return permutacion(p.pasos.length)
    case 'emparejar':
      return permutacion(p.pares.length)
    case 'calcula':
      return z.number().int().min(-1_000_000_000).max(1_000_000_000)
  }
}

function validarRespuestas(preguntas: Pregunta[], respuestas: unknown): unknown[] {
  const lista = z.array(z.unknown()).length(preguntas.length).safeParse(respuestas)
  if (!lista.success) {
    throw new RepositoryError('Respuestas no válidas', {
      respuestas: `Se esperaban ${preguntas.length} respuestas`,
    })
  }
  const mala = preguntas.findIndex((p, i) => !formaDeRespuesta(p).safeParse(lista.data[i]).success)
  if (mala !== -1) {
    throw new RepositoryError('Respuestas no válidas', {
      respuestas: `La respuesta ${mala + 1} no es válida`,
    })
  }
  return lista.data
}

/**
 * Corrige una partida y guarda la mejor marca.
 *
 * `respuestas` llega del cliente sin tipar: una por pregunta y en el mismo
 * orden. Lo que el cliente diga de sus aciertos no se le pregunta: se corrige
 * aquí.
 */
export async function completarNivel(
  userId: string,
  levelId: string,
  respuestas: unknown,
): Promise<ResultadoNivelDto> {
  const { nivel, ids, i, datos } = await nivelAbierto(userId, levelId)
  const preguntas = evaluables(nivel)
  const validas = validarRespuestas(preguntas, respuestas)

  const correccion = preguntas.map((p, k) => esCorrecta(p, validas[k]))
  const aciertos = correccion.filter(Boolean).length
  const total = preguntas.length
  const aprobado = aprobadoDe(nivel)
  const superado = supera(aciertos, total, aprobado)
  const estrellas = calcularEstrellas(aciertos, total, aprobado)

  // La mejor marca no baja nunca: `greatest` con lo que ya había. La fecha de
  // superado es la PRIMERA, así que `coalesce` se queda con la que hubiera.
  // El `where` del update lo pone la fila en conflicto, cuya clave incluye el
  // usuario: solo puede ser la suya.
  const [fila] = await db
    .insert(heroProgress)
    .values({
      userId,
      levelId,
      stars: estrellas,
      bestScore: aciertos,
      attempts: 1,
      completedAt: superado ? sql`now()` : null,
    })
    .onConflictDoUpdate({
      target: [heroProgress.userId, heroProgress.levelId],
      set: {
        stars: sql`greatest(${heroProgress.stars}, excluded.stars)`,
        bestScore: sql`greatest(${heroProgress.bestScore}, excluded.best_score)`,
        attempts: sql`${heroProgress.attempts} + 1`,
        completedAt: sql`coalesce(${heroProgress.completedAt}, excluded.completed_at)`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ stars: heroProgress.stars, completedAt: heroProgress.completedAt })

  const siguienteId = ids[i + 1]
  const abierto = fila.completedAt !== null && siguienteId !== undefined && datos.niveles.has(siguienteId)

  return {
    aciertos,
    total,
    estrellas,
    mejorEstrellas: fila.stars as Estrellas,
    superado,
    correccion,
    siguiente: abierto ? siguienteId : null,
  }
}
