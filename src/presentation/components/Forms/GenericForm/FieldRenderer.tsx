'use client'

/**
 * Mapea un `FieldDefinition` al componente de Mantine que le toca.
 *
 * Dos cosas que conviene tener claras al tocar este fichero:
 *
 *   1. **Los `select` de enum no llevan `options`.** Se resuelven desde
 *      `enumMetadata` usando el `name` del campo (o su `enumKey`) como clave.
 *      Ver `useFormMetadata`.
 *   2. **`money` y `date` no son casos particulares de `number` y `text`.** Son
 *      las dos reglas duras del proyecto hechas componente: entero en céntimos y
 *      fecha civil sin huso. Si alguna vez te ves añadiendo un
 *      `type: "number"` a un importe, vuelve a leer la nota de `FieldType`.
 */

import { memo } from 'react'
import {
  NumberInput,
  PasswordInput,
  Select,
  Switch,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconInfoCircle } from '@tabler/icons-react'
import type { Currency } from '@/lib/money'
import type { EnumValueDto } from '@/src/types/formMetadata.types'
import { MoneyInput } from './MoneyInput'
import type { FieldDefinition, FieldRenderArgs, Option } from './types'

interface FieldRendererProps extends FieldRenderArgs {
  field: FieldDefinition
  enumMetadata: Record<string, EnumValueDto[]>
  readOnlyFields: string[]
}

/** `EnumValueDto[]` del metadata → `Option[]` de Mantine. */
const toOptions = (values?: EnumValueDto[]): Option[] =>
  (values ?? []).map((v) => ({ value: v.key, label: v.label }))

/** Etiqueta con su icono de ayuda al lado, si el campo trae `tooltip`. */
function Label({ text, tooltip }: { text?: string; tooltip?: string }) {
  if (!text) return null
  if (!tooltip) return <>{text}</>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {text}
      <Tooltip label={tooltip} multiline w={260} withArrow>
        <IconInfoCircle size={14} style={{ opacity: 0.6, cursor: 'help' }} />
      </Tooltip>
    </span>
  )
}

function FieldRendererBase({
  field,
  form,
  values,
  context,
  mode,
  enumMetadata,
  readOnlyFields,
}: FieldRendererProps) {
  // ── Campos custom: se referencian, no se instancian en la sección ──────────
  if (field.render) {
    return <>{field.render({ form, values, context, mode })}</>
  }
  if (field.component) {
    const Componente = field.component
    const args: FieldRenderArgs = { form, values, context, mode }
    const extra = typeof field.props === 'function' ? field.props(args) : (field.props ?? {})
    return <Componente {...args} {...extra} />
  }

  const label = field.labelFrom ? field.labelFrom(values, context) : field.label
  const disabled =
    field.readOnly === true ||
    readOnlyFields.includes(field.name) ||
    (field.disabledWhen?.(values, context) ?? false)

  const comun = {
    label: <Label text={label} tooltip={field.tooltip} />,
    placeholder: field.placeholder,
    required: field.required,
    disabled,
  }

  // `form.getInputProps` cablea value/onChange/error de una vez. Se desestructura
  // para poder sustituir value/onChange en los campos que no hablan en strings.
  const inputProps = form.getInputProps(field.name)

  switch (field.type) {
    case 'money': {
      const bruto = values[field.name]
      return (
        <MoneyInput
          {...comun}
          key={form.key(field.name)}
          error={inputProps.error}
          divisa={context.divisa as Currency}
          value={typeof bruto === 'number' ? bruto : null}
          onChange={(cents) => form.setFieldValue(field.name, cents)}
        />
      )
    }

    case 'date': {
      /**
       * `DateInput` de Mantine 9 trabaja con cadenas 'YYYY-MM-DD', que es
       * exactamente el `CivilDate` del proyecto. No hay `Date` de por medio y
       * por tanto no hay huso que pueda mover un gasto de mes (regla dura 5).
       * Si alguna vez alguien mete un `new Date(...)` aquí, ese es el bug.
       */
      const minDate = field.minDateFrom ? (values[field.minDateFrom] as string) : undefined
      const maxDate = field.maxDateFrom ? (values[field.maxDateFrom] as string) : undefined
      return (
        <DateInput
          {...comun}
          {...inputProps}
          key={form.key(field.name)}
          valueFormat="DD/MM/YYYY"
          minDate={minDate || undefined}
          maxDate={maxDate || undefined}
          clearable={field.clearable}
        />
      )
    }

    case 'select': {
      // Prioridad: optionsFrom > options > metadata.
      const desdeMetadata = toOptions(enumMetadata[field.enumKey ?? field.name])
      const options = field.optionsFrom
        ? field.optionsFrom(values, context, desdeMetadata)
        : (field.options ?? desdeMetadata)

      return (
        <Select
          {...comun}
          {...inputProps}
          key={form.key(field.name)}
          data={options}
          clearable={field.clearable}
          searchable={options.length > 8}
          nothingFoundMessage="Sin resultados"
          // El valor del form puede ser '' (nuestra convención de "ninguno");
          // Mantine espera null para pintar el placeholder.
          value={(inputProps.value as string) || null}
          onChange={(v) => form.setFieldValue(field.name, v ?? '')}
        />
      )
    }

    case 'switch':
      return (
        <Switch
          key={form.key(field.name)}
          label={label}
          disabled={disabled}
          checked={Boolean(values[field.name])}
          onChange={(e) => form.setFieldValue(field.name, e.currentTarget.checked)}
          // El label encima, no al lado: así el switch se alinea con el resto de
          // campos de la fila en lugar de flotar a media altura.
          mt="xl"
        />
      )

    case 'number':
      return (
        <NumberInput
          {...comun}
          {...inputProps}
          key={form.key(field.name)}
          decimalScale={field.decimalScale}
          min={field.min}
          max={field.max}
          decimalSeparator=","
          thousandSeparator="."
        />
      )

    case 'textarea':
      return (
        <Textarea
          {...comun}
          {...inputProps}
          key={form.key(field.name)}
          rows={field.rows ?? 3}
          autosize
          minRows={field.rows ?? 3}
        />
      )

    case 'password':
      return <PasswordInput {...comun} {...inputProps} key={form.key(field.name)} />

    case 'email':
      return <TextInput {...comun} {...inputProps} key={form.key(field.name)} type="email" />

    case 'text':
    default:
      return <TextInput {...comun} {...inputProps} key={form.key(field.name)} />
  }
}

/**
 * Memoizado con una comparación explícita: un formulario grande repinta todos
 * sus campos con cada tecla si no se corta aquí.
 *
 * Un campo depende de su propio valor, de su propio error y de lo que declare en
 * `dependsOn`. Los campos `component`/`render` sin `dependsOn` no se pueden
 * memoizar — no hay forma de saber qué leen — así que se repintan siempre; es
 * justo el caso que la documentación de `dependsOn` pide evitar.
 */
export const FieldRenderer = memo(FieldRendererBase, (prev, next) => {
  if (prev.field !== next.field) return false
  if (prev.context !== next.context) return false
  if (prev.enumMetadata !== next.enumMetadata) return false
  if (prev.readOnlyFields !== next.readOnlyFields) return false

  const esCustom = Boolean(next.field.render || next.field.component)
  if (esCustom && !next.field.dependsOn) return false

  const claves = [next.field.name, ...(next.field.dependsOn ?? [])]
  if (next.field.minDateFrom) claves.push(next.field.minDateFrom)
  if (next.field.maxDateFrom) claves.push(next.field.maxDateFrom)

  for (const clave of claves) {
    if (prev.values[clave] !== next.values[clave]) return false
  }
  // Los errores viven fuera de `values`: sin esto, un error de validación no se
  // pintaría hasta que la persona tocara otra tecla.
  return prev.form.errors[next.field.name] === next.form.errors[next.field.name]
})
