'use client'

/**
 * Planificación mensual.
 *
 * Un recuadro por cada categoría de gasto ACTIVA con su barra de progreso
 * (gastado / presupuesto), más una ficha de ingresos arriba. Clicar un
 * recuadro abre `MovimientoRapidoModal` para anotar un gasto sin salir de
 * aquí — que a su vez invalida `['informes']`, así que esta página, Inicio y
 * el saldo se actualizan solos en cuanto se guarda.
 *
 * No es un CRUD: lee `useCategorias` (ya registrado como recurso Refine) y
 * los informes existentes (`useGastoPorCategoria`, `useTotalesDelMes`). No
 * hace falta ningún recurso ni repositorio nuevo para pintar esta vista.
 */

import { useMemo, useState } from 'react'
import { Container, Progress } from '@mantine/core'
import { IconTargetArrow } from '@tabler/icons-react'
import { useCategorias } from '@/src/application/hooks/useCategorias'
import { useGastoPorCategoria, useTotalesDelMes } from '@/src/application/hooks/useInformes'
import { MovimientoRapidoModal } from '@/src/presentation/components/Forms/EntityForms/movimiento/MovimientoRapidoModal'
import { AnimatedMoney, EmptyState, SketchButton, SketchCard } from '@/src/presentation/components/ui'
import { currentPeriod } from '@/lib/dates'
import { formatMoney, formatPeriod } from '@/lib/format'
import { DIVISA_APP, money } from '@/lib/money'
import type { CategoriaListDto } from '@/src/types/categoria.types'
import styles from './page.module.css'

/** El tono de la ficha es refuerzo, nunca la única señal: la fracción de texto ya lo dice. */
function tonoDe(gastado: number, presupuesto: number): 'neutral' | 'positive' | 'warning' | 'danger' {
  if (presupuesto <= 0) return 'neutral'
  const ratio = gastado / presupuesto
  if (ratio >= 1) return 'danger'
  if (ratio >= 0.8) return 'warning'
  return 'positive'
}

export default function PlanificacionPage() {
  const periodo = currentPeriod()

  const { result: categoriasResult, query: categoriasQuery } = useCategorias(
    { tipo: 'expense', oculta: 'false' },
    { paginate: false },
  )
  const categorias = categoriasResult.data ?? []

  const gasto = useGastoPorCategoria(periodo)
  const totales = useTotalesDelMes(periodo)

  const gastoPorCategoria = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const g of gasto.data ?? []) mapa.set(g.categoriaId, g.total)
    return mapa
  }, [gasto.data])

  const [categoriaModal, setCategoriaModal] = useState<CategoriaListDto | null>(null)

  return (
    <Container fluid px="xl" py="xl">
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Planificación mensual</h1>
            <p className={styles.subtitulo}>{formatPeriod(periodo)}</p>
          </div>
        </header>

        <div className={styles.resumen}>
          <SketchCard
            className={styles.ingresos}
            variant="highlight"
            tone="positive"
            ribbon
            eyebrow="Ingresos del mes"
          >
            <AnimatedMoney
              valor={totales.data?.ingresos}
              className={`${styles.cifraIngresos} tabular`}
            />
          </SketchCard>

          <SketchCard
            className={styles.gastos}
            variant="highlight"
            tone="danger"
            ribbon
            eyebrow="Gastos del mes"
          >
            <AnimatedMoney
              valor={totales.data?.gastos}
              className={`${styles.cifraGastos} tabular`}
            />
          </SketchCard>
        </div>

        {!categoriasQuery.isLoading && categorias.length === 0 ? (
          <EmptyState
            dibujo="etiquetas"
            titulo="Todavía no hay categorías activas"
            descripcion="Activa una categoría de gasto con su presupuesto mensual desde Categorías para verla aquí."
            accion={
              <SketchButton href="/Categorias" leftSection={<IconTargetArrow size={15} stroke={2.4} />}>
                Ir a categorías
              </SketchButton>
            }
          />
        ) : (
          <div className={`${styles.grid} sd-enter`}>
            {categorias.map((c) => {
              const gastado = gastoPorCategoria.get(c.id) ?? 0
              const presupuesto = c.presupuesto ?? 0
              const porcentaje = presupuesto > 0 ? Math.min(100, (gastado / presupuesto) * 100) : 0

              return (
                <SketchCard
                  key={c.id}
                  className={styles.ficha}
                  tone={tonoDe(gastado, presupuesto)}
                  onClick={() => setCategoriaModal(c)}
                  icon={c.icono}
                  title={c.nombre}
                >
                  <Progress value={porcentaje} size="lg" />
                  <p className={`${styles.fraccion} tabular`}>
                    {formatMoney(money(gastado, DIVISA_APP))}
                    <span className={styles.separador}> / </span>
                    {presupuesto > 0 ? formatMoney(money(presupuesto, DIVISA_APP)) : 'sin planificar'}
                  </p>
                </SketchCard>
              )
            })}
          </div>
        )}
      </div>

      {categoriaModal && (
        <MovimientoRapidoModal categoria={categoriaModal} onClose={() => setCategoriaModal(null)} />
      )}
    </Container>
  )
}
