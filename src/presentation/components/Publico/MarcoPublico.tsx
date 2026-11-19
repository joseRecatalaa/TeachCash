/*
 * El marco de las páginas públicas (la portada sin sesión y los cursos): la
 * cabecera y el pie. Lo monta `app/layout.tsx` EN LUGAR de la aplicación
 * (`esPaginaPublica`), así que aquí no hay Refine, ni Mantine, ni cuenta: es
 * HTML del servidor, que es lo que lee Google.
 *
 * Los enlaces que salen hacia la aplicación (jugar, entrar, la portada con
 * sesión) son `<a>` de los de siempre y no `<Link>`: el layout decide al CARGAR
 * si monta la aplicación, y una navegación de `<Link>` no vuelve a pasar por
 * él. Se quedaría sin sesión ni proveedores. Solo los que van de un curso a
 * otro son `<Link>`.
 */

import Link from 'next/link'
import type { Route } from 'next'
import { LEMA, NOMBRE_SITIO, RUTA_CURSOS, rutaCurso } from '@/lib/seo'
import { PixelSprite } from '../Pixel/PixelSprite'
import pixel from '../Pixel/pixel.module.css'
import { MONEDA, PALETA_CAMINO } from '../Pixel/sprites'
import { SketchButton } from '../ui'
import { EnlaceCompleto } from './EnlaceCompleto'
import styles from './MarcoPublico.module.css'

/** Adonde lleva "Jugar": el mapa de mundos. Crea el invitado al llegar. */
export const RUTA_JUGAR = '/CaminoHeroe'

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
  mundos,
  children,
}: {
  /** Quien ya juega ve "Mi partida" en vez de "Entrar". */
  conSesion: boolean
  /** Para el pie: un enlace a cada curso. */
  mundos: readonly { id: string; titulo: string }[]
  children: React.ReactNode
}) {
  return (
    <div className={styles.marco}>
      <a href="#contenido" className={styles.saltar}>
        Saltar al contenido
      </a>
      <header className={styles.cabecera}>
        <Marca />
        <nav aria-label="Principal" className={styles.nav}>
          <EnlaceCompleto href="/#mundos">Mundos</EnlaceCompleto>
          <EnlaceCompleto href="/#como-se-juega">Cómo se juega</EnlaceCompleto>
          <Link href={RUTA_CURSOS as Route}>Cursos</Link>
          <EnlaceCompleto href="/#preguntas">Preguntas</EnlaceCompleto>
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

      <footer className={styles.pie}>
        <div className={styles.pieMarca}>
          <Marca />
          <p>{LEMA}.</p>
        </div>
        <nav aria-label="Cursos" className={styles.pieLista}>
          <h2 className={styles.pieTitulo}>Cursos gratis</h2>
          <ul>
            {mundos.map((m) => (
              <li key={m.id}>
                <Link href={rutaCurso(m.id) as Route}>{m.titulo}</Link>
              </li>
            ))}
            <li>
              <Link href={RUTA_CURSOS as Route}>Todos los cursos</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Tu cuenta" className={styles.pieLista}>
          <h2 className={styles.pieTitulo}>Juega</h2>
          <ul>
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
        <p className={styles.aviso}>
          Contenido educativo, no asesoramiento financiero. Las cifras son de España y cada una lleva su
          fuente oficial.
        </p>
      </footer>
    </div>
  )
}
