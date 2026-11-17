'use client'

/**
 * Las flechas de mes de Inicio: ‹ octubre de 2026 ›.
 *
 * En un tope la flecha se deshabilita en vez de desaparecer: si desapareciera,
 * el nombre del mes cambiaría de sitio al llegar al extremo y el siguiente clic
 * caería en otra cosa.
 */

import { ActionIcon, Tooltip } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { formatPeriod } from '@/lib/format'
import type { MesDeInicio } from './useMesDeInicio'
import styles from './SelectorMes.module.css'

export function SelectorMes({ periodo, actual, esActual, anterior, siguiente, ir }: MesDeInicio) {
  return (
    <div className={styles.selector}>
      <Tooltip label={anterior ? formatPeriod(anterior) : 'No hay meses anteriores'}>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label={anterior ? `Mes anterior: ${formatPeriod(anterior)}` : 'Mes anterior'}
          disabled={!anterior}
          onClick={() => anterior && ir(anterior)}
        >
          <IconChevronLeft size={16} stroke={2.4} />
        </ActionIcon>
      </Tooltip>

      {/* `aria-live`: quien usa lector de pantalla oye a qué mes ha llegado. */}
      <p className={styles.mes} aria-live="polite">
        {formatPeriod(periodo)}
      </p>

      <Tooltip label={siguiente ? formatPeriod(siguiente) : 'Es el mes actual'}>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label={siguiente ? `Mes siguiente: ${formatPeriod(siguiente)}` : 'Mes siguiente'}
          disabled={!siguiente}
          onClick={() => siguiente && ir(siguiente)}
        >
          <IconChevronRight size={16} stroke={2.4} />
        </ActionIcon>
      </Tooltip>

      {!esActual && (
        <button type="button" className={styles.hoy} onClick={() => ir(actual)}>
          Volver al mes actual
        </button>
      )}
    </div>
  )
}
