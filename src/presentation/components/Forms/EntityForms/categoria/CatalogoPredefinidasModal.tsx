'use client'

/**
 * Catálogo de categorías ocultas: las de fábrica sin activar todavía, y
 * cualquiera que el propio usuario haya ocultado antes.
 *
 * Activar una de gasto sin presupuesto pide el importe ahí mismo — no tiene
 * sentido dejarla entrar en Planificación mensual sin uno, y es justo el
 * momento en el que la persona ya está pensando en esa categoría.
 */

import { useState } from 'react'
import { Group, Modal, Stack, Text } from '@mantine/core'
import { useActivarCategoria, useCategorias } from '@/src/application/hooks/useCategorias'
import { MoneyInput } from '@/src/presentation/components/Forms/GenericForm/MoneyInput'
import { EmptyState, SketchButton } from '@/src/presentation/components/ui'
import { DIVISA_APP } from '@/lib/money'
import type { CategoriaListDto } from '@/src/types/categoria.types'
import styles from './CatalogoPredefinidasModal.module.css'

interface CatalogoPredefinidasModalProps {
  onClose: () => void
}

function FilaCategoria({ categoria }: { categoria: CategoriaListDto }) {
  const { activar, isPending } = useActivarCategoria()
  // Solo una de gasto sin presupuesto todavía necesita que se lo pidan aquí:
  // una de ingreso no lo usa, y una que ya tuvo uno (se ocultó y se reactiva)
  // lo conserva sin volver a preguntarlo.
  const necesitaPresupuesto = categoria.tipo === 'expense' && categoria.presupuesto === null
  const [presupuesto, setPresupuesto] = useState<number | null>(categoria.presupuesto)
  const bloqueada = necesitaPresupuesto && (presupuesto === null || presupuesto <= 0)

  return (
    <Group justify="space-between" wrap="nowrap" className={styles.fila}>
      <Group gap="xs" wrap="nowrap">
        {categoria.icono && (
          <span aria-hidden className={styles.icono}>
            {categoria.icono}
          </span>
        )}
        <Text size="sm">{categoria.nombre}</Text>
      </Group>
      <Group gap="xs" wrap="nowrap">
        {necesitaPresupuesto && (
          <MoneyInput
            value={presupuesto}
            onChange={setPresupuesto}
            divisa={DIVISA_APP}
            placeholder="Presupuesto"
            size="xs"
            w={130}
            aria-label={`Presupuesto mensual de ${categoria.nombre}`}
          />
        )}
        <SketchButton
          size="sm"
          variant="secondary"
          loading={isPending}
          disabled={bloqueada}
          onClick={() => activar(categoria.id, presupuesto)}
        >
          Activar
        </SketchButton>
      </Group>
    </Group>
  )
}

export function CatalogoPredefinidasModal({ onClose }: CatalogoPredefinidasModalProps) {
  const { result, query } = useCategorias({ oculta: 'true' }, { paginate: false })
  const categorias = result.data ?? []

  return (
    <Modal opened onClose={onClose} title="Categorías predefinidas" size="lg" centered>
      {!query.isLoading && categorias.length === 0 ? (
        <EmptyState
          compacto
          dibujo="etiquetas"
          titulo="No hay categorías por activar"
          descripcion="Todas las predefinidas ya están activas, o las has ocultado. Crea una nueva desde «Nueva categoría»."
        />
      ) : (
        <Stack gap={0}>
          {categorias.map((c) => (
            <FilaCategoria key={c.id} categoria={c} />
          ))}
        </Stack>
      )}
    </Modal>
  )
}
