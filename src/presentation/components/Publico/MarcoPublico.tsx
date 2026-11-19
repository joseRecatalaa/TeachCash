/*
 * El marco de las páginas públicas (la portada sin sesión y los cursos): la
 * cabecera y el pie. Lo monta `app/layout.tsx` EN LUGAR de la aplicación
 * (`esPaginaPublica`), así que aquí no hay Refine, ni Mantine, ni cuenta: es
 * HTML del servidor, que es lo que lee Google. Todo va de noche (`.noche`), en
 * los dos temas: es el espacio del juego.
 *
 * Los enlaces que salen hacia la aplicación (jugar, entrar, la portada con
 * sesión) son `<a>` de los de siempre y no `<Link>`: el layout decide al CARGAR
 * si monta la aplicación, y una navegación de `<Link>` no vuelve a pasar por
 * él. Se quedaría sin sesión ni proveedores. Solo los que van de un curso a
 * otro son `<Link>`.
 */

import Link from 'next/link'
import type { Route } from 'next'
import { NOMBRE_SITIO, RUTA_CURSOS } from '@/lib/seo'
import { PixelHero } from '../Pixel/PixelHero'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import { MONEDA, PALETA_CAMINO } from '../Pixel/sprites'
import { SketchButton } from '../ui'
import { EnlaceCompleto } from './EnlaceCompleto'
import escenas from './escenas.module.css'
import styles from './MarcoPublico.module.css'

/** Adonde lleva "Jugar": el mapa de mundos. Crea el invitado al llegar. */
export const RUTA_JUGAR = '/CaminoHeroe'

/** Las fuentes de las cifras de los cursos: van en el pie de toda página pública. */
const FUENTES = ['Banco de España', 'CNMV', 'INE', 'Seguridad Social', 'Tesoro Público', 'BOE']

/** El héroe que pasea por el horizonte del pie, con lo justo para reconocerlo. */
const EQUIPO_CAMINANTE = ['casco-media', 'espada-media', 'alas-basica']

function Marca() {
  return (
    <EnlaceCompleto href="/" className={styles.marca}>
      <svg className={styles.moneda} viewBox="0 0 5 5" shapeRendering="crispEdges" aria-hidden="true">
        <g className={pixel.paletaCamino}>
          <PixelSprite sprite={MONEDA} paleta={PALETA_CAMINO} />
        </g>
      </svg>
      {NOMBRE_SITIO}
    </EnlaceCompleto>
  )
}

export function MarcoPublico({
  conSesion,
  children,
}: {
  /** Quien ya juega ve "Mi partida" en vez de "Entrar". */
  conSesion: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`${escenas.noche} ${styles.marco}`}>
      <a href="#contenido" className={styles.saltar}>
        Saltar al contenido
      </a>
      <header className={styles.cabecera}>
        <Marca />
        <nav aria-label="Principal" className={styles.nav}>
          <EnlaceCompleto href="/#mundos">Mundos</EnlaceCompleto>
          <EnlaceCompleto href="/#como-se-juega">Cómo se juega</EnlaceCompleto>
          <Link href={RUTA_CURSOS as Route}>Cursos</Link>
        </nav>
        <div className={styles.acciones}>
          {conSesion ? (
            <EnlaceCompleto href="/" className={styles.entrar}>
              Mi partida
            </EnlaceCompleto>
          ) : (
            <EnlaceCompleto href="/Login" className={styles.entrar} rel="nofollow">
              Entrar
            </EnlaceCompleto>
          )}
          <SketchButton href={RUTA_JUGAR} recargar size="sm" rel="nofollow">
            Jugar gratis
          </SketchButton>
        </div>
      </header>

      <main id="contenido" className={styles.contenido}>
        {children}
      </main>

      {/* El pie es la superficie de un planeta: la página baja por el
          espacio y aterriza aquí. Por el horizonte camina el héroe. */}
      <footer className={styles.pie}>
        <div className={styles.horizonte} aria-hidden="true">
          <div className={styles.caminante}>
            <svg viewBox="0 0 32 46" width={64} height={92} shapeRendering="crispEdges">
              <PixelHero pose="camina" equipo={EQUIPO_CAMINANTE} />
            </svg>
          </div>
          <svg className={styles.superficie} width="100%" height={24} shapeRendering="crispEdges">
            <defs>
              {/* Un trozo de roca de 16x8 píxeles de juego, a escala 3. */}
              <pattern id="pie-roca" width={16} height={8} patternUnits="userSpaceOnUse" patternTransform="scale(3)">
                <rect x={0} y={2} width={16} height={6} className={styles.roca} />
                <rect x={0} y={0} width={5} height={1} className={styles.rocaLuz} />
                <rect x={8} y={0} width={6} height={1} className={styles.rocaLuz} />
                <rect x={0} y={1} width={16} height={1} className={styles.rocaLuz} />
                <rect x={3} y={4} width={3} height={1} className={styles.rocaSombra} />
                <rect x={11} y={3} width={2} height={1} className={styles.rocaSombra} />
                <rect x={8} y={6} width={3} height={1} className={styles.rocaSombra} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pie-roca)" />
          </svg>
        </div>

        <div className={styles.pieCuerpo}>
          <Marca />
          <nav aria-label="Juega">
            <ul className={styles.pieEnlaces}>
              <li>
                <EnlaceCompleto href={RUTA_JUGAR} rel="nofollow">
                  Empezar sin registrarse
                </EnlaceCompleto>
              </li>
              <li>
                <EnlaceCompleto href="/Registro" rel="nofollow">
                  Crear una cuenta
                </EnlaceCompleto>
              </li>
              <li>
                <EnlaceCompleto href="/Login" rel="nofollow">
                  Entrar
                </EnlaceCompleto>
              </li>
            </ul>
          </nav>
          <p className={styles.fuentes}>
            Cifras oficiales de {FUENTES.slice(0, -1).join(', ')} y {FUENTES[FUENTES.length - 1]}.
          </p>
          <p className={styles.aviso}>Contenido educativo, no asesoramiento financiero.</p>
        </div>
      </footer>
    </div>
  )
}
