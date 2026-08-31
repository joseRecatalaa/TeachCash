'use client'

/**
 * Inicio.
 *
 * Es la página que se abre al entrar y la única con tarjetas "de portada": el
 * resto de la aplicación es trabajo (tablas y formularios) y no debe competir
 * con esta.
 *
 * Responde a cuatro preguntas, en este orden, que es el orden en que se miran:
 * cuánto hay, cómo va el mes, en qué se va el dinero y qué se ha movido.
 *
 * Aquí no hay ni un `style` suelto a propósito: en cuanto se cuela uno, deja de
 * haber un sistema. El aspecto vive en `page.module.css`; los primitivos, en
 * `src/presentation/components/ui`.
 *
 * Las tarjetas cuelgan DIRECTAMENTE de la rejilla —la columna se la pasa cada
 * una por `className`— y no de un `<div>` envoltorio: `SketchCard` alterna el
 * radio de las esquinas con `:nth-of-type(even)`, y un envoltorio por tarjeta
 * haría que todas fueran la primera y salieran idénticas.
 */

import Link from 'next/link'
import { Container } from '@mantine/core'
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconChartPie,
  IconPlus,
  IconWallet,
} from '@tabler/icons-react'
import { useMovimientos } from '@/src/application/hooks/useMovimientos'
import {
  useGastoPorCategoria,
  useIngresosVsGastos,
  useSaldo,
  useSerieSaldo,
  useTotalesDelMes,
} from '@/src/application/hooks/useInformes'
import {
  GastoPorCategoriaChart,
  IngresosVsGastosChart,
  SerieSaldoChart,
} from '@/src/presentation/components/Charts/FinanceCharts'
import {
  AnimatedMoney,
  EmptyState,
  SketchButton,
  SketchCard,
} from '@/src/presentation/components/ui'
import { addMonths, currentPeriod, monthRange } from '@/lib/dates'
import { formatDate, formatMoney, formatPercent, formatPeriod } from '@/lib/format'
import { DIVISA_APP, money } from '@/lib/money'
import styles from './page.module.css'

/**
 * Variación entre dos importes, para el pie de las fichas del mes.
 *
 * Devuelve `null` cuando el mes anterior fue cero: "ha subido un infinito por
 * ciento" no es información, es ruido. En ese caso la ficha simplemente no
 * enseña comparación.
 */
function variacion(actual: number, anterior: number): { ratio: number; sube: boolean } | null {
  if (anterior === 0) return null
  const ratio = (actual - anterior) / Math.abs(anterior)
  if (ratio === 0) return null
  return { ratio: Math.abs(ratio), sube: ratio > 0 }
}

/**
 * El pie de una ficha del mes.
 *
 * `bueno` dice si subir es una buena noticia, y por eso lo decide quien llama:
 * en ingresos subir es bueno y en gastos no. Sin ese parámetro, la flecha verde
 * hacia arriba estaría felicitando por gastar más.
 */
function Comparacion({
  actual,
  anterior,
  bueno,
}: {
  actual: number
  anterior: number | undefined
  bueno: 'sube' | 'baja'
}) {
  if (anterior === undefined) return null
  const v = variacion(actual, anterior)
  if (!v) return <span className={styles.compaNeutra}>igual que el mes pasado</span>

  const positivo = bueno === 'sube' ? v.sube : !v.sube
  const Icono = v.sube ? IconArrowUpRight : IconArrowDownRight

  return (
    <span className={positivo ? styles.compaBuena : styles.compaMala}>
      <Icono size={13} stroke={2.6} aria-hidden />
      {/* El texto dice la dirección; el color y la flecha solo la refuerzan. */}
      {formatPercent(v.ratio)} {v.sube ? 'más' : 'menos'} que el mes pasado
    </span>
  )
}

export default function InicioPage() {
  const periodo = currentPeriod()
  const anterior = addMonths(periodo, -1)
  const rango = monthRange(periodo)

  const saldo = useSaldo()
  const totales = useTotalesDelMes(periodo)
  const totalesAnterior = useTotalesDelMes(anterior)
  const gasto = useGastoPorCategoria(periodo)
  const ingresosVsGastos = useIngresosVsGastos(12)
  const serie = useSerieSaldo()
  const ultimos = useMovimientos(
    { desde: rango.from, hasta: rango.to },
    { page: 1, pageSize: 8, sortBy: 'fecha', sortDir: 'desc' },
  )

  const t = totales.data
  const prev = totalesAnterior.data
  const listaGasto = gasto.data ?? []
  const listaMovimientos = ultimos.result.data ?? []

  const totalGastoMes = listaGasto.reduce((acc, g) => acc + g.total, 0)

  return (
    <Container fluid px="xl" py="xl">
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Inicio</h1>
            <p className={styles.subtitulo}>{formatPeriod(periodo)}</p>
          </div>
        </header>

        <div className={`${styles.grid} sd-enter`}>
          <SketchCard
            className={styles.colSaldo}
            variant="highlight"
            tone="accent"
            ribbon
            eyebrow="Saldo"
            icon={<IconWallet size={18} stroke={2.2} />}
          >
            {/* Una sola cifra: una cuenta y una divisa. El saldo NO está
                guardado en ninguna parte, es la suma de los movimientos
                (regla dura 7). */}
            <AnimatedMoney
              valor={saldo.data}
              signed
              className={`${styles.cifraGrande} tabular`}
            />
            <p className={styles.pieSaldo}>
              {saldo.data === undefined
                ? 'Calculando…'
                : 'Suma de todo lo anotado hasta hoy.'}
            </p>
          </SketchCard>

          <SketchCard
            className={styles.colMes}
            variant="sticker"
            tilt="right"
            eyebrow={formatPeriod(periodo)}
            title="Cómo va el mes"
          >
            <div className={styles.estadisticas}>
              <div className={styles.estadistica} data-tono="ingreso">
                <span className={styles.estadisticaEtiqueta}>Ingresos</span>
                <AnimatedMoney
                  valor={t?.ingresos}
                  className={`${styles.estadisticaValor} ${styles.ingreso} tabular`}
                />
                {t && (
                  <Comparacion actual={t.ingresos} anterior={prev?.ingresos} bueno="sube" />
                )}
              </div>
              <div className={styles.estadistica} data-tono="gasto">
                <span className={styles.estadisticaEtiqueta}>Gastos</span>
                <AnimatedMoney
                  valor={t?.gastos}
                  className={`${styles.estadisticaValor} ${styles.gasto} tabular`}
                />
                {t && <Comparacion actual={t.gastos} anterior={prev?.gastos} bueno="baja" />}
              </div>
              <div className={styles.estadistica} data-tono="neto">
                <span className={styles.estadisticaEtiqueta}>Neto</span>
                {/* Con signo: es lo que dice si el mes suma o resta sin
                    depender del color. */}
                <AnimatedMoney
                  valor={t?.neto}
                  signed
                  className={`${styles.estadisticaValor} tabular`}
                />
                {t && <Comparacion actual={t.neto} anterior={prev?.neto} bueno="sube" />}
              </div>
            </div>
          </SketchCard>

          <SketchCard
            className={styles.colSerie}
            title="Evolución del saldo"
            eyebrow="Últimos 12 meses"
          >
            <SerieSaldoChart datos={serie.data ?? []} />
          </SketchCard>

          <SketchCard
            className={styles.colCategorias}
            tone="warning"
            ribbon
            title="En qué se va"
            icon={<IconChartPie size={18} stroke={2.2} />}
            eyebrow={formatPeriod(periodo)}
          >
            <GastoPorCategoriaChart datos={listaGasto} />
            {listaGasto.length > 0 && (
              <ul className={styles.top}>
                {listaGasto.slice(0, 5).map((g, i) => (
                  <li key={g.categoriaId || g.categoriaNombre} className={styles.topFila}>
                    {/* Misma regla que en el gráfico: el color sigue a la
                        categoría, y solo las que no tienen ninguno caen al
                        reparto por posición. */}
                    <span
                      className={styles.chapaColor}
                      data-color={g.categoriaColor || `cat-${(i % 8) + 1}`}
                      aria-hidden
                    />
                    <span className={styles.topNombre}>{g.categoriaNombre}</span>
                    <span className={`${styles.topImporte} tabular`}>
                      {formatMoney(money(g.total, DIVISA_APP))}
                    </span>
                    <span className={styles.topPeso}>
                      {totalGastoMes > 0 ? formatPercent(g.total / totalGastoMes) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SketchCard>

          <SketchCard
            className={styles.colBarras}
            title="Ingresos frente a gastos"
            eyebrow="Últimos 12 meses"
          >
            <IngresosVsGastosChart datos={ingresosVsGastos.data ?? []} />
          </SketchCard>

          <SketchCard
            className={styles.colMovimientos}
            variant="sticker"
            tilt="left"
            title="Últimos movimientos"
            actions={
              <Link href="/Movimientos" className={styles.enlace}>
                Ver todos
              </Link>
            }
          >
            {listaMovimientos.length > 0 ? (
              <ul className={styles.lista}>
                {listaMovimientos.map((m) => (
                  <li key={m.id} className={styles.fila}>
                    <span className={styles.filaFecha}>{formatDate(m.fecha)}</span>
                    <span className={styles.filaTexto}>{m.descripcion}</span>
                    {m.categoriaId && (
                      <span
                        className={styles.chapaColor}
                        data-color={m.categoriaColor || 'ninguno'}
                        title={m.categoriaNombre}
                        aria-hidden
                      />
                    )}
                    {/* Con signo siempre: es lo que distingue ingreso de gasto
                        sin depender del color. */}
                    <span
                      className={`${styles.filaImporte} ${
                        m.importe < 0 ? styles.gasto : styles.ingreso
                      } tabular`}
                    >
                      {formatMoney(money(m.importe, DIVISA_APP))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                dibujo="libreta"
                titulo="Este mes está en blanco"
                descripcion="Anota tu primer gasto o ingreso y aparecerá aquí."
                accion={
                  <SketchButton
                    href="/Movimientos/Create"
                    size="sm"
                    leftSection={<IconPlus size={15} stroke={2.4} />}
                  >
                    Anotar uno
                  </SketchButton>
                }
              />
            )}
          </SketchCard>
        </div>
      </div>
    </Container>
  )
}
