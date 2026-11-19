'use client'

/*
 * El probador de la portada: quien aún no juega viste al héroe pieza a pieza y
 * ve cuántas estrellas costaría ese equipo en la tienda. Es lo único de la
 * portada que se toca, y enseña lo que el juego promete con el juego mismo:
 * que lo que aprendes se nota en tu héroe.
 *
 * No compra nada ni guarda nada: el héroe y los precios son los de la tienda
 * de verdad (`lib/tienda.ts`), pero el estado vive en esta página y se pierde
 * al salir. Sin JavaScript se ve el héroe con su equipo de partida y los
 * botones no hacen nada, que es una portada completa igualmente.
 */

import { useState } from 'react'
import { CALIDADES, HUECOS, objetoPorId, precioDeEquipo, type Calidad, type Hueco } from '@/lib/tienda'
import { EscenaHeroe, EstrellaPixel, TIPO_DEL_HUECO } from '../Pixel/HeroeGrande'
import { SketchButton } from '../ui'
import styles from './Probador.module.css'

type Equipo = Partial<Record<Hueco, Calidad>>

const NOMBRE_HUECO: Record<Hueco, string> = {
  casco: 'Casco',
  armadura: 'Armadura',
  guantes: 'Guantes',
  botas: 'Botas',
  arma: 'Espada',
  escudo: 'Escudo',
  alas: 'Alas',
}

/** Con lo que sale de partida: un poco equipado, para que se vea que se puede. */
const INICIAL: Equipo = { casco: 'basica', arma: 'basica', escudo: 'basica' }

const TODO_DE_ORO: Equipo = Object.fromEntries(HUECOS.map((h) => [h, 'alta']))

const idDe = (hueco: Hueco, calidad: Calidad) => `${TIPO_DEL_HUECO[hueco]}-${calidad}`

const ids = (equipo: Equipo) =>
  HUECOS.flatMap((h) => {
    const calidad = equipo[h]
    return calidad ? [idDe(h, calidad)] : []
  })

/** Nada → la básica → la media → la mejor → nada. */
function siguiente(actual: Calidad | undefined): Calidad | undefined {
  if (!actual) return CALIDADES[0]
  return CALIDADES[CALIDADES.indexOf(actual) + 1]
}

export function Probador({ estrellasPosibles }: { estrellasPosibles: number }) {
  const [equipo, setEquipo] = useState<Equipo>(INICIAL)
  const puestos = ids(equipo)
  const precio = precioDeEquipo(puestos)

  return (
    <div className={styles.probador}>
      <div className={styles.escena}>
        <EscenaHeroe equipo={puestos} />
      </div>

      <div className={styles.mandos}>
        <ul className={styles.piezas} aria-label="Equipo del héroe">
          {HUECOS.map((hueco) => {
            const calidad = equipo[hueco]
            const objeto = calidad ? objetoPorId(idDe(hueco, calidad)) : undefined
            return (
              <li key={hueco}>
                <button
                  type="button"
                  className={styles.pieza}
                  data-calidad={calidad ?? 'ninguna'}
                  onClick={() => setEquipo((e) => ({ ...e, [hueco]: siguiente(e[hueco]) }))}
                >
                  <span className={styles.hueco}>{NOMBRE_HUECO[hueco]}</span>
                  <span className={styles.material}>{objeto ? objeto.nombre : 'Sin poner'}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <p className={styles.precio} aria-live="polite">
          <EstrellaPixel tamano={21} />
          <span>
            Este equipo cuesta <strong>{precio}</strong> {precio === 1 ? 'estrella' : 'estrellas'}. En el juego
            hay {estrellasPosibles} por ganar.
          </span>
        </p>

        <div className={styles.botones}>
          <SketchButton variant="secondary" size="sm" onClick={() => setEquipo(TODO_DE_ORO)}>
            Todo de oro
          </SketchButton>
          <SketchButton variant="ghost" size="sm" onClick={() => setEquipo({})}>
            Quitárselo todo
          </SketchButton>
        </div>
      </div>
    </div>
  )
}
