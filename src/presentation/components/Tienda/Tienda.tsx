'use client'

/**
 * La rejilla de objetos y el probador.
 *
 * El probador pinta al héroe con lo que lleva más el objeto que se esté mirando,
 * sin comprar nada. También se prueba al enfocar con el teclado, no solo al pasar
 * el ratón: el objeto se decide por lo que se ve, y sin esto solo lo vería quien
 * tiene ratón.
 *
 * Si un objeto se puede pagar es cortesía para no enseñar un botón inútil; quien
 * lo decide de verdad es el repositorio (regla dura 6).
 *
 * Comprar se nota: la pieza aparece en el probador con un gesto y unos destellos
 * (el ESTRENO, que pinta `HeroeGrande`) y las estrellas bajan contando. Solo lo
 * que se acaba de comprar: ni al cargar la página ni al equipar algo que ya era
 * tuyo. Y va por encima de la compra, sin retrasarla: la mutación termina igual y
 * el estreno se deriva de lo que devuelve.
 */

import { useEffect, useState } from 'react'
import { Button, Group, VisuallyHidden } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck } from '@tabler/icons-react'
import {
  useComprarObjeto,
  useEquiparObjeto,
  useQuitarObjeto,
} from '@/src/application/hooks/useCuadro'
import { conObjetoPuesto, HUECOS, type Hueco } from '@/lib/tienda'
import type { ObjetoTiendaDto, TiendaDto } from '@/src/types/tienda.types'
import { EscenaHeroe, EstrellaPixel, ObjetoPixel } from '../Pixel/HeroeGrande'
import { useMovimientoReducido } from '../Pixel/useMovimientoReducido'
import { AnimatedCount, SketchButton, SketchCard, StatusBadge } from '../ui'
import styles from './Tienda.module.css'

type Filtro = Hueco | 'todo'

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'todo', texto: 'Todo' },
  ...HUECOS.map((valor) => ({ valor, texto: valor.charAt(0).toUpperCase() + valor.slice(1) })),
]

/**
 * Cuánto dura la marca de estreno: lo más largo de su animación en
 * `pixel.module.css` (el último destello sale a los 0,45 s y dura 0,6 s), con
 * margen. Pasado esto se quita, para que pasar el ratón por otra pieza del mismo
 * hueco y volver no la haga parpadear otra vez.
 */
const DURACION_ESTRENO = 1100

const avisarDeError = (error: Error) =>
  notifications.show({ title: 'No se ha podido', message: error.message, color: 'red' })

function AccionObjeto({
  objeto,
  disponibles,
  alComprar,
}: {
  objeto: ObjetoTiendaDto
  disponibles: number
  /** Marca (o desmarca, con `null`) lo que se está comprando. */
  alComprar: (id: string | null) => void
}) {
  const comprar = useComprarObjeto()
  const equipar = useEquiparObjeto()
  const quitar = useQuitarObjeto()
  const opciones = { onError: avisarDeError }

  if (objeto.equipado) {
    return (
      <>
        <StatusBadge tone="positive" size="sm" icon={<IconCheck size={11} stroke={2.4} />}>
          Equipado
        </StatusBadge>
        <SketchButton
          variant="ghost"
          size="sm"
          loading={quitar.isPending}
          onClick={() => quitar.mutate(objeto.id, opciones)}
        >
          Quitar
        </SketchButton>
      </>
    )
  }

  if (objeto.comprado) {
    return (
      <SketchButton
        variant="secondary"
        size="sm"
        loading={equipar.isPending}
        onClick={() => equipar.mutate(objeto.id, opciones)}
      >
        Equipar
      </SketchButton>
    )
  }

  const faltan = objeto.precio - disponibles
  return (
    <>
      <SketchButton
        variant="secondary"
        size="sm"
        disabled={faltan > 0}
        loading={comprar.isPending}
        leftSection={<EstrellaPixel tamano={14} />}
        onClick={() => {
          alComprar(objeto.id)
          comprar.mutate(objeto.id, {
            onError: (error) => {
              alComprar(null)
              avisarDeError(error)
            },
          })
        }}
      >
        Comprar por {objeto.precio}
      </SketchButton>
      {faltan > 0 && (
        <span className={styles.faltan}>
          Te {faltan === 1 ? 'falta' : 'faltan'} {faltan}
        </span>
      )}
    </>
  )
}

export function Tienda({ tienda }: { tienda: TiendaDto }) {
  const [filtro, setFiltro] = useState<Filtro>('todo')
  const [probando, setProbando] = useState<string | null>(null)
  // Lo que se está comprando: se marca al pulsar, antes de que responda el
  // servidor. El estreno se DERIVA de que ya conste como comprado, y así llega
  // en el mismo render que los datos nuevos: si se marcase al terminar la
  // mutación, la pieza se vería un fotograma quieta antes de empezar el gesto.
  const [comprando, setComprando] = useState<string | null>(null)
  const reducido = useMovimientoReducido()
  const { disponibles, ganadas } = tienda.estrellas

  const recienComprado = tienda.objetos.find((o) => o.id === comprando && o.comprado)
  const estreno = recienComprado && !reducido ? recienComprado.id : null

  // Por el id y no por el objeto: si la tienda se vuelve a pedir, el objeto es
  // otro aunque sea el mismo, y el temporizador volvería a empezar.
  const idComprado = recienComprado?.id
  useEffect(() => {
    if (!idComprado) return
    const temporizador = setTimeout(() => setComprando(null), DURACION_ESTRENO)
    return () => clearTimeout(temporizador)
  }, [idComprado])

  const visibles = tienda.objetos.filter((o) => filtro === 'todo' || o.hueco === filtro)
  const equipo = probando ? conObjetoPuesto(tienda.equipo, probando) : tienda.equipo

  return (
    <div className={styles.tienda}>
      <aside className={styles.probador}>
        <SketchCard eyebrow="Probador" role="region" aria-label="Probador">
          <EscenaHeroe equipo={equipo} estreno={estreno} />
          <p className={styles.saldo}>
            <EstrellaPixel tamano={24} />
            <AnimatedCount valor={disponibles} className={styles.saldoCifra} /> para gastar
          </p>
          {/* El gesto solo se ve: esto lo cuenta. No depende del movimiento
              reducido, que apaga la animación pero no la noticia. */}
          <VisuallyHidden role="status">{recienComprado ? `${recienComprado.nombre}, comprado y puesto` : ''}</VisuallyHidden>
          {ganadas === 0 && (
            <SketchButton href="/CaminoHeroe" variant="ghost" size="sm" fullWidth>
              Gana estrellas en el Camino del héroe
            </SketchButton>
          )}
        </SketchCard>
      </aside>

      <div className={styles.catalogo}>
        <Group gap="xs" role="group" aria-label="Filtrar por tipo de objeto">
          {FILTROS.map(({ valor, texto }) => (
            <Button
              key={valor}
              size="xs"
              variant={filtro === valor ? 'filled' : 'default'}
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
            >
              {texto}
            </Button>
          ))}
        </Group>

        <ul className={styles.objetos}>
          {visibles.map((objeto) => (
            <li
              key={objeto.id}
              className={styles.objeto}
              data-equipado={objeto.equipado}
              onPointerEnter={() => setProbando(objeto.id)}
              onPointerLeave={() => setProbando(null)}
              onFocus={() => setProbando(objeto.id)}
              onBlur={() => setProbando(null)}
            >
              <span className={styles.dibujo}>
                <ObjetoPixel objeto={objeto} caja={160} />
              </span>
              <span className={styles.nombre}>{objeto.nombre}</span>
              <span className={styles.accion}>
                <AccionObjeto objeto={objeto} disponibles={disponibles} alComprar={setComprando} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
