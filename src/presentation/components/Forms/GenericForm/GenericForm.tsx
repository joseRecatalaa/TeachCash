'use client'

/**
 * Formulario genérico data-driven.
 *
 * No sabe nada de cuentas, movimientos ni categorías: recibe un
 * `SectionDefinition[]` y lo pinta. Todo lo específico de una entidad vive en
 * `src/config/<entidad>/sections.ts`, que es un `.ts` sin JSX.
 *
 * Ver `types.ts` para el contrato con la capa de config, y `FieldRenderer.tsx`
 * para el mapeo tipo de campo → componente.
 */

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Box, Grid, Group, LoadingOverlay, Paper, Stack } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconAlertTriangle, IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react'
import type { Currency } from '@/lib/money'
import { useFormMetadata } from '@/src/application/hooks/useFormMetadata'
import { SketchButton } from '../../ui'
import { FieldRenderer } from './FieldRenderer'
import styles from './GenericForm.module.css'
import type {
  FieldDefinition,
  FormContext,
  GenericFormProps,
  SectionDefinition,
} from './types'

/**
 * Valor inicial de un campo según su tipo.
 *
 * Los importes arrancan en `null` y no en `0`: un campo de importe que ya
 * enseña "0,00" invita a dejarlo así, y un movimiento de cero euros no es un
 * movimiento. Que esté vacío es lo que hace que la validación de obligatorio
 * signifique algo.
 */
const valorInicial = (field: FieldDefinition): unknown => {
  switch (field.type) {
    case 'switch':
      return false
    case 'number':
    case 'money':
      return null
    default:
      return ''
  }
}

/** Ancho por defecto: media fila en pantallas medianas, entera en móvil. */
const spanDe = (field: FieldDefinition) =>
  typeof field.span === 'number' ? field.span : (field.span ?? { base: 12, md: 6 })

export function GenericForm<TSave>({
  title,
  sections,
  mode,
  resource,
  divisa = 'EUR',
  divisaFrom,
  validate,
  initialValues,
  data,
  isLoadingData = false,
  isSubmitting = false,
  fieldErrors,
  onSubmit,
  exitTo,
  children,
}: GenericFormProps<TSave>) {
  const router = useRouter()
  const { metadata, isLoadingMetadata } = useFormMetadata(resource)

  // Los valores de arranque salen de las secciones: así un campo nuevo no
  // necesita que nadie se acuerde de añadirlo también a una lista aparte.
  const valoresPorDefecto = useMemo(() => {
    const salida: Record<string, unknown> = {}
    for (const seccion of sections) {
      for (const field of seccion.fields) {
        // Los campos `render`/`component` no contribuyen a los valores: son
        // contenido, no datos.
        if (field.render || field.component) continue
        salida[field.name] = valorInicial(field)
      }
    }
    return { ...salida, ...initialValues }
  }, [sections, initialValues])

  const form = useForm<Record<string, unknown>>({
    initialValues: valoresPorDefecto,
    validate,
    validateInputOnBlur: true,
  })

  /**
   * En modo edición los datos llegan después del primer pintado.
   * `form.initialize` los aplica UNA vez y marca el formulario como
   * inicializado: si se usara `setValues`, cada refetch en segundo plano
   * pisaría lo que la persona lleve escrito.
   */
  useEffect(() => {
    if (mode !== 'edit' || !data || form.initialized) return
    form.initialize({ ...valoresPorDefecto, ...(data as Record<string, unknown>) })
  }, [mode, data, form, valoresPorDefecto])

  // Los errores del servidor se pintan EN EL CAMPO, no solo en la notificación:
  // en un formulario largo, un aviso arriba no dice cuál de los quince campos
  // está mal.
  useEffect(() => {
    if (fieldErrors && Object.keys(fieldErrors).length > 0) form.setErrors(fieldErrors)
  }, [fieldErrors, form])

  const values = form.values

  // La divisa derivada se recalcula con los valores; la fija, no. El `context`
  // es una identidad estable mientras no cambie, y de eso depende el memo del
  // `FieldRenderer`: si se creara un objeto nuevo en cada render, no cortaría
  // ningún repintado.
  const divisaEfectiva = divisaFrom ? divisaFrom(values) : (divisa as Currency)

  const context: FormContext = useMemo(
    () => ({ mode, divisa: divisaEfectiva }),
    [mode, divisaEfectiva],
  )

  const handleSubmit = form.onSubmit(async (valores) => {
    const resultado = await onSubmit(valores as TSave)
    // `undefined` = el submit falló y ya ha avisado. No se navega: la persona
    // tiene que poder corregir sobre lo que escribió.
    if (resultado !== undefined) router.push(exitTo)
  })

  const seccionesVisibles = useMemo(
    () => sections.filter((s: SectionDefinition) => s.visibleWhen?.(values, context) ?? true),
    [sections, values, context],
  )

  const cargando = isLoadingData || isLoadingMetadata

  return (
    <Box pos="relative" component="form" onSubmit={handleSubmit}>
      <LoadingOverlay visible={cargando} zIndex={100} />

      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <h1 className={styles.titulo}>
            {mode === 'create' ? title.create : title.edit}
          </h1>
        </Group>

        {mode === 'edit' && !cargando && !data && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} title="No encontrado">
            El registro no existe o no es tuyo.
          </Alert>
        )}

        {seccionesVisibles.map((seccion) => {
          const Icono = seccion.icon
          return (
            <Paper key={seccion.title} p="lg">
              <div className={styles.seccionCabecera}>
                {Icono && (
                  <span className={styles.seccionIcono} aria-hidden>
                    <Icono size={17} />
                  </span>
                )}
                <h2 className={styles.seccionTitulo}>{seccion.title}</h2>
              </div>
              {seccion.description && (
                <p className={styles.seccionDescripcion}>{seccion.description}</p>
              )}
              <hr className={styles.separador} />

              <Grid gap="md">
                {seccion.fields
                  .filter((f) => f.visibleWhen?.(values, context) ?? true)
                  .map((field) => (
                    <Grid.Col key={field.name} span={spanDe(field)}>
                      <FieldRenderer
                        field={field}
                        form={form}
                        values={values}
                        context={context}
                        mode={mode}
                        enumMetadata={metadata.enumFields}
                        readOnlyFields={metadata.readOnlyFields}
                      />
                    </Grid.Col>
                  ))}
              </Grid>
            </Paper>
          )
        })}

        {children}

        <div className={styles.acciones}>
          <SketchButton
            variant="secondary"
            leftSection={<IconArrowLeft size={16} stroke={2.2} />}
            onClick={() => router.push(exitTo)}
            disabled={isSubmitting}
          >
            Cancelar
          </SketchButton>
          <SketchButton
            type="submit"
            leftSection={<IconDeviceFloppy size={16} stroke={2.2} />}
            loading={isSubmitting}
          >
            Guardar
          </SketchButton>
        </div>
      </Stack>
    </Box>
  )
}
