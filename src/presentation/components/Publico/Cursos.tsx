/*
 * Las páginas públicas de los cursos: el índice (`/aprende`) y la de cada
 * mundo (`/aprende/<mundo>`). Son las que pueden salir en Google por lo que la
 * gente busca ("aprender a ahorrar", "salir de deudas"), y por eso cada mundo
 * lleva un título y una descripción escritos para eso (`seo` en su
 * `mundo.json`).
 *
 * Enseñan la ficha de cada nivel (título, qué es, cuánto dura, de qué trata),
 * nunca su contenido: las lecciones y las preguntas se juegan dentro.
 */

import Link from 'next/link'
import type { Route } from 'next'
import { RUTA_CURSOS, rutaCurso } from '@/lib/seo'
import type { MundoPublicoDto } from '@/src/types/heroe.types'
import { LIBRO, MANDO, MONSTRUO, type Sprite } from '../Pixel/sprites'
import { SketchButton } from '../ui'
import { EnlaceCompleto } from './EnlaceCompleto'
import { DibujoPixel } from './DibujoPixel'
import { RUTA_JUGAR } from './MarcoPublico'
import { PlanetaPixel } from './PlanetaPixel'
import { QUE_ES, medida, resumir } from './resumen'
import styles from './Cursos.module.css'

const ICONO: Record<MundoPublicoDto['niveles'][number]['tipo'], { sprite: Sprite; escala: number }> = {
  lectura: { sprite: LIBRO, escala: 3 },
  interactivo: { sprite: MANDO, escala: 3 },
  jefe: { sprite: MONSTRUO, escala: 2 },
}

/** Adonde entra "Jugar este mundo": su camino dentro del juego. */
const rutaJugarMundo = (id: string) => `/CaminoHeroe/Mundo?id=${encodeURIComponent(id)}`

function Niveles({ mundo }: { mundo: MundoPublicoDto }) {
  return (
    <ol className={styles.niveles}>
      {mundo.niveles.map((n) => {
        const icono = ICONO[n.tipo]
        return (
          <li key={n.id} className={styles.nivel} data-tipo={n.tipo}>
            <DibujoPixel
              sprite={icono.sprite}
              escala={icono.escala}
              decorado={mundo.decorado}
              className={styles.nivelDibujo}
            />
            <div>
              <h3 className={styles.nivelTitulo}>{n.titulo}</h3>
              <p className={styles.nivelMeta}>
                {QUE_ES[n.tipo]} · {n.minutos} min
              </p>
              <p className={styles.nivelTexto}>{n.descripcion}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function IndiceCursos({ mundos }: { mundos: readonly MundoPublicoDto[] }) {
  const r = resumir(mundos)
  return (
    <div className={styles.pagina}>
      <header className={styles.cabecera}>
        <h1 className={styles.titulo}>Cursos gratis de educación financiera</h1>
        <p className={styles.entradilla}>
          {r.niveles} niveles cortos para construir una relación sana con tu dinero: presupuesto, ahorro, inversión
          y deudas. Se juegan como un videojuego a píxel, gratis y sin registrarte.
        </p>
        <SketchButton href={RUTA_JUGAR} recargar size="lg" rel="nofollow">
          Empieza a jugar gratis
        </SketchButton>
      </header>

      {mundos.map((m) => (
        <section key={m.id} className={styles.mundo} aria-labelledby={`mundo-${m.id}`}>
          <div className={styles.mundoCabecera}>
            <PlanetaPixel decorado={m.decorado} />
            <div>
              <h2 id={`mundo-${m.id}`} className={styles.h2}>
                <Link href={rutaCurso(m.id) as Route}>{m.seo.titulo}</Link>
              </h2>
              <p className={styles.medida}>
                Mundo {m.titulo} · {medida(m)}
              </p>
              <p className={styles.descripcion}>{m.seo.descripcion}</p>
            </div>
          </div>
          <Niveles mundo={m} />
        </section>
      ))}
    </div>
  )
}

export function CursoMundo({
  mundo,
  otros,
}: {
  mundo: MundoPublicoDto
  otros: readonly MundoPublicoDto[]
}) {
  return (
    <div className={styles.pagina}>
      <nav aria-label="Estás en" className={styles.migas}>
        <ol>
          <li>
            <EnlaceCompleto href="/">Inicio</EnlaceCompleto>
          </li>
          <li>
            <Link href={RUTA_CURSOS as Route}>Cursos</Link>
          </li>
          <li aria-current="page">{mundo.titulo}</li>
        </ol>
      </nav>

      <header className={`${styles.cabecera} ${styles.cabeceraMundo}`}>
        <div>
          <h1 className={styles.titulo}>{mundo.seo.titulo}</h1>
          <p className={styles.entradilla}>{mundo.seo.descripcion}</p>
          <p className={styles.medida}>
            Mundo {mundo.titulo} · {medida(mundo)} · Gratis
          </p>
          <SketchButton href={rutaJugarMundo(mundo.id)} recargar size="lg" rel="nofollow">
            Jugar este mundo
          </SketchButton>
        </div>
        <PlanetaPixel decorado={mundo.decorado} escala={3} />
      </header>

      <section className={styles.mundo} aria-labelledby="titulo-camino">
        <h2 id="titulo-camino" className={styles.h2}>
          El camino, nivel a nivel
        </h2>
        <p className={styles.descripcion}>
          {mundo.descripcion} Los niveles se juegan en orden y el último es el jefe del mundo.
        </p>
        <Niveles mundo={mundo} />
      </section>

      {otros.length > 0 && (
        <section className={styles.otros} aria-labelledby="titulo-otros">
          <h2 id="titulo-otros" className={styles.h2}>
            Otros mundos
          </h2>
          <ul>
            {otros.map((o) => (
              <li key={o.id}>
                <PlanetaPixel decorado={o.decorado} escala={1} />
                <Link href={rutaCurso(o.id) as Route}>{o.seo.titulo}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className={styles.aviso}>Contenido educativo, no asesoramiento financiero.</p>
    </div>
  )
}
