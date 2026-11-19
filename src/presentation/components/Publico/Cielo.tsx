/*
 * El cielo de noche de la portada: estrellas a píxel que titilan, detrás de la
 * pantalla de título, de los mundos y del cierre. Es decorado puro
 * (`aria-hidden`) y no ocupa sitio: va en absoluto y lo recorta su sección.
 *
 * Las estrellas salen de un generador con semilla fija y no de `Math.random`:
 * el servidor y cada recarga pintan el mismo cielo, y React no avisa de que el
 * HTML no casa al hidratar.
 *
 * Cuatro grupos titilan a destiempo (`data-grupo`), cada uno con su retraso en
 * `escenas.module.css`. Con el movimiento reducido se quedan encendidas.
 */

import styles from './escenas.module.css'

const ANCHO = 320
const ALTO = 180

/** Un generador lineal congruente: el mismo cielo siempre. */
function semilla(n: number) {
  let s = n
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

type Estrella = { x: number; y: number; grande: boolean }

function estrellas(cuantas: number, n: number): Estrella[][] {
  const azar = semilla(n)
  const grupos: Estrella[][] = [[], [], [], []]
  for (let i = 0; i < cuantas; i++) {
    const x = Math.floor(azar() * ANCHO)
    const y = Math.floor(azar() * ALTO)
    grupos[i % 4].push({ x, y, grande: azar() > 0.82 })
  }
  return grupos
}

/** Una estrella pequeña es un píxel; una grande, una cruz de cinco. */
function trazo(lista: readonly Estrella[]): string {
  return lista
    .map(({ x, y, grande }) =>
      grande ? `M${x} ${y - 1}h1v3h-1zM${x - 1} ${y}h3v1h-3z` : `M${x} ${y}h1v1h-1z`,
    )
    .join('')
}

export function Cielo({ semilla: n = 7, cuantas = 90 }: { semilla?: number; cuantas?: number }) {
  return (
    <svg
      className={styles.cielo}
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {estrellas(cuantas, n).map((grupo, i) => (
        <path key={i} d={trazo(grupo)} className={styles.estrella} data-grupo={i} />
      ))}
    </svg>
  )
}
