'use client'

/**
 * Resumen.
 *
 * Es la página que se abre al entrar, así que solo enseña las tres cosas que se
 * miran de un vistazo: cuánto hay, cómo ha ido el mes y qué se ha movido.
 *
 * El aspecto vive en `page.module.css`; los primitivos, en
 * `src/presentation/components/ui`. Aquí no hay ni un `style` suelto a
 * propósito: en cuanto se cuela uno, deja de haber un sistema.
 *
 * Las tarjetas cuelgan DIRECTAMENTE de la rejilla —la columna se la pasa cada
 * una por `className`— y no de un `<div>` envoltorio: `SketchCard` alterna el
 * radio de las esquinas con `:nth-of-type(even)`, y un envoltorio por tarjeta
 * haría que todas fueran la primera y salieran idénticas.
 */

import Link from 'next/link'
import { Container } from '@mantine/core'
import { IconArrowsExchange, IconPlus, IconWallet } from '@tabler/icons-react'
import { useCuentas } from '@/src/application/hooks/useCuentas'
import { useMovimientos } from '@/src/application/hooks/useMovimientos'
import { usePatrimonio, useTotalesDelMes } from '@/src/application/hooks/useInformes'
import { SketchButton, SketchCard } from '@/src/presentation/components/ui'
import { currentPeriod, monthRange } from '@/lib/dates'
import { formatDate, formatMoney, formatMoneySigned, formatPeriod } from '@/lib/format'
import { money } from '@/lib/money'
import styles from './page.module.css'

export default function ResumenPage() {
  const periodo = currentPeriod()
  const rango = monthRange(periodo)

  const { data: patrimonio } = usePatrimonio()
  const totales = useTotalesDelMes(periodo)
  const cuentas = useCuentas(undefined, { paginate: false })
  const ultimos = useMovimientos(
    { desde: rango.from, hasta: rango.to },
    { page: 1, pageSize: 8, sortBy: 'fecha', sortDir: 'desc' },
  )

  const t = totales.data
  const listaCuentas = cuentas.result.data ?? []
  const listaMovimientos = ultimos.result.data ?? []

  return (
    <Container fluid px="xl" py="xl">
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Resumen</h1>
          <div className={styles.headerActions}>
            <SketchButton
              href="/Movimientos/Create"
              leftSection={<IconPlus size={16} stroke={2.2} />}
            >
              Nuevo movimiento
            </SketchButton>
            <SketchButton
              href="/Movimientos/Transferencia"
              variant="secondary"
              leftSection={<IconArrowsExchange size={16} stroke={2.2} />}
            >
              Transferencia
            </SketchButton>
          </div>
        </header>

        <div className={styles.grid}>
          <SketchCard
            className={styles.colPatrimonio}
            variant="highlight"
            tone="accent"
            ribbon
            eyebrow="Patrimonio"
            icon={<IconWallet size={18} stroke={2.2} />}
          >
            {/* Una cifra por divisa. Nunca un total único (regla dura 2). */}
            {patrimonio && patrimonio.length > 0 ? (
              patrimonio.map((m) => (
                <span key={m.currency} className={`${styles.cifraGrande} tabular`}>
                  {formatMoney(m)}
                </span>
              ))
            ) : (
              <span className={styles.vacio}>—</span>
            )}
          </SketchCard>

          <SketchCard
            className={styles.colMes}
            eyebrow={formatPeriod(periodo)}
            title="Cómo va el mes"
          >
            <div className={styles.estadisticas}>
              <div className={styles.estadistica}>
                <span className={styles.estadisticaEtiqueta}>Ingresos</span>
                <span className={`${styles.estadisticaValor} ${styles.ingreso} tabular`}>
                  {t ? formatMoney(money(t.ingresos, t.divisa)) : '—'}
                </span>
              </div>
              <div className={styles.estadistica}>
                <span className={styles.estadisticaEtiqueta}>Gastos</span>
                <span className={`${styles.estadisticaValor} ${styles.gasto} tabular`}>
                  {t ? formatMoney(money(t.gastos, t.divisa)) : '—'}
                </span>
              </div>
              <div className={styles.estadistica}>
                <span className={styles.estadisticaEtiqueta}>Neto</span>
                {/* Con signo: es lo que dice si el mes suma o resta sin depender
                    del color. */}
                <span className={`${styles.estadisticaValor} tabular`}>
                  {t ? formatMoneySigned(money(t.neto, t.divisa)) : '—'}
                </span>
              </div>
            </div>
          </SketchCard>

          <SketchCard
            className={styles.colCuentas}
            title="Cuentas"
            actions={
              <Link href="/Cuentas" className={styles.enlace}>
                Ver todas
              </Link>
            }
          >
            {listaCuentas.length > 0 ? (
              <ul className={styles.lista}>
                {listaCuentas.slice(0, 6).map((c) => (
                  <li key={c.id} className={styles.fila}>
                    <span className={styles.filaTexto}>{c.nombre}</span>
                    <span className={`${styles.filaImporte} tabular`}>
                      {formatMoney(money(c.saldo, c.divisa))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.vacio}>
                Todavía no hay cuentas.{' '}
                <Link href="/Cuentas/Create" className={styles.enlace}>
                  Crea la primera
                </Link>
                .
              </p>
            )}
          </SketchCard>

          <SketchCard
            className={styles.colMovimientos}
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
                    {/* Con signo siempre: es lo que distingue ingreso de gasto
                        sin depender del color. */}
                    <span
                      className={`${styles.filaImporte} ${
                        m.importe < 0 ? styles.gasto : styles.ingreso
                      } tabular`}
                    >
                      {formatMoneySigned(money(m.importe, m.divisa))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.vacio}>No hay movimientos este mes.</p>
            )}
          </SketchCard>
        </div>
      </div>
    </Container>
  )
}
