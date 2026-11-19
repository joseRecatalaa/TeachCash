'use client'

/*
 * El probador de la portada, como la pantalla de inventario de un juego: a la
 * izquierda el héroe en su isla bajo las estrellas, a la derecha una casilla
 * por hueco con el dibujo de lo que lleva. Pulsar una casilla sube la pieza de
 * calidad (nada → cuero → hierro → oro → nada) y el héroe se la estrena con el
 * gesto y los destellos de la tienda de verdad.
 *
 * Es lo único de la portada que se toca, y enseña lo que el juego promete con
 * el juego mismo: que lo que aprendes se nota en tu héroe.
 *
 * No compra nada ni guarda nada: el héroe, los dibujos y los precios son los
 * de la tienda (`lib/tienda.ts`), pero el estado vive en esta página y se
 * pierde al salir. Sin JavaScript se ve el héroe con su equipo de partida y
 * las casillas no hacen nada, que es una portada completa igualmente.
 *
 * El estreno vuelve a montar la escena (`key`): una pieza que pasa de hierro a
 * oro es el mismo elemento, y sin montarlo de nuevo su animación no se
 * repetiría. Con el movimiento reducido no se pide (como en la tienda).
 */

import { useState } from 'react'
import { CALIDADES, HUECOS, objetoPorId, precioDeEquipo, type Calidad, type Hueco } from '@/lib/tienda'
import { EscenarioHeroe } from '../Pixel/EscenarioHeroe'
import { EstrellaPixel, ObjetoPixel, TIPO_DEL_HUECO } from '../Pixel/HeroeGrande'
import { useMovimientoReducido } from '../Pixel/useMovimientoReducido'
import { Cielo } from './Cielo'
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
  const [estreno, setEstreno] = useState<string | null>(null)
  const [vez, setVez] = useState(0)
  const reducido = useMovimientoReducido()
  const puestos = ids(equipo)
  const precio = precioDeEquipo(puestos)

  const poner = (nuevo: Equipo, recien: string | null) => {
    setEquipo(nuevo)
    setEstreno(reducido ? null : recien)
    setVez((v) => v + 1)
  }

  const cambiar = (hueco: Hueco) => {
    const calidad = siguiente(equipo[hueco])
    poner({ ...equipo, [hueco]: calidad }, calidad ? idDe(hueco, calidad) : null)
  }

  return (
    <div className={styles.probador}>
      <div className={styles.escenario}>
        <Cielo semilla={97} cuantas={45} />
        {/* Dos tamaños enteros, como en la cabecera de la portada. */}
        <div className={styles.soloMovil}>
          <EscenarioHeroe key={vez} equipo={puestos} estreno={estreno} escala={3} />
        </div>
        <div className={styles.soloAncho}>
          <EscenarioHeroe key={vez} equipo={puestos} estreno={estreno} escala={4} />
        </div>
      </div>

      <div className={styles.inventario}>
        <ul className={styles.casillas} aria-label="Equipo del héroe">
          {HUECOS.map((hueco) => {
            const calidad = equipo[hueco]
            const objeto = calidad ? objetoPorId(idDe(hueco, calidad)) : undefined
            // La casilla vacía enseña la silueta de lo que falta.
            const dibujo = objeto ?? objetoPorId(idDe(hueco, 'basica'))
            const nivel = calidad ? CALIDADES.indexOf(calidad) + 1 : 0
            return (
              <li key={hueco}>
                <button
                  type="button"
                  className={styles.casilla}
                  data-calidad={calidad ?? 'ninguna'}
                  aria-label={`${NOMBRE_HUECO[hueco]}: ${objeto ? objeto.nombre : 'sin poner'}. Pulsa para cambiarlo.`}
                  onClick={() => cambiar(hueco)}
                >
                  {/* Con la calidad en la `key`, el dibujo da un salto al cambiar. */}
                  <span key={calidad ?? 'nada'} className={objeto ? styles.dibujo : styles.silueta}>
                    {dibujo && <ObjetoPixel objeto={dibujo} caja={48} />}
                  </span>
                  <span className={styles.nombre}>{objeto ? objeto.nombre : NOMBRE_HUECO[hueco]}</span>
                  <span className={styles.nivel} aria-hidden="true">
                    {[1, 2, 3].map((n) => (
                      <span key={n} data-lleno={n <= nivel || undefined} />
                    ))}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className={styles.pie}>
          <p className={styles.precio} aria-live="polite">
            <EstrellaPixel tamano={28} />
            <span className={styles.cifra}>{precio}</span>
            <span className={styles.total}>
              de {estrellasPosibles} estrellas
              <span className={styles.oculto}> cuesta este equipo en la tienda</span>
            </span>
          </p>
          <div className={styles.botones}>
            <button
              type="button"
              className={styles.boton}
              onClick={() => poner(TODO_DE_ORO, idDe('alas', 'alta'))}
            >
              Todo de oro
            </button>
            <button type="button" className={styles.botonSuave} onClick={() => poner({}, null)}>
              Quitar todo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
