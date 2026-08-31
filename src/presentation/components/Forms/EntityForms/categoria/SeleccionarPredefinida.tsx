'use client'

/**
 * Elegir una categoría predefinida en vez de crearla desde cero.
 *
 * Vive dentro de `/Categorias/Create`, como alternativa al formulario
 * personalizado: es la rama "de las que ya tenemos definidas" del alta de
 * categoría. Activar una fila reutiliza la fila (predefinida y oculta desde
 * el seed) — no crea un registro nuevo, solo la hace visible — y si es de
 * gasto sin presupuesto todavía, lo pide ahí mismo.
 */

import { useState } from 'react'
import { Group, Stack, Text } from '@mantine/core'
import { useActivarCategoria, useCategorias } from '@/src/application/hooks/useCategorias'
import { MoneyInput } from '@/src/presentation/components/Forms/GenericForm/MoneyInput'
import { EmptyState, SketchButton } from '@/src/presentation/components/ui'
import { DIVISA_APP } from '@/lib/money'
import type { CategoriaListDto } from '@/src/types/categoria.types'
import styles from './SeleccionarPredefinida.module.css'

interface SeleccionarPredefinidaProps {
  onActivada: () => void
}

function FilaCategoria({
  categoria,
  onActivada,
}: {
  categoria: CategoriaListDto
  onActivada: () => void
}) {
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
          onClick={async () => {
            if (await activar(categoria.id, presupuesto)) onActivada()
          }}
        >
          Añadir
        </SketchButton>
      </Group>
    </Group>
  )
}

export function SeleccionarPredefinida({ onActivada }: SeleccionarPredefinidaProps) {
  const { result, query } = useCategorias({ oculta: 'true' }, { paginate: false })
  const categorias = result.data ?? []

  if (!query.isLoading && categorias.length === 0) {
    return (
      <EmptyState
        compacto
        dibujo="etiquetas"
        titulo="No queda ninguna predefinida"
        descripcion="Ya has añadido todas. Prueba a crear una nueva personalizada."
      />
    )
  }

  return (
    <Stack gap={0}>
      {categorias.map((c) => (
        <FilaCategoria key={c.id} categoria={c} onActivada={onActivada} />
      ))}
    </Stack>
  )
}
