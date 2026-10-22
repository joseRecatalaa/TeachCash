'use client'

/**
 * El mes que enseña Inicio, leído de `?mes=YYYY-MM`.
 *
 * En la URL y no en estado: así sobrevive a una recarga y a volver desde otra
 * pantalla. El mes actual va SIN parámetro, para que `/` siga siendo "hoy" y no
 * se quede congelado en el mes en que alguien guardó el enlace.
 *
 * Lo que llega por la URL lo escribe cualquiera: un mes mal formado cae al
 * actual y uno fuera de rango se acota a `[INICIO_MES_MINIMO, mes actual]`.
 * Necesita un `<Suspense>` por encima, como todo `useSearchParams`.
 */

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addMonths, clampPeriod, currentPeriod, isPeriod, type Period } from '@/lib/dates'
import { INICIO_MES_MINIMO } from '@/src/types/informe.types'

export interface MesDeInicio {
  periodo: Period
  /** El mes de hoy: el tope por arriba y el destino de "volver". */
  actual: Period
  esActual: boolean
  /** `null` en el tope: no hay a dónde ir. */
  anterior: Period | null
  siguiente: Period | null
  ir: (periodo: Period) => void
}

export function useMesDeInicio(): MesDeInicio {
  const router = useRouter()
  const pedido = useSearchParams().get('mes')
  const actual = currentPeriod()

  const periodo =
    pedido && isPeriod(pedido) ? clampPeriod(pedido, INICIO_MES_MINIMO, actual) : actual

  const ir = useCallback(
    (destino: Period) =>
      // `replace` y no `push`: pasar meses no es navegar, y "atrás" tiene que
      // salir de Inicio, no deshacer cada flecha.
      router.replace(destino === actual ? '/' : `/?mes=${destino}`, { scroll: false }),
    [router, actual],
  )

  return {
    periodo,
    actual,
    esActual: periodo === actual,
    anterior: periodo > INICIO_MES_MINIMO ? addMonths(periodo, -1) : null,
    siguiente: periodo < actual ? addMonths(periodo, 1) : null,
    ir,
  }
}
