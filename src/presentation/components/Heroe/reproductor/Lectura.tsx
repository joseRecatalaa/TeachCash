'use client'

/*
 * Las páginas de un nivel de lectura, una a una, con su barra de progreso.
 * Al acabar la última, el minitest.
 *
 * Los importes de los ejemplos llegan en céntimos y con signo, como en el
 * resto de la aplicación, y se formatean igual que un movimiento. Los textos
 * admiten `**negrita**` y `_cursiva_` (`Marcado`).
 */

import { useState } from 'react'
import { IconArrowLeft, IconArrowRight, IconBulb, IconSparkles, IconSword } from '@tabler/icons-react'
import { formatMoneySigned } from '@/lib/format'
import { DIVISA_APP, money } from '@/lib/money'
import type { Bloque, Pagina, SpriteImagen } from '@/src/types/heroe.types'
import { PixelSprite } from '../../Pixel/PixelSprite'
import pixel from '../../Pixel/pixel.module.css'
import {
  BILLETE,
  CANDADO,
  CERDITO,
  DESTELLO,
  ESCUDO,
  ESTRELLA,
  HUCHA,
  LIBRO,
  MANDO,
  MONSTRUO,
  MONTANA,
  NUBE,
  PALETA_CAMINO,
  PALETA_HEROE,
  PALETA_MUNDO,
  PINO,
  TARJETA,
  type Paleta,
  type Sprite,
} from '../../Pixel/sprites'
import { SketchButton } from '../../ui'
import { Marcado } from './Marcado'
import { ProgresoNivel } from './ProgresoNivel'
import styles from './reproductor.module.css'

function BloqueLectura({ bloque }: { bloque: Bloque }) {
  switch (bloque.tipo) {
    case 'parrafo':
      return (
        <p className={styles.parrafo}>
          <Marcado texto={bloque.texto} />
        </p>
      )
    case 'idea':
      return (
        <p className={styles.idea}>
          <IconBulb size={20} aria-hidden className={styles.ideaIcono} />
          <span>
            <Marcado texto={bloque.texto} />
          </span>
        </p>
      )
    case 'lista':
      return (
        <ul className={styles.lista}>
          {bloque.items.map((item) => (
            <li key={item}>
              <Marcado texto={item} />
            </li>
          ))}
        </ul>
      )
    case 'ejemplo':
      return (
        <figure className={styles.ejemplo}>
          <figcaption className={styles.ejemploTitulo}>
            <Marcado texto={bloque.titulo} />
          </figcaption>
          <table className={styles.tabla}>
            <tbody>
              {bloque.filas.map((fila) => (
                <tr key={fila.concepto}>
                  <th scope="row">{fila.concepto}</th>
                  <td className="tabular">{formatMoneySigned(money(fila.importe, DIVISA_APP))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bloque.nota && (
            <p className={styles.nota}>
              <Marcado texto={bloque.nota} />
            </p>
          )}
        </figure>
      )
    case 'imagen':
      return <ImagenPixel sprite={bloque.sprite} pie={bloque.pie} />
    case 'dato':
      return (
        <aside className={styles.dato} aria-label="¿Sabías que…?">
          <p className={styles.datoEncabezado} aria-hidden>
            <IconSparkles size={18} aria-hidden />
            ¿Sabías que…?
          </p>
          <p className={styles.datoTexto}>
            <Marcado texto={bloque.texto} />
          </p>
          <p className={styles.datoFuente}>Fuente: {bloque.fuente}</p>
        </aside>
      )
  }
}

/** Los sprites que puede enseñar un bloque `imagen`, con su paleta. */
const IMAGENES: Record<SpriteImagen, { sprite: Sprite; paleta: Paleta }> = {
  hucha: { sprite: HUCHA, paleta: PALETA_CAMINO },
  cerdito: { sprite: CERDITO, paleta: PALETA_CAMINO },
  escudo: { sprite: ESCUDO, paleta: PALETA_CAMINO },
  montana: { sprite: MONTANA, paleta: PALETA_CAMINO },
  tarjeta: { sprite: TARJETA, paleta: PALETA_CAMINO },
  libro: { sprite: LIBRO, paleta: PALETA_CAMINO },
  mando: { sprite: MANDO, paleta: PALETA_CAMINO },
  monstruo: { sprite: MONSTRUO, paleta: PALETA_CAMINO },
  candado: { sprite: CANDADO, paleta: PALETA_CAMINO },
  estrella: { sprite: ESTRELLA, paleta: PALETA_CAMINO },
  billete: { sprite: BILLETE, paleta: PALETA_HEROE },
  nube: { sprite: NUBE, paleta: PALETA_MUNDO },
  pino: { sprite: PINO, paleta: PALETA_MUNDO },
  destello: { sprite: DESTELLO, paleta: PALETA_HEROE },
}

/**
 * Un dibujo a píxel en una lectura. El dibujo va oculto para el lector de
 * pantalla: lo que se lee es el pie. Se escala en CSS con píxeles nítidos
 * (`crispEdges`), así que da igual el tamaño de cada sprite.
 */
function ImagenPixel({ sprite: clave, pie }: { sprite: SpriteImagen; pie?: string }) {
  const { sprite, paleta } = IMAGENES[clave]
  const ancho = sprite.filas[0].length
  const alto = sprite.filas.length
  return (
    <figure className={styles.imagen}>
      <svg
        className={`${styles.imagenDibujo} ${pixel.paleta} ${pixel.paletaCamino} ${pixel.paletaMundo}`}
        viewBox={`${sprite.x} ${sprite.y} ${ancho} ${alto}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <PixelSprite sprite={sprite} paleta={paleta} />
      </svg>
      {pie && <figcaption className={styles.imagenPie}>{pie}</figcaption>}
    </figure>
  )
}

export function Lectura({ paginas, alTerminar }: { paginas: Pagina[]; alTerminar: () => void }) {
  const [i, setI] = useState(0)
  const pagina = paginas[i]
  const ultima = i === paginas.length - 1

  return (
    <article className={styles.lectura} aria-label={`Página ${i + 1} de ${paginas.length}`}>
      <ProgresoNivel texto={`Página ${i + 1} de ${paginas.length}`} valor={((i + 1) / paginas.length) * 100} />

      <h2 className={styles.enunciado}>{pagina.titulo}</h2>
      {pagina.bloques.map((bloque, k) => (
        <BloqueLectura key={`${i}-${k}`} bloque={bloque} />
      ))}

      <div className={styles.acciones}>
        {i > 0 && (
          <SketchButton
            variant="secondary"
            onClick={() => setI(i - 1)}
            leftSection={<IconArrowLeft size={16} aria-hidden />}
          >
            Anterior
          </SketchButton>
        )}
        {ultima ? (
          <SketchButton onClick={alTerminar} leftSection={<IconSword size={16} aria-hidden />}>
            Al minitest
          </SketchButton>
        ) : (
          <SketchButton onClick={() => setI(i + 1)} rightSection={<IconArrowRight size={16} aria-hidden />}>
            Siguiente
          </SketchButton>
        )}
      </div>
    </article>
  )
}
