/**
 * Los cursos tal como los ve quien NO ha entrado: la portada, `/aprende` y la
 * página de cada mundo, que son las que indexa Google.
 *
 * Sin sesión y sin progreso, así que no es una Server Action: lo llaman las
 * páginas del servidor directamente y nunca viaja por un endpoint. Y no lleva
 * nada de DENTRO del nivel (páginas, preguntas, soluciones): solo lo que ya
 * enseña la ficha de un nivel en el camino. Lo vigila `catalogo.test.ts`.
 */

import type { MundoPublicoDto } from '@/src/types/heroe.types'
import { contenido, type Contenido } from './contenido'

/** Puro, para poder probarlo con el contenido de verdad sin la caché. */
export function catalogoDe({ mundos, niveles }: Contenido): MundoPublicoDto[] {
  return mundos
    .filter((m) => m.niveles.length > 0)
    .map((m) => {
      const lista = m.niveles.flatMap((id) => {
        const nivel = niveles.get(`${m.id}/${id}`)
        return nivel
          ? [{ id: nivel.id, titulo: nivel.titulo, descripcion: nivel.descripcion, tipo: nivel.tipo, minutos: nivel.minutos }]
          : []
      })
      return {
        id: m.id,
        titulo: m.titulo,
        descripcion: m.descripcion,
        decorado: m.decorado,
        seo: m.seo ?? { titulo: m.titulo, descripcion: m.descripcion },
        niveles: lista,
        minutos: lista.reduce((total, n) => total + n.minutos, 0),
      }
    })
}

export async function catalogoPublico(): Promise<MundoPublicoDto[]> {
  return catalogoDe(await contenido())
}

export async function mundoPublico(id: string): Promise<MundoPublicoDto | undefined> {
  return (await catalogoPublico()).find((m) => m.id === id)
}
