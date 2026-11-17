'use client'

/**
 * La franja bajo la Navbar que ve un invitado: cuándo se borran sus datos y
 * cómo evitarlo.
 *
 * Se puede cerrar, pero no para siempre. Es la única señal de que lo que está
 * anotando desaparecerá, y una franja cerrada el primer día no se vuelve a
 * leer; por eso vuelve sola el ÚLTIMO día antes del borrado, que es cuando
 * todavía se está a tiempo de crear la cuenta.
 *
 * Lo cerrado se recuerda por INVITADO (la clave guarda su fecha de borrado):
 * un invitado nuevo vuelve a ver el aviso aunque el anterior lo cerrara.
 */

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { IconClockExclamation, IconX } from '@tabler/icons-react'
import { useCuenta } from '@/src/application/providers/CuentaProvider'
import styles from './AvisoInvitado.module.css'

/**
 * `caducaEl` es un INSTANTE (cuándo corre el job de limpieza), no una fecha
 * civil, así que aquí sí se formatea con hora y en el huso de quien mira.
 */
const formato = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Dónde se recuerda el cierre. El script del <head> de `app/layout.tsx` lee
 * esta MISMA clave y marca `<html data-aviso-invitado="cerrado">` antes del
 * primer pintado, y el CSS esconde la franja con esa marca. Sin él, en cada
 * recarga la franja se pintaría y desaparecería al hidratar, empujando toda la
 * página arriba y abajo. Si cambias la clave o el día de margen, cambia el
 * script: los dos tienen que decidir lo mismo.
 */
const CLAVE_AVISO_CERRADO = 'tc-aviso-invitado-cerrado'

/** Cuánto antes del borrado vuelve a salir aunque se cerrara. */
const VUELVE_ANTES_MS = 24 * 60 * 60 * 1000

const EVENTO_CAMBIO = 'tc-aviso-invitado'

function leerCerrado(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_AVISO_CERRADO)
  } catch {
    return null
  }
}

function suscribir(avisar: () => void) {
  // `storage` para otras pestañas; el evento propio, para esta.
  window.addEventListener('storage', avisar)
  window.addEventListener(EVENTO_CAMBIO, avisar)
  return () => {
    window.removeEventListener('storage', avisar)
    window.removeEventListener(EVENTO_CAMBIO, avisar)
  }
}

/**
 * Si ESTE invitado lo cerró y aún no ha llegado su último día.
 *
 * En el servidor, `false`: el HTML lleva siempre la franja y es el script del
 * <head> quien la esconde a tiempo. `useSyncExternalStore` y no un `useState`
 * leído en un efecto, por lo mismo que en la pantalla de carga: sin aviso de
 * hidratación y sin `setState` dentro de un efecto.
 */
function useCerrado(caducaEl: string): boolean {
  return useSyncExternalStore(
    suscribir,
    () =>
      leerCerrado() === caducaEl && Date.now() < Date.parse(caducaEl) - VUELVE_ANTES_MS,
    () => false,
  )
}

export function AvisoInvitado() {
  const { cuenta } = useCuenta()
  if (cuenta.tipo !== 'invitado') return null
  return <Franja caducaEl={cuenta.caducaEl} />
}

/** `false` al hidratar, `true` ya en el cliente: separa las dos pasadas. */
const useEnCliente = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

function Franja({ caducaEl }: { caducaEl: string }) {
  const cerradoGuardado = useCerrado(caducaEl)
  const enCliente = useEnCliente()
  // Por si el almacenamiento está bloqueado: al menos se cierra en esta visita.
  const [cerradoAhora, setCerradoAhora] = useState(false)

  // El script del <head> no sabe QUÉ invitado cerró el aviso, solo que alguno
  // lo hizo. Si fue uno anterior, la marca escondería la franja de este, que
  // no la ha cerrado: ya en el cliente, y solo entonces, se retira. En la
  // pasada de hidratación no, o se vería un fogonazo de la franja.
  useEffect(() => {
    if (enCliente && !cerradoGuardado) delete document.documentElement.dataset.avisoInvitado
  }, [enCliente, cerradoGuardado])

  if (cerradoGuardado || cerradoAhora) return null

  const cerrar = () => {
    setCerradoAhora(true)
    try {
      window.localStorage.setItem(CLAVE_AVISO_CERRADO, caducaEl)
    } catch {
      // Modo privado: volverá a salir al recargar, que es lo menos malo.
    }
    window.dispatchEvent(new Event(EVENTO_CAMBIO))
  }

  return (
    <div className={styles.franja} role="note">
      {/* Hueco del mismo ancho que la X: así el mensaje queda centrado en la
          franja y no en lo que la X le deja. */}
      <span aria-hidden />
      <div className={styles.contenido}>
        <IconClockExclamation size={18} stroke={2} aria-hidden className={styles.icono} />
        <p className={styles.texto}>
          Estás como <strong>invitado</strong>: tus datos se borrarán el{' '}
          <strong suppressHydrationWarning>{formato.format(new Date(caducaEl))}</strong>.{' '}
          <Link href="/Registro" className={styles.enlace}>
            Crea una cuenta
          </Link>{' '}
          para conservarlos.
        </p>
      </div>
      <button type="button" className={styles.cerrar} onClick={cerrar} aria-label="Cerrar el aviso">
        <IconX size={16} stroke={2.4} aria-hidden />
      </button>
    </div>
  )
}
