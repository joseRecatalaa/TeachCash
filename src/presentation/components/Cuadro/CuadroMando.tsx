'use client'

/**
 * Las cuatro tarjetas del Cuadro de mando. Las tarjetas cuelgan directamente de
 * la rejilla porque `SketchCard` alterna el radio con `:nth-of-type(even)`.
 *
 * Lo que se enseña lo ha calculado el servidor: aquí no se suma nada.
 */

import { IconArrowRight, IconBuildingStore, IconChartRadar, IconSword, IconWallet } from '@tabler/icons-react'
import { formatMoneySigned } from '@/lib/format'
import { DIVISA_APP, money } from '@/lib/money'
import { HUECOS, objetoPorId, type Hueco } from '@/lib/tienda'
import type { CuadroDto } from '@/src/types/cuadro.types'
import { RadarEstadisticas } from '../Charts/FinanceCharts'
import { EscenaHeroe, EstrellaPixel } from '../Pixel/HeroeGrande'
import { AnimatedMoney, SketchButton, SketchCard } from '../ui'
import styles from './CuadroMando.module.css'

const NOMBRE_HUECO: Record<Hueco, string> = {
  casco: 'Casco',
  armadura: 'Armadura',
  guantes: 'Guantes',
  botas: 'Botas',
  arma: 'Arma',
  escudo: 'Escudo',
  alas: 'Alas',
}

function TarjetaPatrimonio({
  patrimonio,
  ganancia,
  inicialElegido,
}: Pick<CuadroDto, 'patrimonio' | 'ganancia' | 'inicialElegido'>) {
  return (
    <SketchCard
      className={styles.colPatrimonio}
      variant="highlight"
      tone="accent"
      ribbon
      eyebrow="Patrimonio total"
      icon={<IconWallet size={18} stroke={2.2} />}
      role="region"
      aria-label="Patrimonio total"
    >
      <AnimatedMoney valor={patrimonio} className={`${styles.cifra} tabular`} />
      <p className={styles.ganancia} data-signo={Math.sign(ganancia)}>
        {ganancia === 0 ? (
          'Sin cambios desde que empezaste'
        ) : (
          // El signo va en la cifra: el color solo lo refuerza.
          <>
            <span className="tabular">{formatMoneySigned(money(ganancia, DIVISA_APP))}</span> desde que empezaste
          </>
        )}
      </p>
      {/* La pregunta vive en /Patrimonio; sin esto, quien entra por la portada no la encontraría. */}
      <SketchButton href="/Patrimonio" variant="ghost" size="sm" rightSection={<IconArrowRight size={15} />}>
        {inicialElegido ? 'Ver mi patrimonio' : '¿Con cuánto empiezas? Dímelo aquí'}
      </SketchButton>
    </SketchCard>
  )
}

function TarjetaEstrellas({ estrellas }: Pick<CuadroDto, 'estrellas'>) {
  return (
    <SketchCard
      className={styles.colEstrellas}
      eyebrow="Estrellas"
      icon={<IconBuildingStore size={18} stroke={2.2} />}
      role="region"
      aria-label="Estrellas"
    >
      <p className={styles.estrellas}>
        <EstrellaPixel tamano={32} />
        <span className={styles.cifra}>{estrellas.disponibles}</span>
        <span>para gastar</span>
      </p>
      {estrellas.ganadas === 0 ? (
        <>
          <p className={styles.nota}>Supera tu primer curso para ganar estrellas.</p>
          <SketchButton href="/CaminoHeroe" variant="ghost" size="sm" rightSection={<IconArrowRight size={15} />}>
            Ir al Camino del héroe
          </SketchButton>
        </>
      ) : (
        <>
          <p className={styles.nota}>
            {estrellas.ganadas} ganadas · {estrellas.gastadas} gastadas
          </p>
          <SketchButton href="/Tienda" variant="ghost" size="sm" rightSection={<IconArrowRight size={15} />}>
            Ir a la tienda
          </SketchButton>
        </>
      )}
    </SketchCard>
  )
}

function TarjetaHeroe({ equipo }: Pick<CuadroDto, 'equipo'>) {
  const puesto = new Map(equipo.flatMap((id) => {
    const objeto = objetoPorId(id)
    return objeto ? [[objeto.hueco, objeto.nombre] as const] : []
  }))
  return (
    <SketchCard
      className={styles.colMitad}
      eyebrow="Tu héroe"
      icon={<IconSword size={18} stroke={2.2} />}
      role="region"
      aria-label="Tu héroe"
    >
      <EscenaHeroe equipo={equipo} />
      <ul className={styles.huecos}>
        {HUECOS.map((hueco) => (
          <li key={hueco} className={styles.hueco} data-vacio={!puesto.has(hueco)}>
            <span className={styles.huecoNombre}>{NOMBRE_HUECO[hueco]}</span>
            <span>{puesto.get(hueco) ?? 'Sin equipar'}</span>
          </li>
        ))}
      </ul>
    </SketchCard>
  )
}

function TarjetaEstadisticas({ estadisticas }: Pick<CuadroDto, 'estadisticas'>) {
  return (
    <SketchCard
      className={styles.colMitad}
      eyebrow="Estadísticas"
      icon={<IconChartRadar size={18} stroke={2.2} />}
      role="region"
      aria-label="Estadísticas"
    >
      <RadarEstadisticas datos={estadisticas} />
      <dl className={styles.estadisticas}>
        {estadisticas.map((e) => (
          <div key={e.clave} className={styles.estadistica}>
            <dt>
              <span className={styles.clave}>{e.clave}</span> {e.nombre}
            </dt>
            <dd className={styles.valor}>{e.valor}</dd>
            <dd className={styles.fuente}>{e.fuente}</dd>
          </div>
        ))}
      </dl>
    </SketchCard>
  )
}

export function CuadroMando({ cuadro }: { cuadro: CuadroDto }) {
  return (
    <div className={`${styles.grid} sd-enter`}>
      <TarjetaPatrimonio
        patrimonio={cuadro.patrimonio}
        ganancia={cuadro.ganancia}
        inicialElegido={cuadro.inicialElegido}
      />
      <TarjetaEstrellas estrellas={cuadro.estrellas} />
      <TarjetaHeroe equipo={cuadro.equipo} />
      <TarjetaEstadisticas estadisticas={cuadro.estadisticas} />
    </div>
  )
}
