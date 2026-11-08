'use client'

/**
 * El héroe del Cuadro de mando, en el centro y sin leyenda: al pasar el ratón
 * por una parte del cuerpo, su pieza se rodea de un anillo y sale un bocadillo
 * que dice qué lleva ("Armadura de oro") o qué le falta ("Sin armadura").
 *
 * Con el ratón basta con pasar; para cruzar hasta el bocadillo (lleva un enlace)
 * hay un margen antes de cerrarlo. Con el dedo no hay "pasar": se toca, y se
 * cierra tocando fuera. Con el teclado, al llegar con el tabulador.
 *
 * Las zonas que se tocan van en un `<svg>` aparte, encima del dibujo y con el
 * mismo `viewBox`: el dibujo es `role="img"`, y todo lo que hay dentro de una
 * imagen es presentación, así que unos botones metidos ahí no le llegarían a un
 * lector de pantalla.
 *
 * El bocadillo se coloca por CSS según el hueco (`data-hueco`), junto a la pieza.
 * Si se mueve una zona o una pieza, revisa su punto en `HeroeEquipo.module.css`.
 */

import Link from 'next/link'
import { useEffect, useRef, useState, type PointerEvent as EventoPuntero } from 'react'
import { IconArrowRight } from '@tabler/icons-react'
import { equipoPorHueco, HUECOS, objetoPorId, type Hueco, type Objeto } from '@/lib/tienda'
import { EscenarioHeroe, VIEWBOX_ESCENARIO } from '../Pixel/EscenarioHeroe'
import { ObjetoPixel, TIPO_DEL_HUECO } from '../Pixel/HeroeGrande'
import styles from './HeroeEquipo.module.css'
import { useEscalaEscenario } from './useEscalaEscenario'

const NOMBRE: Record<Hueco, { nombre: string; sin: string }> = {
  casco: { nombre: 'Casco', sin: 'Sin casco' },
  armadura: { nombre: 'Armadura', sin: 'Sin armadura' },
  guantes: { nombre: 'Guantes', sin: 'Sin guantes' },
  botas: { nombre: 'Botas', sin: 'Sin botas' },
  arma: { nombre: 'Arma', sin: 'Sin arma' },
  escudo: { nombre: 'Escudo', sin: 'Sin escudo' },
  alas: { nombre: 'Alas', sin: 'Sin alas' },
}

type Caja = readonly [x: number, y: number, ancho: number, alto: number]

/**
 * Dónde se señala cada hueco, en las coordenadas del héroe (48x66). Las cajas no
 * se pisan entre sí, así que el orden no decide nada y el tabulador va en el de
 * `HUECOS`. Salen de las cajas de los sprites de `spritesGrande.ts`: el casco es
 * la cabeza, la armadura el torso, los guantes las manos, las botas las piernas,
 * el arma lo que hay a la derecha, el escudo lo de la izquierda y las alas lo
 * que asoma detrás.
 */
const ZONAS: Record<Hueco, readonly Caja[]> = {
  casco: [[6, -2, 36, 26]],
  armadura: [
    [6, 24, 36, 16],
    [12, 40, 24, 6],
  ],
  guantes: [
    [5, 40, 7, 10],
    [36, 40, 7, 10],
  ],
  botas: [
    [12, 46, 24, 4],
    [9, 50, 30, 16],
  ],
  arma: [[43, 16, 27, 36]],
  escudo: [[-6, 28, 11, 32]],
  alas: [
    [-17, 12, 11, 38],
    [-6, 12, 12, 12],
    [42, 8, 24, 8],
  ],
}

/** Lo que espera el bocadillo a cerrarse: el rato de cruzar hasta él con el ratón. */
const MARGEN_CIERRE = 180

function enlaceTienda(objeto: Objeto | undefined): string {
  if (!objeto) return 'Conseguir en la tienda'
  return objeto.calidad === 'alta' ? 'Ver la tienda' : 'Mejorar en la tienda'
}

const PIPS = { basica: 1, media: 2, alta: 3 } as const

function Bocadillo({
  hueco,
  objeto,
  onPointerEnter,
  onPointerLeave,
}: {
  hueco: Hueco
  objeto: Objeto | undefined
  onPointerEnter: (e: EventoPuntero) => void
  onPointerLeave: (e: EventoPuntero) => void
}) {
  // Sin pieza, el icono es la básica del hueco, apagada: "aquí iría esto".
  const icono = objeto ?? objetoPorId(`${TIPO_DEL_HUECO[hueco]}-basica`)
  return (
    <div
      className={styles.bocadillo}
      data-hueco={hueco}
      data-vacio={!objeto || undefined}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {icono && (
        <span className={styles.icono}>
          <ObjetoPixel objeto={icono} caja={44} />
        </span>
      )}
      <div className={styles.texto}>
        <p className={styles.nombre}>{objeto ? objeto.nombre : NOMBRE[hueco].sin}</p>
        {objeto && (
          <span className={styles.pips} aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} data-lleno={n <= PIPS[objeto.calidad] || undefined} />
            ))}
          </span>
        )}
        <Link href="/Tienda" className={styles.enlace}>
          {enlaceTienda(objeto)} <IconArrowRight size={13} stroke={2.4} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

export function HeroeEquipo({ equipo }: { equipo: readonly string[] }) {
  const [senalado, setSenalado] = useState<Hueco | null>(null)
  const lienzo = useRef<HTMLDivElement>(null)
  const cierre = useRef<ReturnType<typeof setTimeout>>(undefined)
  const escala = useEscalaEscenario(lienzo)
  const puesto = equipoPorHueco(equipo)

  const mostrar = (hueco: Hueco) => {
    clearTimeout(cierre.current)
    setSenalado(hueco)
  }
  const quedarse = () => clearTimeout(cierre.current)
  // Con el dedo, levantarlo también es "salir": ahí se cierra tocando fuera.
  const salir = (e: EventoPuntero) => {
    if (e.pointerType === 'touch') return
    clearTimeout(cierre.current)
    cierre.current = setTimeout(() => setSenalado(null), MARGEN_CIERRE)
  }

  useEffect(() => () => clearTimeout(cierre.current), [])

  useEffect(() => {
    if (!senalado) return
    const fuera = (e: PointerEvent) => {
      if (!lienzo.current?.contains(e.target as Node)) setSenalado(null)
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSenalado(null)
    }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [senalado])

  return (
    <section className={styles.heroe} aria-label="Tu héroe">
      <div ref={lienzo} className={styles.lienzo}>
        <EscenarioHeroe equipo={equipo} senalado={senalado} escala={escala} />
        <svg className={styles.zonas} viewBox={VIEWBOX_ESCENARIO} role="group" aria-label="Equipo del héroe">
          {HUECOS.map((hueco) => (
            <g
              key={hueco}
              role="button"
              tabIndex={0}
              aria-label={NOMBRE[hueco].nombre}
              aria-expanded={senalado === hueco}
              className={styles.zona}
              onPointerEnter={() => mostrar(hueco)}
              onPointerLeave={salir}
              onClick={() => mostrar(hueco)}
              onFocus={() => mostrar(hueco)}
              onBlur={(e) => {
                // Si el foco pasa al enlace del bocadillo, el bocadillo se queda.
                if (!lienzo.current?.contains(e.relatedTarget as Node)) setSenalado(null)
              }}
            >
              {ZONAS[hueco].map(([x, y, ancho, alto]) => (
                <rect key={`${x},${y}`} x={x} y={y} width={ancho} height={alto} />
              ))}
            </g>
          ))}
        </svg>
        {/* Siempre montado: un `aria-live` que nace con el texto dentro no se anuncia. */}
        <div aria-live="polite">
          {senalado && (
            <Bocadillo
              hueco={senalado}
              objeto={puesto.get(senalado)}
              onPointerEnter={quedarse}
              onPointerLeave={salir}
            />
          )}
        </div>
      </div>
    </section>
  )
}
