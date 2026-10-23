'use client'

/*
 * Las páginas de un nivel de lectura, una a una, con su barra de progreso.
 * Al acabar la última, el minitest.
 *
 * Los importes de los ejemplos llegan en céntimos y con signo, como en el
 * resto de la aplicación, y se formatean igual que un movimiento.
 */

import { useState } from 'react'
import { Progress } from '@mantine/core'
import { IconArrowLeft, IconArrowRight, IconBulb, IconSword } from '@tabler/icons-react'
import { formatMoneySigned } from '@/lib/format'
import { DIVISA_APP, money } from '@/lib/money'
import type { Bloque, Pagina } from '@/src/types/heroe.types'
import { SketchButton } from '../../ui'
import styles from './reproductor.module.css'

function BloqueLectura({ bloque }: { bloque: Bloque }) {
  switch (bloque.tipo) {
    case 'parrafo':
      return <p className={styles.parrafo}>{bloque.texto}</p>
    case 'idea':
      return (
        <p className={styles.idea}>
          <IconBulb size={20} aria-hidden className={styles.ideaIcono} />
          <span>{bloque.texto}</span>
        </p>
      )
    case 'lista':
      return (
        <ul className={styles.lista}>
          {bloque.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'ejemplo':
      return (
        <figure className={styles.ejemplo}>
          <figcaption className={styles.ejemploTitulo}>{bloque.titulo}</figcaption>
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
          {bloque.nota && <p className={styles.nota}>{bloque.nota}</p>}
        </figure>
      )
  }
}

export function Lectura({ paginas, alTerminar }: { paginas: Pagina[]; alTerminar: () => void }) {
  const [i, setI] = useState(0)
  const pagina = paginas[i]
  const ultima = i === paginas.length - 1

  return (
    <article className={styles.lectura} aria-label={`Página ${i + 1} de ${paginas.length}`}>
      <div className={styles.progreso}>
        <span>
          Página {i + 1} de {paginas.length}
        </span>
        <Progress value={((i + 1) / paginas.length) * 100} aria-hidden className={styles.barra} />
      </div>

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
