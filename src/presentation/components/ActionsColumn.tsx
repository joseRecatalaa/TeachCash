'use client'

/**
 * Helpers de columna.
 *
 * Un `columns.ts` es un `.ts` sin JSX, así que no puede escribir un `render` con
 * botones dentro. Estos helpers son la salida: la config DECLARA qué acciones
 * quiere y el JSX vive aquí.
 *
 * Al declarar columnas, usa estos en vez de escribir un `render` a mano: es lo
 * que mantiene todas las tablas de la aplicación con el mismo aspecto.
 */

import { useState } from 'react'
import Link from 'next/link'
import { ActionIcon, Group, Modal, Button, Text, Tooltip } from '@mantine/core'
import { useDelete } from '@refinedev/core'
import { useInvalidarDerivados } from '@/src/application/hooks/useInformes'
import { notifications } from '@mantine/notifications'
import { IconArrowBackUp, IconPencil, IconTrash } from '@tabler/icons-react'
import { extractActionError } from '@/src/application/hooks/useEntityFormSubmit'
import type { AppTableColumn } from './AppTable/AppTable'

// ─────────────────────────────────────────────────────────────────────────────
// Botón de borrado con confirmación
// ─────────────────────────────────────────────────────────────────────────────

function BotonBorrar({
  id,
  resource,
  displayName,
  entityName,
}: {
  id: string
  resource: string
  /** Cómo se llama la fila concreta ("Compra semanal"), para el diálogo. */
  displayName: string
  /** Cómo se llama la entidad ("el movimiento"), para el diálogo. */
  entityName: string
}) {
  const [abierto, setAbierto] = useState(false)
  const { mutateAsync, mutation } = useDelete()
  const invalidarDerivados = useInvalidarDerivados()

  const borrar = async () => {
    try {
      await mutateAsync({ resource, id })
      // El saldo y los gráficos son sumas de movimientos y viven en otro árbol
      // de queries: Refine no los invalida solo.
      await invalidarDerivados()
      notifications.show({ title: 'Hecho', message: 'Registro eliminado', color: 'teal' })
      setAbierto(false)
    } catch (err) {
      // El repositorio devuelve mensajes escritos para una persona ("La
      // categoría tiene 3 movimientos..."), así que se enseñan tal cual.
      notifications.show({
        title: 'No se ha podido borrar',
        message: extractActionError(err),
        color: 'red',
      })
    }
  }

  return (
    <>
      <Tooltip label="Eliminar">
        <ActionIcon
          variant="subtle"
          // El token y no `color="red"`: la paleta roja de Mantine no tiene
          // variante oscura en este proyecto y en modo oscuro se apaga.
          c="var(--expense)"
          aria-label={`Eliminar ${displayName}`}
          onClick={(e) => {
            e.stopPropagation()
            setAbierto(true)
          }}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>

      <Modal
        opened={abierto}
        onClose={() => setAbierto(false)}
        title="Confirmar borrado"
        centered
      >
        <Text size="sm" mb="lg">
          ¿Seguro que quieres eliminar {entityName} <strong>{displayName}</strong>? Esta acción
          no se puede deshacer.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button variant="filled" c="var(--sd-ink-inverse)" bg="var(--expense)" loading={mutation.isPending} onClick={borrar}>
            Eliminar
          </Button>
        </Group>
      </Modal>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionsColumnConfig<T> {
  /** Ruta base de la entidad, en PascalCase: `"/Movimientos"`. */
  editPath: string
  /** Campo que identifica la fila. Por defecto `'id'`. */
  rowKey?: string
  /**
   * Botón de borrado. Sin esto no hay papelera: hay listados donde borrar no
   * tiene sentido y es mejor que no aparezca a que aparezca y falle.
   */
  remove?: {
    /** Clave de `REPOSITORIES`. */
    resource: string
    /** Cómo nombrar la entidad en el diálogo: `"el movimiento"`. */
    entityName: string
    /** Campo cuyo valor identifica la fila para la persona. Por defecto `'nombre'`. */
    displayName?: string
  }
  /** Si devuelve false, la fila no ofrece editar (p. ej. estando en la papelera). */
  canEdit?: (row: T) => boolean
  /**
   * Botón de restaurar, para los listados que enseñan la papelera de un borrado
   * lógico. `canRestore` decide en qué filas aparece.
   */
  restore?: {
    onRestore: (id: string) => void
    canRestore: (row: T) => boolean
  }
}

/**
 * Columna de acciones. Va siempre la última.
 *
 * @example
 * actionsColumn<MovimientoListDto>({
 *   editPath: '/Movimientos',
 *   remove: { resource: 'Movimientos', entityName: 'el movimiento' },
 * })
 */
export function actionsColumn<T extends object>({
  editPath,
  rowKey = 'id',
  remove,
  canEdit,
  restore,
}: ActionsColumnConfig<T>): AppTableColumn<T> {
  return {
    accessor: '__acciones',
    title: 'Acciones',
    textAlign: 'right',
    width: 110,
    sortable: false,
    render: (row: T) => {
      const fila = row as Record<string, unknown>
      const id = String(fila[rowKey] ?? '')
      const nombre = String(fila[remove?.displayName ?? 'nombre'] ?? id)
      const editable = canEdit?.(row) ?? true
      const restaurable = restore?.canRestore(row) ?? false

      return (
        <Group gap={4} justify="flex-end" wrap="nowrap" onClick={(e) => e.stopPropagation()}>
          {restaurable && restore && (
            <Tooltip label="Restaurar">
              <ActionIcon
                variant="subtle"
                c="var(--income)"
                aria-label={`Restaurar ${nombre}`}
                onClick={() => restore.onRestore(id)}
              >
                <IconArrowBackUp size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {editable && (
            <Tooltip label="Editar">
              <ActionIcon
                variant="subtle"
                component={Link}
                href={`${editPath}/Edit?id=${encodeURIComponent(id)}`}
                aria-label={`Editar ${nombre}`}
              >
                <IconPencil size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {remove && (
            <BotonBorrar
              id={id}
              resource={remove.resource}
              displayName={nombre}
              entityName={remove.entityName}
            />
          )}
        </Group>
      )
    },
  }
}

/** Columna de importe. Atajo para no repetir `type`/`divisaAccessor` en cada una. */
export function moneyColumn<T extends object>(
  accessor: string,
  title: string,
  options: {
    /** Pinta el signo siempre y colorea ingreso/gasto. Para importes con signo. */
    signed?: boolean
    /**
     * Campo de la fila con la divisa. Sin esto se formatea con `DIVISA_APP`,
     * que es lo normal: la aplicación trabaja en una sola moneda.
     */
    divisaAccessor?: string
    sortable?: boolean
    filterable?: boolean
  } = {},
): AppTableColumn<T> {
  return {
    accessor,
    title,
    type: 'money',
    signed: options.signed,
    divisaAccessor: options.divisaAccessor,
    sortable: options.sortable ?? true,
    filterable: options.filterable ?? false,
  }
}

/** Columna de fecha civil ('YYYY-MM-DD'). Nunca un `Date`. */
export function dateColumn<T extends object>(
  accessor: string,
  title: string,
  options: { sortable?: boolean; filterable?: boolean } = {},
): AppTableColumn<T> {
  return {
    accessor,
    title,
    type: 'date',
    sortable: options.sortable ?? true,
    filterable: options.filterable ?? true,
  }
}

/** Columna de enum, pintada como badge con el label del metadata. */
export function enumColumn<T extends object>(
  accessor: string,
  title: string,
  options: {
    enumKey?: string
    badgeColors?: Record<string, string>
    sortable?: boolean
    filterable?: boolean
  } = {},
): AppTableColumn<T> {
  return {
    accessor,
    title,
    type: 'enum',
    enumKey: options.enumKey,
    badge: true,
    badgeColors: options.badgeColors,
    sortable: options.sortable ?? true,
    filterable: options.filterable ?? true,
  }
}

/** Columna booleana ("Sí"/"No"). */
export function boolColumn<T extends object>(
  accessor: string,
  title: string,
): AppTableColumn<T> {
  return { accessor, title, type: 'boolean', sortable: true, filterable: true }
}

/** Columna de texto, buscable y filtrable. El caso más común. */
export function textColumn<T extends object>(
  accessor: string,
  title: string,
  options: { searchable?: boolean; filterable?: boolean; sortable?: boolean } = {},
): AppTableColumn<T> {
  return {
    accessor,
    title,
    type: 'string',
    searchable: options.searchable ?? true,
    filterable: options.filterable ?? true,
    sortable: options.sortable ?? true,
  }
}
