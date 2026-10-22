'use client'

/**
 * Menú lateral de MÓDULOS: las grandes áreas de la aplicación, no sus pantallas.
 *
 * La Navbar lleva las secciones del módulo en el que estás (Inicio,
 * Movimientos…); este menú cambia de módulo. Por eso son dos piezas y no una:
 * mezclar los dos niveles en la misma lista haría que "Movimientos" y "Camino
 * del héroe" parecieran cosas del mismo tamaño.
 *
 * Vive siempre montado y escondido: del panel solo asoma por el borde izquierdo
 * una pestaña con tres rayas. Se abre al pasar el ratón y se cierra al sacarlo.
 * El hover NO es la única forma de abrirlo, y no puede serlo: en un móvil no
 * hay ratón y con teclado tampoco. La pestaña es un `<button>` de verdad que
 * abre y cierra al pulsarla, Escape cierra, y un toque fuera también.
 *
 * Un módulo nuevo es una entrada más en `MODULOS`.
 */

import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { IconArrowRight, IconLock, IconPigMoney, IconSword, IconWallet } from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import { StatusBadge } from '../ui'
import { EVENTO_FIN_SPLASH } from '../Splash/SplashScreen'
import styles from './SideMenu.module.css'

type Modulo = {
  label: string
  icon: Icon
} & (
  | { disponible: true; href: Route }
  | { disponible: false }
)

const MODULOS: Modulo[] = [
  {
    label: 'Gestión de patrimonio',
    icon: IconPigMoney,
    disponible: true,
    href: '/',
  },
  {
    label: 'Camino del héroe',
    icon: IconSword,
    disponible: false,
  },
]

/**
 * Cuánto espera a cerrarse después de que el ratón salga.
 *
 * Sin margen, una diagonal un poco torpe hacia el panel —o salirse un píxel por
 * el borde— lo cierra de golpe, y un menú que se escapa cuando vas a por él se
 * siente roto. Con mucho margen, deja de parecer que responde al ratón.
 */
const ESPERA_CIERRE_MS = 220

/**
 * El asomo: una vez por sesión del navegador, al terminar la pantalla de carga,
 * el panel sale un palmo y vuelve. Una pestaña en el borde no se descubre sola;
 * verla moverse una vez sí dice "aquí hay algo". Más de una vez por sesión ya
 * sería un anuncio, y por eso la bandera va en `sessionStorage`.
 */
const CLAVE_ASOMADO = 'tc-menu-asomado'
const ESPERA_ASOMO_MS = 700
const DURACION_ASOMO_MS = 1300

function yaAsomado(): boolean {
  try {
    return window.sessionStorage.getItem(CLAVE_ASOMADO) === '1'
  } catch {
    // Sin almacenamiento, mejor no asomar que asomar en cada recarga.
    return true
  }
}

/**
 * Si la pantalla de carga ya terminó: o se vio en una carga anterior (el
 * atributo que pone el script del <head>) o acaba de terminar en esta, ANTES
 * de que el menú se montara. Pasa en la primera visita: la aplicación espera a
 * crear el invitado para montar lo de dentro de `Providers`, y para entonces el
 * evento de fin ya ha sonado y nadie lo estaba escuchando.
 */
function splashTerminado(): boolean {
  if (document.documentElement.dataset.splash === 'visto') return true
  try {
    return window.sessionStorage.getItem('gf-splash-visto') === '1'
  } catch {
    return false
  }
}

function marcarAsomado(): void {
  try {
    window.sessionStorage.setItem(CLAVE_ASOMADO, '1')
  } catch {
    // Ya se comprobó al leer; aquí no hay nada que hacer.
  }
}

export function SideMenu() {
  const [abierto, setAbierto] = useState(false)
  const [asomando, setAsomando] = useState(false)
  const raizRef = useRef<HTMLDivElement>(null)
  const pestanaRef = useRef<HTMLButtonElement>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Con qué se pulsó la pestaña. Se apunta en `pointerdown` y no se lee del
  // `click`: no todos los navegadores ponen `pointerType` en el click, y uno
  // de teclado (Enter) no pasa por `pointerdown` y llega aquí como null.
  const punteroPulsado = useRef<string | null>(null)
  const panelId = useId()

  const cancelarCierre = () => {
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = null
  }

  // Ni un temporizador vivo después de desmontar.
  useEffect(() => cancelarCierre, [])

  // El asomo, después de la pantalla de carga: si ya se vio en esta sesión, al
  // poco de montar; si no, cuando avise de que ha terminado. Con el movimiento
  // reducido no se asoma: sin transición sería un parpadeo, no un gesto.
  useEffect(() => {
    if (yaAsomado() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let entrar: ReturnType<typeof setTimeout> | undefined
    let volver: ReturnType<typeof setTimeout> | undefined
    const asomar = () => {
      entrar = setTimeout(() => {
        marcarAsomado()
        setAsomando(true)
        volver = setTimeout(() => setAsomando(false), DURACION_ASOMO_MS)
      }, ESPERA_ASOMO_MS)
    }
    if (splashTerminado()) asomar()
    else window.addEventListener(EVENTO_FIN_SPLASH, asomar, { once: true })
    return () => {
      window.removeEventListener(EVENTO_FIN_SPLASH, asomar)
      clearTimeout(entrar)
      clearTimeout(volver)
    }
  }, [])

  // Un toque o un clic FUERA del menú lo cierra. Solo hace falta escuchar
  // mientras está abierto, y solo importa sin ratón encima: con ratón ya lo
  // cierra el `pointerleave`.
  useEffect(() => {
    if (!abierto) return
    const alPulsarFuera = (e: globalThis.PointerEvent) => {
      if (!raizRef.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', alPulsarFuera)
    return () => document.removeEventListener('pointerdown', alPulsarFuera)
  }, [abierto])

  // Solo el RATÓN abre por hover. Un dedo también dispara `pointerenter` justo
  // antes del `click`: si abriera aquí, el click de después lo volvería a
  // cerrar y en el móvil el menú no se abriría nunca.
  const alEntrar = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    cancelarCierre()
    setAbierto(true)
  }

  const alSalir = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    cancelarCierre()
    temporizador.current = setTimeout(() => setAbierto(false), ESPERA_CIERRE_MS)
  }

  const alPulsarTecla = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !abierto) return
    setAbierto(false)
    // El foco vuelve a la pestaña: si se quedara en un enlace que acaba de
    // volverse `inert`, se perdería en el <body>.
    pestanaRef.current?.focus()
  }

  return (
    <>
      {/* El velo aparta el contenido mientras el menú está fuera. No recibe
          eventos: pasar por encima de él ya es "salir del menú". */}
      <div className={styles.velo} data-abierto={abierto} aria-hidden />

      <div
        ref={raizRef}
        className={styles.raiz}
        data-abierto={abierto}
        data-asomando={asomando}
        onPointerEnter={alEntrar}
        onPointerLeave={alSalir}
        onKeyDown={alPulsarTecla}
        // Con teclado, salir del menú con el tabulador lo cierra: si no, se
        // quedaría abierto tapando la página por la que sigues navegando.
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setAbierto(false)
        }}
      >
        {/* La pestaña va ANTES del panel en el DOM, aunque se pinte a su
            derecha: es el orden del tabulador. Detrás, tras abrir con teclado
            el siguiente Tab saldría del menú en vez de entrar en sus enlaces. */}
        <button
          ref={pestanaRef}
          type="button"
          className={styles.pestana}
          aria-expanded={abierto}
          aria-controls={panelId}
          aria-label={abierto ? 'Cerrar el menú de módulos' : 'Abrir el menú de módulos'}
          onPointerDown={(e) => {
            punteroPulsado.current = e.pointerType
          }}
          onClick={() => {
            cancelarCierre()
            // Con ratón, el hover ya lo ha abierto: un clic que alternara lo
            // CERRARÍA justo cuando vas a usarlo. Con ratón solo abre (se
            // cierra saliendo); el dedo y el Enter sí alternan.
            if (punteroPulsado.current === 'mouse') setAbierto(true)
            else setAbierto((v) => !v)
            punteroPulsado.current = null
          }}
        >
          <span className={styles.rayas} aria-hidden>
            <span />
            <span />
            <span />
          </span>
          {/* La palabra hace lo que las rayas solas no: nadie tiene que saber
              que tres rayas en un borde son un menú. */}
          <span className={styles.pestanaTexto} aria-hidden>
            Menú
          </span>
        </button>
        {/* `inert` mientras está escondido: fuera de la pantalla, sus enlaces
            seguirían recibiendo el foco con el tabulador y quien navega con
            teclado acabaría en un sitio que no ve. */}
        <div id={panelId} className={styles.panel} inert={!abierto}>
          <div className={styles.cabecera}>
            <span className={styles.marca} aria-hidden>
              <IconWallet size={17} stroke={2.2} />
            </span>
            <span className={styles.marcaNombre}>TeachCash</span>
          </div>

          <nav aria-label="Módulos">
            <ul className={styles.lista}>
              {MODULOS.map((modulo) => (
                <li key={modulo.label}>
                  {modulo.disponible ? (
                    <EnlaceModulo
                      modulo={modulo}
                      // Mientras sea el único módulo, toda pantalla es suya.
                      // Cuando llegue el segundo, sus rutas irán bajo su propio
                      // prefijo y esto pasará a mirar `usePathname()`.
                      activo
                      alElegir={() => setAbierto(false)}
                    />
                  ) : (
                    <ModuloProximamente modulo={modulo} />
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

      </div>
    </>
  )
}

/**
 * La ficha, de arriba abajo: la chapa con lo que va a su derecha (la flecha o
 * el "Próximamente") y el nombre del módulo a todo el ancho. Sin descripción: el
 * nombre ya dice qué hay dentro, y una línea más solo alargaba la ficha.
 *
 * El nombre ocupa su propia fila para poder ser grande: al lado de la chapa no
 * cabía y se partía en una columna estrecha.
 */
function Contenido({ modulo, extremo }: { modulo: Modulo; extremo: ReactNode }) {
  const Icono = modulo.icon
  return (
    <>
      <span className={styles.fila}>
        <span className={styles.chapa} aria-hidden>
          <Icono size={21} stroke={2} />
        </span>
        {extremo}
      </span>
      {/* Dos spans y no uno: el de fuera es el bloque, el de dentro es
          `inline` para que el trazo de rotulador se pinte bajo CADA línea
          cuando el nombre se parte, y no solo bajo la última. */}
      <span className={styles.titulo}>
        <span className={styles.tituloTexto}>{modulo.label}</span>
      </span>
    </>
  )
}

function EnlaceModulo({
  modulo,
  activo,
  alElegir,
}: {
  modulo: Extract<Modulo, { disponible: true }>
  activo: boolean
  alElegir: () => void
}) {
  return (
    <Link
      href={modulo.href}
      className={styles.modulo}
      data-activo={activo}
      aria-current={activo ? 'page' : undefined}
      onClick={alElegir}
    >
      <Contenido
        modulo={modulo}
        extremo={<IconArrowRight className={styles.flecha} size={20} stroke={2.2} aria-hidden />}
      />
    </Link>
  )
}

/**
 * Un módulo que todavía no existe NO es un enlace deshabilitado: no hay
 * `<a aria-disabled>` que el tabulador visite para no llevar a ninguna parte.
 * Es texto, y el lector de pantalla lo lee como tal, con su "Próximamente".
 */
function ModuloProximamente({ modulo }: { modulo: Extract<Modulo, { disponible: false }> }) {
  return (
    <div className={styles.modulo} data-deshabilitado aria-disabled="true">
      <Contenido
        modulo={modulo}
        extremo={
          <StatusBadge tone="muted" size="sm" icon={<IconLock size={11} stroke={2.4} />}>
            Próximamente
          </StatusBadge>
        }
      />
    </div>
  )
}
