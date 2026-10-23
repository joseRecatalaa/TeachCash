'use client'

/*
 * La pantalla de carga de la aplicación.
 *
 * QUÉ DECIDE ESTE COMPONENTE Y POR QUÉ
 *
 * Dura un tiempo FIJO, no espera a que haya datos. Es deliberado: las páginas
 * son cliente y Refine no pide nada hasta que hidrata, así que "listo" no
 * existe como señal. Atarlo a la primera consulta dejaría la pantalla colgada
 * cuando esa consulta falle, que es justo cuando el usuario necesita ver la
 * aplicación para enterarse. Aquí el tiempo lo manda el guion de la animación,
 * y la aplicación hidrata por detrás mientras tanto.
 *
 * Por eso mismo hay un botón de saltar: una espera que no depende de nada
 * tiene que poder cortarse.
 *
 * El porcentaje NO es una medida de nada real —no hay nada que medir— pero sí
 * está sincronizado con la animación: llega al 100 % con el personaje ya
 * sosteniendo el billete. Una barra que va por su cuenta se nota enseguida.
 *
 * El aspecto es de videojuego de 16 bits a propósito: es la puerta del Camino
 * del héroe, que será un recorrido por mundos con este mismo personaje. Los
 * sprites están en `sprites.ts` y la escena en `PixelScene.tsx`.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { PixelScene } from './PixelScene'
import { BILLETE, PALETA_HEROE } from './sprites'
import { PixelSprite } from './PixelSprite'
import styles from './Splash.module.css'

/** El ciclo completo, del primer fotograma al velo blanco. */
const CICLO_MS = 4800

/**
 * Con el movimiento reducido, `globals.css` anula la duración de TODA
 * animación: el personaje aparece ya en la pose final y no hay nada que
 * mirar. Mantener la espera completa sería castigar justo a quien pidió menos
 * movimiento, así que se reduce a un suspiro.
 */
const CICLO_REDUCIDO_MS = 900

/**
 * Lo que tarda el fundido de salida. Tiene que valer lo mismo que el
 * `--sd-dur-slow` con el que `.saliendo` anima en el módulo: si este número es
 * menor, el componente se desmonta a medio fundido y la aplicación aparece de
 * golpe.
 */
const SALIDA_MS = 420

/**
 * La barra llega al 100 % en el 70 % del ciclo, con el billete ya en alto.
 * El 30 % restante es la pose sostenida y el velo.
 */
const TRAMO_BARRA = 0.7

/**
 * La pantalla se ve UNA VEZ POR SESIÓN de navegador: se repite al cerrar y
 * volver a abrir la aplicación, pero no en cada recarga dentro de la misma
 * visita. Por eso la bandera va en `sessionStorage` y no en `localStorage`:
 * `localStorage` sobrevive a cerrar el navegador, y eso la dejaría sin
 * enseñarse nunca más después de la primera vez.
 *
 * Para volver a verla sin cerrar la pestaña, desde la consola del navegador:
 *   sessionStorage.removeItem('gf-splash-visto')
 *
 * Quien LEE la bandera antes del primer pintado es el script del `<head>` en
 * `app/layout.tsx`, que marca `<html data-splash="visto">`. Tiene que ser así:
 * si la decisión esperase a que React hidrate, la pantalla ya se habría
 * pintado y se vería un fogonazo en cada recarga. Aquí abajo solo se lee ese
 * atributo, que el script deja puesto y nadie vuelve a tocar.
 */
const CLAVE_VISTO = 'gf-splash-visto'

/**
 * Se lanza en `window` cuando la pantalla de carga termina. Lo escucha quien
 * quiera llamar la atención justo DESPUÉS de ella y no debajo, donde nadie lo
 * vería: el menú lateral se asoma con este evento.
 */
export const EVENTO_FIN_SPLASH = 'gf-splash-fin'

function marcarVisto(): void {
  window.dispatchEvent(new Event(EVENTO_FIN_SPLASH))
  try {
    window.sessionStorage.setItem(CLAVE_VISTO, '1')
  } catch {
    // Modo privado o almacenamiento bloqueado. Se volverá a ver, y no pasa
    // nada: es mejor enseñarla de más que romper la aplicación por esto.
  }
}

/**
 * Si la pantalla ya se vio en esta sesión del navegador.
 *
 * Se lee del atributo del `<html>` y no de `sessionStorage` porque el atributo
 * NO cambia durante la vida de la página: `useSyncExternalStore` exige que la
 * instantánea sea estable, y la bandera sí cambia (se escribe al terminar).
 * Leer la bandera directamente haría que la pantalla se esfumara a media
 * animación en el primer repintado posterior.
 */
function useYaVisto(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => document.documentElement.dataset.splash === 'visto',
    () => false,
  )
}

const CONSULTA_MOVIMIENTO = '(prefers-reduced-motion: reduce)'

/**
 * La preferencia de movimiento, leída sin romper la hidratación.
 *
 * `matchMedia` no existe en el servidor, así que el tercer argumento devuelve
 * `false` allí: React pinta lo mismo en las dos partes y ya en el cliente
 * vuelve a pintar con el valor de verdad. Leerlo con `useState` daría un aviso
 * de hidratación a quien tenga el movimiento reducido, y hacerlo dentro de un
 * efecto obligaría a un `setState` que ESLint —con razón— no quiere.
 */
function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(CONSULTA_MOVIMIENTO)
      mq.addEventListener('change', avisar)
      return () => mq.removeEventListener('change', avisar)
    },
    () => window.matchMedia(CONSULTA_MOVIMIENTO).matches,
    () => false,
  )
}

/**
 * Con tres puntos y no con "…": la tipografía de píxel no trae la elipsis y
 * el navegador la pintaría con otra fuente, que en una línea de 8 bits canta.
 */
function mensaje(fase: number): string {
  if (fase < 0.24) return 'Cargando el mundo...'
  if (fase < 0.4) return 'Buscando billetes...'
  if (fase < TRAMO_BARRA) return 'Cuadrando cuentas...'
  return 'Listo'
}

/** Los bloques de la barra. 20 hace que cada uno valga un 5 % redondo. */
const BLOQUES = 20

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [saliendo, setSaliendo] = useState(false)
  // La fase es 0..1 sobre el ciclo. El porcentaje se deriva de ella, no al
  // revés: así el mensaje y la barra no pueden desincronizarse entre sí.
  const [fase, setFase] = useState(0)
  const ciclo = useMovimientoReducido() ? CICLO_REDUCIDO_MS : CICLO_MS
  const yaVisto = useYaVisto()
  const veloRef = useRef<HTMLDivElement>(null)
  // Una sola condición para todo: lo que se pinta, los relojes y el bloqueo del
  // scroll. Si se separan, vuelve el bug de que algo sigue vivo sin pantalla.
  const activa = visible && !yaVisto

  /*
   * El bloqueo del scroll va en su PROPIO efecto y depende de `visible`.
   *
   * Es el arreglo de un bug real: cuando la pantalla termina, el componente
   * devuelve `null`, pero `null` no lo desmonta — solo vacía lo que pinta. El
   * componente sigue montado en el layout porque está puesto sin condición, así
   * que la limpieza de un efecto que no dependa de `visible` NO CORRE NUNCA y
   * el `overflow: hidden` se queda para siempre: la aplicación entera deja de
   * poder desplazarse. Atándolo a `visible`, al pasar a `false` React ejecuta
   * la limpieza y devuelve el scroll.
   */
  useEffect(() => {
    if (!activa) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [activa])

  useEffect(() => {
    // Mismo motivo que arriba: sin `visible` en las dependencias, este
    // intervalo seguiría llamando a `setFase` cada 60 ms el resto de la vida de
    // la página, repintando un componente que ya no pinta nada.
    if (!activa) return

    /*
     * La barra se engancha al reloj de la PROPIA animación, no a uno suyo.
     *
     * El CSS empieza a correr en cuanto se pinta el elemento; este efecto no
     * corre hasta que React hidrata, y entre una cosa y otra puede haber medio
     * segundo largo en la primera carga. Con dos relojes distintos, el
     * personaje llega a coger el billete con la barra por la mitad. Leyendo
     * `currentTime` del velo —que anima el ciclo entero— van siempre a la vez.
     *
     * `getAnimations` puede no devolver nada (movimiento reducido, o el
     * navegador aún no la ha arrancado): entonces se mide a mano, que era el
     * comportamiento de antes y sigue valiendo.
     */
    const anim = veloRef.current?.getAnimations()[0]
    const arranque = performance.now()
    const transcurrido = () => {
      const t = anim?.currentTime
      return typeof t === 'number' ? t : performance.now() - arranque
    }

    const tick = window.setInterval(() => {
      setFase(Math.min(1, transcurrido() / ciclo))
    }, 60)

    const restante = Math.max(0, ciclo - transcurrido())
    const alFinal = window.setTimeout(() => {
      setSaliendo(true)
      marcarVisto()
    }, restante)
    const alQuitar = window.setTimeout(() => setVisible(false), restante + SALIDA_MS)

    return () => {
      window.clearInterval(tick)
      window.clearTimeout(alFinal)
      window.clearTimeout(alQuitar)
    }
  }, [ciclo, activa])

  if (!activa) return null

  const pct = Math.min(100, Math.round((fase / TRAMO_BARRA) * 100))

  const saltar = () => {
    marcarVisto()
    setSaliendo(true)
    window.setTimeout(() => setVisible(false), SALIDA_MS)
  }

  const llenos = Math.floor((pct / 100) * BLOQUES)

  return (
    <div
      className={`${styles.raiz} ${saliendo ? styles.saliendo : ''}`}
      style={{ '--t': `${ciclo}ms` } as React.CSSProperties}
    >
      <PixelScene />

      <div className={`${styles.caja} ${styles.marca}`}>
        <svg
          className={styles.marcador}
          viewBox="-5 -10 20 12"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <PixelSprite sprite={BILLETE} paleta={PALETA_HEROE} />
        </svg>
        <span>
          <p className={styles.nombre}>Gestor de Finanzas</p>
          <p className={styles.lema}>Tus cuentas, en limpio</p>
        </span>
      </div>

      <div className={`${styles.caja} ${styles.panel}`}>
        <div className={styles.cabeceraPanel}>
          <p className={styles.estado} aria-live="polite">
            <span className={`${styles.cursor} ${pct >= 100 ? styles.cursorFin : ''}`} />
            {mensaje(fase)}
          </p>
          <button type="button" className={styles.saltar} onClick={saltar}>
            Saltar »
          </button>
        </div>
        <div className={styles.fila}>
          <div
            className={styles.barra}
            role="progressbar"
            aria-label="Cargando la aplicación"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            {Array.from({ length: BLOQUES }, (_, i) => (
              <i key={i} className={i < llenos ? styles.lleno : undefined} />
            ))}
          </div>
          <span className={styles.pct}>{pct}%</span>
        </div>
      </div>

      {/* El velo lleva la ref: su animación dura el ciclo entero y es el reloj
          al que se engancha la barra. */}
      <div className={styles.velo} ref={veloRef} />
    </div>
  )
}
