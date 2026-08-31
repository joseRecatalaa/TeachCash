/**
 * El contrato entre `src/config/` y `src/presentation/`.
 *
 * Un `sections.ts` DESCRIBE la vista con estos tipos; el `GenericForm` la pinta.
 * Por eso `sections.ts` es `.ts` y no `.tsx`: si aparece JSX, deja de compilar,
 * y esa es la invariante que mantiene la config declarativa.
 *
 * El tipo de campo que más importa aquí es **`money`**: ver su nota en
 * `FieldType`.
 */

import type { ComponentType, ReactNode } from 'react'
import type { UseFormReturnType } from '@mantine/form'
import type { Currency } from '@/lib/money'

/** Opción de un `<Select>`: value/label como string, el formato de Mantine. */
export type Option = { value: string; label: string }

/**
 * Tipos de campo.
 *
 * **`money` es el que importa aquí.** Un importe NO es un `number`: es un entero
 * en la unidad mínima de su divisa (regla dura 1 de AGENTS.md). Un campo
 * `type: "number"` con decimales metería un float en el DTO y con él el
 * `0.1 + 0.2 !== 0.3` que hace que la aplicación deje de cuadrar.
 *
 * `money` se encarga de las tres cosas que hay que hacer bien:
 *   - pinta el valor con `formatAmountForInput` (sin separador de miles, que es
 *     ambiguo al reparsear);
 *   - lee lo que escribe la persona con `parseMoney`, que acepta "1.234,56",
 *     "1234.56" y "12 €";
 *   - guarda en el form el ENTERO en céntimos, nunca el texto ni el decimal.
 *
 * La divisa con la que se parsea sale de `FormContext.divisa`, porque la escala
 * depende de ella (EUR tiene 2 decimales; JPY, 0).
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'money'
  | 'email'
  | 'password'
  | 'date'
  | 'textarea'
  | 'switch'
  | 'select'

/**
 * Contexto inmutable del formulario: lo que los campos necesitan saber y no está
 * en los valores.
 *
 * Es el sitio donde va lo que decide cómo se pinta un campo y no es un valor
 * más del formulario. Hoy: la divisa y el modo.
 */
export interface FormContext {
  mode: 'create' | 'edit'
  /**
   * Divisa con la que se formatean y parsean los campos `money` del formulario.
   *
   * Es contexto y no un valor más porque un importe SIN divisa no significa
   * nada: el mismo entero 1234 son 12,34 € o 1234 ¥ según esto. Hoy la
   * aplicación tiene una sola divisa (`DIVISA_APP`) y todos los formularios
   * heredan esa.
   */
  divisa: Currency
}

/** Predicado sobre los valores actuales del formulario. */
export type VisiblePredicate = (
  values: Record<string, unknown>,
  context: FormContext,
) => boolean

/**
 * Lo que el `GenericForm` le pasa a un campo custom, tanto si se declara con
 * `render` (función) como con `component` (referencia al componente).
 */
export interface FieldRenderArgs {
  form: UseFormReturnType<Record<string, unknown>>
  values: Record<string, unknown>
  context: FormContext
  mode: 'create' | 'edit'
}

/** Contenido arbitrario dentro de una sección. Ignora `type`. */
export type FieldRender = (args: FieldRenderArgs) => ReactNode

export interface FieldDefinition {
  /** Clave en el DTO. Es también la clave con la que se busca en `enumFields`. */
  name: string
  /** Etiqueta del input. Opcional en campos `render`/`component`. */
  label?: string
  /** Opcional en campos `render`/`component`. */
  type?: FieldType
  placeholder?: string
  required?: boolean
  /** Solo `select`: muestra la X para limpiar el valor. */
  clearable?: boolean
  /** Ancho en la rejilla de 12 columnas. */
  span?: { base: number; md: number } | number
  /** Solo `number`. Los campos `money` NO lo usan: su escala sale de la divisa. */
  decimalScale?: number
  min?: number
  max?: number
  rows?: number
  /**
   * Opciones estáticas. Los `select` de enum se declaran SIN esto: las opciones
   * se resuelven desde el metadata usando `name` (o `enumKey`) como clave.
   * Cuando se declaran, tienen prioridad sobre el metadata.
   */
  options?: Option[]
  /**
   * Clave del metadata a usar cuando difiere del `name` del campo. Simétrico al
   * `enumKey` de `AppTableColumn`.
   */
  enumKey?: string
  /**
   * Opciones calculadas desde los valores y el contexto. Prioritario sobre
   * `options`. Recibe como tercer argumento las opciones ya resueltas desde el
   * metadata, para poder recortarlas en lugar de rehacerlas.
   */
  optionsFrom?: (
    values: Record<string, unknown>,
    context: FormContext,
    enumOptions?: Option[],
  ) => Option[]
  /** Etiqueta calculada. Prioritaria sobre `label`. */
  labelFrom?: (values: Record<string, unknown>, context: FormContext) => string
  /** Si devuelve false, el campo no se pinta. Su valor SÍ sigue viajando. */
  visibleWhen?: VisiblePredicate
  /** Visible pero deshabilitado, siempre. */
  readOnly?: boolean
  /** Deshabilitado según los valores. El valor sigue viajando. */
  disabledWhen?: VisiblePredicate
  /** Texto de ayuda, en un icono junto a la etiqueta. */
  tooltip?: string
  /**
   * Solo campos `date`: nombre de otro campo `date` cuyo valor es la fecha
   * mínima seleccionable (rango cruzado "fin ≥ inicio").
   */
  minDateFrom?: string
  /** Solo campos `date`: idem, como fecha máxima. */
  maxDateFrom?: string
  /** Contenido custom. Si se define, se ignora `type`. */
  render?: FieldRender
  /**
   * Componente custom. Alternativa declarativa a `render`: aquí se REFERENCIA el
   * componente (no se instancia), y el `GenericForm` lo monta con los
   * `FieldRenderArgs` más lo que venga en `props`.
   *
   * Es lo que permite que las secciones vivan en ficheros `.ts` sin JSX.
   *
   * Tipado como `any` a propósito: `props` viaja sin tipar, así que un
   * `ComponentType<FieldRenderArgs>` no comprobaría nada útil y en cambio
   * rechazaría todo componente con props propias requeridas, que son justo los
   * casos a cubrir.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: ComponentType<any>
  /**
   * Props extra para el `component`.
   *   - **Objeto**: se construye una vez, al armar la sección. Es lo normal.
   *   - **Función**: se evalúa en cada pintado, para props derivadas de los
   *     valores vivos. Devuelve un objeto plano, no JSX, así que la sección
   *     sigue siendo `.ts`.
   */
  props?: Record<string, unknown> | ((args: FieldRenderArgs) => Record<string, unknown>)
  /**
   * Solo campos `component`/`render`: de qué OTROS valores del formulario
   * depende lo que pinta.
   *
   * Sin esto la celda se repinta con cada tecla del formulario entero; con esto,
   * solo cuando cambia su propio valor, su error o alguno de estos. `[]` = no
   * depende de nada más.
   *
   * **Cuidado: si olvidas uno, el campo deja de actualizarse en silencio.**
   */
  dependsOn?: string[]
}

export interface SectionDefinition {
  title: string
  /** Icono de Tabler. Se referencia, no se instancia: la sección sigue sin JSX. */
  icon?: ComponentType<{ size?: number | string; stroke?: number }>
  /**
   * @deprecated Ya no se pinta. El acento de la aplicación es uno —el verde del
   * sistema de diseño— y una sección con su propio color rompía la lectura del
   * formulario: el ojo saltaba al recuadro más llamativo en vez de bajar por los
   * campos en orden. Se conserva la propiedad para no romper las secciones ya
   * escritas; en las nuevas, no la pongas.
   */
  color?: string
  description?: string
  fields: FieldDefinition[]
  /** Si devuelve false, la sección entera no se pinta. */
  visibleWhen?: VisiblePredicate
}

export interface GenericFormProps<TSave> {
  /** Título por modo. */
  title: { create: string; edit: string }
  sections: SectionDefinition[]
  mode: 'create' | 'edit'
  /** Clave de `REPOSITORIES`. Resuelve las opciones de los `select` vía metadata. */
  resource?: string
  /**
   * Divisa del formulario. Ver `FormContext.divisa`. Por defecto `DIVISA_APP`.
   *
   * Es una prop y no una constante importada porque la escala de un campo
   * `money` depende de ella (EUR tiene dos decimales; JPY, ninguno) y el día que
   * haya un formulario en otra divisa tiene que poder decirlo sin tocar el
   * `GenericForm`.
   */
  divisa?: Currency
  /** Validadores por campo, en el formato de `@mantine/form`. */
  validate?: Record<string, (value: unknown, values: Record<string, unknown>) => string | null>
  /** Valores iniciales. Sin esto, los campos arrancan según su tipo. */
  initialValues?: Partial<Record<string, unknown>>
  /** Datos cargados en modo edición. */
  data?: Partial<TSave> | null
  isLoadingData?: boolean
  isSubmitting?: boolean
  /** Errores por campo del último intento de guardado (del servidor). */
  fieldErrors?: Record<string, string>
  onSubmit: (values: TSave) => Promise<unknown>
  /**
   * A dónde se vuelve al guardar o cancelar. Obligatorio salvo que se pase
   * `onSuccess` — un formulario embebido en un modal no navega a ningún sitio,
   * simplemente se cierra.
   */
  exitTo?: string
  /**
   * Alternativa a `exitTo`: se llama al guardar con éxito y al cancelar, en
   * vez de navegar. Es lo que usa un formulario dentro de un `Modal` (por
   * ejemplo, el alta rápida de un movimiento desde Planificación mensual).
   */
  onSuccess?: () => void
  /** Contenido extra bajo las secciones (avisos, paneles). */
  children?: ReactNode
}
