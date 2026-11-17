'use client'

/**
 * El filtro de una columna: el embudo de la cabecera y su desplegable.
 *
 * Qué campo se enseña depende del tipo de la columna, y el de dinero merece
 * mención: es un `MoneyInput`, que se escribe en EUROS ("45,90") y publica
 * céntimos. Antes era un `NumberInput` rotulado "Importe (céntimos)", que le
 * pedía a la persona la unidad interna de la aplicación (regla dura 1: los
 * céntimos son cosa del código, la pantalla habla en euros).
 */

import { useMemo, useState } from 'react'
import { ActionIcon, Button, Group, NumberInput, Popover, Select, Stack, TextInput } from '@mantine/core'
import { IconFilter, IconFilterFilled, IconX } from '@tabler/icons-react'
import { DIVISA_APP } from '@/lib/money'
import type { EnumValueDto } from '@/src/types/formMetadata.types'
import { MoneyInput } from '../Forms/GenericForm/MoneyInput'
import {
  accessorDe,
  OPERADORES,
  OPERADORES_SERVIDOR,
  valorDe,
  type AppTableColumn,
  type ColumnFilter,
  type ColumnType,
  type FilterOperator,
} from './columnas'

type Opcion = { value: string; label: string }

interface FiltroColumnaProps<T> {
  col: AppTableColumn<T>
  filtro?: ColumnFilter
  onChange: (filtro: ColumnFilter | undefined) => void
  /** Modo servidor: solo se ofrece la igualdad (ver `OPERADORES_SERVIDOR`). */
  manual: boolean
  enumMetadata?: Record<string, EnumValueDto[]>
  data: T[]
}

const SI_NO: Opcion[] = [
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
]

/**
 * Las opciones de un filtro `enum` o `boolean`, por orden de preferencia: las
 * declaradas en la columna, las del metadata del recurso, Sí/No, y como último
 * recurso los valores presentes en los datos cargados. En modo servidor eso es
 * solo la página visible, y por eso `filterOptions` es la vía recomendada para
 * las columnas de catálogo.
 */
function opcionesDe<T>(
  col: AppTableColumn<T>,
  tipo: ColumnType,
  enumMetadata: Record<string, EnumValueDto[]> | undefined,
  data: T[],
): Opcion[] {
  if (col.filterOptions) return col.filterOptions
  const delMetadata = enumMetadata?.[col.enumKey ?? accessorDe(col)]
  if (delMetadata) return delMetadata.map((v) => ({ value: v.key, label: v.label }))
  if (tipo === 'boolean') return SI_NO

  const vistos = new Set<string>()
  for (const row of data) {
    const v = valorDe(row, accessorDe(col))
    if (v !== null && v !== undefined && v !== '') vistos.add(String(v))
  }
  return [...vistos].sort((a, b) => a.localeCompare(b, 'es')).map((v) => ({ value: v, label: v }))
}

const comoNumero = (v: string | number | undefined | null): number | null =>
  v === undefined || v === null || v === '' ? null : Number(v)

/** El campo (o los dos, con "entre") donde se escribe el valor del filtro. */
function CampoValor({
  tipo,
  filtro,
  operator,
  opciones,
  setValor,
}: {
  tipo: ColumnType
  filtro?: ColumnFilter
  operator: FilterOperator
  opciones: Opcion[]
  setValor: (value: string | number | null, valueTo?: string | number) => void
}) {
  const entre = operator === 'between'

  if (tipo === 'enum' || tipo === 'boolean') {
    return (
      <Select
        size="xs"
        label="Valor"
        placeholder="Cualquiera"
        data={opciones}
        value={filtro?.value == null ? null : String(filtro.value)}
        clearable
        searchable={opciones.length > 8}
        onChange={(v) => setValor(v)}
      />
    )
  }

  if (tipo === 'money') {
    return (
      <Group grow gap="xs" align="flex-end">
        <MoneyInput
          size="xs"
          label="Importe"
          divisa={DIVISA_APP}
          value={comoNumero(filtro?.value)}
          onChange={(c) => setValor(c, filtro?.valueTo)}
        />
        {entre && (
          <MoneyInput
            size="xs"
            label="Hasta"
            divisa={DIVISA_APP}
            value={comoNumero(filtro?.valueTo)}
            onChange={(c) => setValor(filtro?.value ?? null, c ?? undefined)}
          />
        )}
      </Group>
    )
  }

  if (tipo === 'number') {
    return (
      <Group grow gap="xs" align="flex-end">
        <NumberInput
          size="xs"
          label="Valor"
          value={filtro?.value ?? ''}
          onChange={(v) => setValor(v === '' ? null : Number(v), filtro?.valueTo)}
        />
        {entre && (
          <NumberInput
            size="xs"
            label="Hasta"
            value={filtro?.valueTo ?? ''}
            onChange={(v) => setValor(filtro?.value ?? null, Number(v))}
          />
        )}
      </Group>
    )
  }

  return (
    <TextInput
      size="xs"
      label="Valor"
      placeholder={tipo === 'date' ? 'AAAA-MM-DD' : 'Escribe para filtrar'}
      value={filtro?.value == null ? '' : String(filtro.value)}
      onChange={(e) => setValor(e.currentTarget.value)}
    />
  )
}

export function FiltroColumna<T>({
  col,
  filtro,
  onChange,
  manual,
  enumMetadata,
  data,
}: FiltroColumnaProps<T>) {
  const [abierto, setAbierto] = useState(false)
  const tipo = col.type ?? 'string'
  const operadores = manual ? OPERADORES_SERVIDOR : OPERADORES[tipo]
  const operator = filtro?.operator ?? operadores[0].value
  const activo = filtro?.value !== undefined && filtro.value !== null && filtro.value !== ''

  const opciones = useMemo(
    () => opcionesDe(col, tipo, enumMetadata, data),
    [col, tipo, enumMetadata, data],
  )

  const setValor = (value: string | number | null, valueTo?: string | number) => {
    if (value === null || value === '') onChange(undefined)
    else onChange({ operator, value, valueTo })
  }

  return (
    <Popover opened={abierto} onChange={setAbierto} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon
          size="sm"
          variant={activo ? 'filled' : 'subtle'}
          color={activo ? 'blue' : 'gray'}
          aria-label={`Filtrar por ${col.title ?? accessorDe(col)}`}
          onClick={(e) => {
            e.stopPropagation()
            setAbierto((o) => !o)
          }}
        >
          {activo ? <IconFilterFilled size={14} /> : <IconFilter size={14} />}
        </ActionIcon>
      </Popover.Target>

      <Popover.Dropdown onClick={(e) => e.stopPropagation()}>
        <Stack gap="xs" w={240}>
          {operadores.length > 1 && (
            <Select
              size="xs"
              label="Operador"
              data={operadores}
              value={operator}
              allowDeselect={false}
              onChange={(v) =>
                onChange(
                  filtro ? { ...filtro, operator: (v as FilterOperator) ?? operator } : undefined,
                )
              }
            />
          )}

          <CampoValor
            tipo={tipo}
            filtro={filtro}
            operator={operator}
            opciones={opciones}
            setValor={setValor}
          />

          {activo && (
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconX size={14} />}
              onClick={() => {
                onChange(undefined)
                setAbierto(false)
              }}
            >
              Quitar filtro
            </Button>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
