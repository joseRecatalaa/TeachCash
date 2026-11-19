/*
 * La portada pública: lo que ve quien llega a www.teachcash.es sin sesión, y
 * lo que lee Google.
 *
 * Todo gira alrededor del lema del proyecto: educación financiera al alcance
 * de cualquiera, una relación sana con la economía, un videojuego a píxel
 * gratuito. Cada sección es una razón para entrar y la prueba de esa razón:
 *
 *   1. Qué es, con el héroe en su isla (el mismo del Cuadro de mando).
 *   2. Por qué hace falta: un dato oficial y verificado, dicho sin asustar.
 *   3. Qué se aprende: los mundos como planetas, con sus cursos.
 *   4. Cómo se juega: lección, práctica y jefe, con sus dibujos del juego.
 *   5. Lo que se gana: el probador, donde se viste al héroe de verdad.
 *   6. Para tu dinero: el gestor.
 *   7. Por qué fiarse: las fuentes oficiales.
 *   8. Las dudas de quien aún no ha entrado.
 *   9. La invitación final.
 *
 * Las cifras ("cuatro mundos", "108 estrellas") salen del contenido
 * (`resumir`): ninguna va escrita a mano. Se pinta en el servidor; lo único de
 * cliente es el probador.
 */

import Link from 'next/link'
import type { Route } from 'next'
import { LEMA, RUTA_CURSOS, rutaCurso } from '@/lib/seo'
import type { MundoPublicoDto } from '@/src/types/heroe.types'
import { EscenarioHeroe } from '../Pixel/EscenarioHeroe'
import { BARRAS, CERDITO, CORAZON, ESTRELLA, LIBRO, MANDO, MONEDA, MONSTRUO, TARJETITA } from '../Pixel/sprites'
import { SketchButton } from '../ui'
import { DibujoPixel } from './DibujoPixel'
import { RUTA_JUGAR } from './MarcoPublico'
import { PlanetaPixel } from './PlanetaPixel'
import { PREGUNTAS } from './preguntas'
import { Probador } from './Probador'
import { enLetra, enLetraMayuscula, medida, resumir } from './resumen'
import styles from './Portada.module.css'

/** El héroe de la portada, con algo de equipo: se ve que se gana algo. */
const EQUIPO_PORTADA = ['casco-media', 'espada-media', 'escudo-basica', 'botas-basica', 'alas-basica']

function Jugar({ children = 'Empieza a jugar gratis' }: { children?: string }) {
  return (
    <SketchButton href={RUTA_JUGAR} recargar size="lg" rel="nofollow">
      {children}
    </SketchButton>
  )
}

export function Portada({ mundos }: { mundos: readonly MundoPublicoDto[] }) {
  const r = resumir(mundos)
  const primerMundo = mundos[0]

  return (
    <div className={styles.portada}>
      {/* ── 1. Qué es ─────────────────────────────────────────────────── */}
      <section className={styles.heroe} aria-labelledby="titulo-portada">
        <div className={styles.heroeTexto}>
          <h1 id="titulo-portada" className={styles.titulo}>
            {LEMA}
          </h1>
          <p className={styles.entradilla}>
            Construye una relación sana con la economía mediante un videojuego a píxel gratuito.
          </p>
          <p className={styles.cercano}>
            Lecciones de {r.minutosMin} a {r.minutosMax} minutos, ejemplos de la vida diaria y un héroe que crece
            contigo. Sin registrarte, sin anuncios y sin pagar nada.
          </p>
          <div className={styles.llamadas}>
            <Jugar />
            <SketchButton href={RUTA_CURSOS as Route} variant="ghost" size="lg">
              Ver los cursos
            </SketchButton>
          </div>
        </div>
        <div className={styles.heroeDibujo}>
          {/* Dos tamaños y no uno escalado por CSS: a una escala que no es
              entera, el píxel se emborrona (`EscenarioHeroe`). */}
          <div className={styles.soloMovil}>
            <EscenarioHeroe equipo={EQUIPO_PORTADA} escala={3} />
          </div>
          <div className={styles.soloAncho}>
            <EscenarioHeroe equipo={EQUIPO_PORTADA} escala={5} />
          </div>
        </div>
      </section>

      {/* ── 2. Por qué ────────────────────────────────────────────────── */}
      <section className={styles.porque} aria-labelledby="titulo-porque">
        <div className={styles.ancho}>
          <h2 id="titulo-porque" className={styles.h2}>
            Nadie nos enseñó a manejar el dinero
          </h2>
          <div className={styles.porqueCuerpo}>
            <figure className={styles.dato}>
              <p className={styles.cifra}>36,4 %</p>
              <figcaption>
                de las personas en España no podría afrontar un gasto imprevisto con sus propios recursos.
                <cite>INE, Encuesta de Condiciones de Vida 2025</cite>
              </figcaption>
            </figure>
            <div className={styles.porqueTexto}>
              <p>
                En el colegio aprendimos ecuaciones, pero no a leer una nómina, a comparar un préstamo o a saber
                cuánto apartar para cuando se rompe la lavadora. No es culpa tuya, y nunca es tarde.
              </p>
              <p>
                TeachCash existe para eso: para que entender el dinero deje de dar miedo. Poco a poco, a tu ritmo,
                jugando y sin que nadie te juzgue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Los mundos ─────────────────────────────────────────────── */}
      <section id="mundos" className={styles.seccion} aria-labelledby="titulo-mundos">
        <div className={styles.ancho}>
          <h2 id="titulo-mundos" className={styles.h2}>
            {enLetraMayuscula(r.mundos)} mundos, {r.niveles} niveles
          </h2>
          <p className={styles.intro}>
            Cada mundo es un planeta y cada planeta, un tema de la vida real. Están todos abiertos desde el primer
            día: empieza por el que más te preocupe.
          </p>
          <ul className={styles.mundos}>
            {mundos.map((m) => (
              <li key={m.id} className={styles.mundo}>
                <PlanetaPixel decorado={m.decorado} />
                <h3 className={styles.h3}>
                  <Link href={rutaCurso(m.id) as Route}>{m.titulo}</Link>
                </h3>
                <p className={styles.medida}>{medida(m)}</p>
                <p>{m.descripcion}</p>
                <p className={styles.empieza}>
                  Empieza por: <strong>{m.niveles[0]?.titulo}</strong>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 4. Cómo se juega ──────────────────────────────────────────── */}
      <section id="como-se-juega" className={styles.seccionSuave} aria-labelledby="titulo-como">
        <div className={styles.ancho}>
          <h2 id="titulo-como" className={styles.h2}>
            Así se juega un nivel
          </h2>
          <p className={styles.intro}>
            Cada mundo es un camino que sube nivel a nivel hasta su jefe. Cada nivel te da hasta tres estrellas.
          </p>
          <ol className={styles.pasos}>
            <li className={styles.paso}>
              <DibujoPixel sprite={LIBRO} escala={5} className={styles.pasoDibujo} />
              <h3 className={styles.h3}>Lee una lección corta</h3>
              <p>
                De {r.minutosMin} a {r.minutosMax} minutos, con ejemplos de Pepito, que se equivoca para que no te
                equivoques tú. Al final, un minitest de unas pocas preguntas.
              </p>
            </li>
            <li className={styles.paso}>
              <DibujoPixel sprite={MANDO} escala={5} className={styles.pasoDibujo} />
              <h3 className={styles.h3}>Practica con casos reales</h3>
              <p>
                Calcula una cuota, ordena un presupuesto, empareja conceptos o rellena el hueco. Cada ejercicio se
                corrige al momento y te explica el porqué.
              </p>
            </li>
            <li className={styles.paso}>
              <DibujoPixel
                sprite={MONSTRUO}
                escala={3}
                decorado={primerMundo?.decorado}
                className={styles.pasoDibujo}
              />
              <h3 className={styles.h3}>Vence al jefe del mundo</h3>
              <p>
                Un monstruo que se alimenta de los malos hábitos: el que te susurra que no mires la cuenta o que
                pagues «solo veinte euritos al mes». Derrótalo con todo lo que sabes.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* ── 5. Lo que se gana ─────────────────────────────────────────── */}
      <section className={styles.seccion} aria-labelledby="titulo-probador">
        <div className={styles.ancho}>
          <h2 id="titulo-probador" className={styles.h2}>
            Gana estrellas y equipa a tu héroe
          </h2>
          <p className={styles.intro}>
            Las estrellas se ganan aprendiendo, nunca pagando. Con ellas compras casco, escudo, espada o unas alas
            de oro en la tienda. Pruébaselo aquí: pulsa cada pieza para cambiarla.
          </p>
          <Probador estrellasPosibles={r.estrellas} />
        </div>
      </section>

      {/* ── 6. El gestor ──────────────────────────────────────────────── */}
      <section className={styles.seccionSuave} aria-labelledby="titulo-gestor">
        <div className={`${styles.ancho} ${styles.gestor}`}>
          <div>
            <h2 id="titulo-gestor" className={styles.h2}>
              Y cuando quieras, llévalo a tu dinero
            </h2>
            <p className={styles.intro}>
              Junto al juego tienes un gestor de finanzas personales, sencillo y sin conectar tu banco: tú decides
              qué apuntas.
            </p>
          </div>
          <ul className={styles.usos}>
            <li>
              <DibujoPixel sprite={TARJETITA} escala={4} />
              <span>
                <strong>Apunta tus gastos e ingresos</strong> en un momento, también desde el móvil.
              </span>
            </li>
            <li>
              <DibujoPixel sprite={CERDITO} escala={4} />
              <span>
                <strong>Ordénalos por categorías</strong> y descubre adónde se va el dinero cada mes.
              </span>
            </li>
            <li>
              <DibujoPixel sprite={BARRAS} escala={4} />
              <span>
                <strong>Mira tu patrimonio crecer</strong> mes a mes, con gráficos claros.
              </span>
            </li>
            <li>
              <DibujoPixel sprite={MONEDA} escala={5} />
              <span>
                <strong>Ponle un presupuesto a cada categoría</strong> y ve cuánto te queda este mes.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ── 7. Por qué fiarse ─────────────────────────────────────────── */}
      <section className={styles.veraz} aria-labelledby="titulo-veraz">
        <div className={`${styles.ancho} ${styles.verazCuerpo}`}>
          <DibujoPixel sprite={CORAZON} escala={9} className={styles.verazDibujo} />
          <div>
            <h2 id="titulo-veraz" className={styles.h2}>
              Datos de verdad, de aquí
            </h2>
            <p>
              Las cifras y las normas son las de España y salen de fuentes oficiales: el Banco de España, la CNMV,
              el INE, la Seguridad Social, el Tesoro Público o el BOE. Cada dato lleva su fuente al lado.
            </p>
            <p>
              Es contenido educativo, no asesoramiento financiero: te enseña a decidir, no decide por ti. Y no
              recomienda ningún banco ni producto.
            </p>
          </div>
        </div>
      </section>

      {/* ── 8. Preguntas ──────────────────────────────────────────────── */}
      <section id="preguntas" className={styles.seccion} aria-labelledby="titulo-preguntas">
        <div className={`${styles.ancho} ${styles.preguntas}`}>
          <h2 id="titulo-preguntas" className={styles.h2}>
            Lo que suele preguntarse antes de entrar
          </h2>
          <div className={styles.lista}>
            {PREGUNTAS.map((p) => (
              <details key={p.pregunta} className={styles.pregunta}>
                <summary>{p.pregunta}</summary>
                <p>{p.respuesta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. La invitación ──────────────────────────────────────────── */}
      <section className={styles.final} aria-labelledby="titulo-final">
        <div className={`${styles.ancho} ${styles.finalCuerpo}`}>
          <div className={styles.estrellas} aria-hidden="true">
            <DibujoPixel sprite={ESTRELLA} escala={6} />
            <DibujoPixel sprite={ESTRELLA} escala={8} />
            <DibujoPixel sprite={ESTRELLA} escala={6} />
          </div>
          <h2 id="titulo-final" className={styles.h2}>
            {r.primero
              ? `Tu primera lección dura ${enLetra(r.primero.minutos)} minutos`
              : 'Tu primera lección te espera'}
          </h2>
          <p>
            {r.primero ? `«${r.primero.titulo}». ` : ''}Sin registrarte, sin pagar y desde el móvil. Lo demás va
            llegando solo.
          </p>
          <Jugar>Empezar ahora</Jugar>
        </div>
      </section>
    </div>
  )
}
