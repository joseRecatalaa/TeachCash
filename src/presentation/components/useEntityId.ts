'use client'

/**
 * Lee el id de la fila que se está editando desde `?id=`.
 *
 * Va en claro a propósito: los ids son UUID y de un solo usuario, así que
 * ofuscarlos sería mantener una pieza de criptografía sin nada que proteger.
 *
 * Lo que sí importa: **el id que llega por la URL es un id del cliente y no se
 * cree**. Toda consulta que lo use filtra además por el `userId` de la sesión,
 * dentro del `where` (regla dura 4). Que esté en la barra de direcciones no lo
 * hace más de quien lo escribe.
 */

import { useSearchParams } from 'next/navigation'

export function useEntityId(): string {
  return useSearchParams().get('id') ?? ''
}
