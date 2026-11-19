'use client'

/**
 * Lee el id de la fila que se está editando desde la ruta: `/Movimientos/Edit/<id>`
 * (la carpeta `Edit/[id]` de cada entidad).
 *
 * Va en claro a propósito: los ids son UUID y de un solo usuario, así que
 * ofuscarlos sería mantener una pieza de criptografía sin nada que proteger.
 * Va en la ruta y no en `?id=` solo porque se lee mejor en la barra.
 *
 * Lo que sí importa: **el id que llega por la URL es un id del cliente y no se
 * cree**. Toda consulta que lo use filtra además por el `userId` de la sesión,
 * dentro del `where` (regla dura 4). Que esté en la barra de direcciones no lo
 * hace más de quien lo escribe.
 */

import { useParams } from 'next/navigation'

export function useEntityId(): string {
  const { id } = useParams<{ id?: string }>()
  if (!id) return ''
  // Un segmento puede llegar codificado; un UUID no tiene `%`, así que
  // descodificarlo no cambia uno que ya llegue en claro.
  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}
