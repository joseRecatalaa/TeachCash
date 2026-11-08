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
 */

import { useState } from 'react'
import { Button, Group } from '@mantine/core'
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
import { SketchButton, SketchCard, StatusBadge } from '../ui'
import styles from './Tienda.module.css'

type Filtro = Hueco | 'todo'

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'todo', texto: 'Todo' },
  ...HUECOS.map((valor) => ({ valor, texto: valor.charAt(0).toUpperCase() + valor.slice(1) })),
]

const avisarDeError = (error: Error) =>
  notifications.show({ title: 'No se ha podido', message: error.message, color: 'red' })

function AccionObjeto({ objeto, disponibles }: { objeto: ObjetoTiendaDto; disponibles: number }) {
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
        onClick={() => comprar.mutate(objeto.id, opciones)}
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
  const { disponibles, ganadas } = tienda.estrellas

  const visibles = tienda.objetos.filter((o) => filtro === 'todo' || o.hueco === filtro)
  const equipo = probando ? conObjetoPuesto(tienda.equipo, probando) : tienda.equipo

  return (
    <div className={styles.tienda}>
      <aside className={styles.probador}>
        <SketchCard eyebrow="Probador" role="region" aria-label="Probador">
          <EscenaHeroe equipo={equipo} />
          <p className={styles.saldo}>
            <EstrellaPixel tamano={24} />
            <span className={styles.saldoCifra}>{disponibles}</span> para gastar
          </p>
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
                <AccionObjeto objeto={objeto} disponibles={disponibles} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
