/**
 * El formulario genérico, visto desde fuera: se le da un `SectionDefinition[]`
 * (lo que escribe un `sections.ts`) y se comprueba lo que pinta, lo que envía y
 * cuándo repinta.
 *
 * Lo único que se sustituye es lo que no es del formulario: el router de Next y
 * la Server Action del metadata (que arrastraría la base).
 */

import { describe, expect, test, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { IconTag } from '@tabler/icons-react'
import { nuevoQueryClient, renderConMantine } from '@/test/render'
import { EMPTY_FORM_METADATA, type FormMetadata } from '@/src/types/formMetadata.types'
import { GenericForm } from '../GenericForm'
import type { FieldRenderArgs, GenericFormProps, SectionDefinition } from '../types'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const acciones = vi.hoisted(() => ({ fetchFormMetadata: vi.fn() }))
vi.mock('@/src/application/actions/entity.actions', () => acciones)

type Props = GenericFormProps<Record<string, unknown>>

const pintar = (
  props: Partial<Props> & Pick<Props, 'sections'>,
  metadata: FormMetadata = EMPTY_FORM_METADATA,
) => {
  acciones.fetchFormMetadata.mockResolvedValue({ ok: true, data: metadata })
  const onSubmit = vi.fn().mockResolvedValue({ id: 'nuevo' })
  const r = renderConMantine(
    <GenericForm
      title={{ create: 'Nueva cosa', edit: 'Editar cosa' }}
      mode="create"
      exitTo="/Cosas"
      onSubmit={onSubmit}
      {...props}
    />,
    { queryClient: nuevoQueryClient() },
  )
  return { ...r, onSubmit }
}

const seccion = (fields: SectionDefinition['fields'], extra: Partial<SectionDefinition> = {}) => [
  { title: 'Datos', fields, ...extra },
]

describe('pintado', () => {
  test('el título va por modo, y hideTitle lo quita', () => {
    const { rerender } = pintar({ sections: seccion([]) })
    expect(screen.getByRole('heading', { level: 1, name: 'Nueva cosa' })).toBeInTheDocument()

    rerender(
      <GenericForm
        title={{ create: 'Nueva cosa', edit: 'Editar cosa' }}
        hideTitle
        mode="create"
        sections={seccion([])}
        exitTo="/Cosas"
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  test('cada sección pinta su título y su descripción, y cada tipo su control', () => {
    pintar({
      sections: seccion(
        [
          { name: 'nombre', label: 'Nombre', type: 'text' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'clave', label: 'Clave', type: 'password' },
          { name: 'notas', label: 'Notas', type: 'textarea' },
          { name: 'veces', label: 'Veces', type: 'number' },
          { name: 'activa', label: 'Activa', type: 'switch' },
          { name: 'importe', label: 'Importe', type: 'money' },
        ],
        { description: 'Lo básico', icon: IconTag },
      ),
    })

    expect(screen.getByRole('heading', { level: 2, name: 'Datos' })).toBeInTheDocument()
    expect(screen.getByText('Lo básico')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Clave')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('textbox', { name: 'Notas' }).tagName).toBe('TEXTAREA')
    expect(screen.getByRole('textbox', { name: 'Veces' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Activa' })).not.toBeChecked()
    // Un importe arranca vacío, no en "0,00": un movimiento de cero euros no es
    // un movimiento, y vacío es lo que hace que "obligatorio" signifique algo.
    expect(screen.getByRole('textbox', { name: 'Importe' })).toHaveValue('')
  })

  test('una etiqueta con tooltip sigue nombrando al campo', () => {
    pintar({
      sections: seccion([{ name: 'n', label: 'Nombre', type: 'text', tooltip: 'Cómo se llama' }]),
    })
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument()
  })

  test('labelFrom manda sobre label y lee los valores vivos', async () => {
    const { usuario } = pintar({
      sections: seccion([
        { name: 'tipo', label: 'Tipo', type: 'text' },
        {
          name: 'importe',
          type: 'money',
          labelFrom: (v) => (v.tipo === 'ingreso' ? 'Cobrado' : 'Pagado'),
          dependsOn: ['tipo'],
        },
      ]),
    })
    expect(screen.getByRole('textbox', { name: 'Pagado' })).toBeInTheDocument()

    await usuario.type(screen.getByRole('textbox', { name: 'Tipo' }), 'ingreso')

    expect(screen.getByRole('textbox', { name: 'Cobrado' })).toBeInTheDocument()
  })
})

describe('errores', () => {
  test('los fieldErrors del servidor se pintan EN su campo, asociados a su etiqueta', async () => {
    pintar({
      sections: seccion([
        { name: 'nombre', label: 'Nombre', type: 'text' },
        { name: 'importe', label: 'Importe', type: 'money' },
      ]),
      fieldErrors: { nombre: 'Ya tienes una con ese nombre', importe: 'Demasiado grande' },
    })

    const nombre = await screen.findByRole('textbox', { name: 'Nombre' })
    expect(nombre).toBeInvalid()
    expect(nombre).toHaveAccessibleDescription('Ya tienes una con ese nombre')
    expect(screen.getByRole('textbox', { name: 'Importe' })).toHaveAccessibleDescription(
      'Demasiado grande',
    )
  })

  test('un validador de cliente frena el envío y señala el campo', async () => {
    const { usuario, onSubmit } = pintar({
      sections: seccion([{ name: 'nombre', label: 'Nombre', type: 'text' }]),
      validate: { nombre: (v) => (v ? null : 'Escribe un nombre') },
    })

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveAccessibleDescription(
      'Escribe un nombre',
    )
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('visibilidad y estado', () => {
  test('visibleWhen enseña y quita un campo según los valores vivos', async () => {
    const { usuario } = pintar({
      sections: seccion([
        { name: 'conNota', label: 'Con nota', type: 'switch' },
        { name: 'nota', label: 'Nota', type: 'text', visibleWhen: (v) => v.conNota === true },
      ]),
    })
    expect(screen.queryByRole('textbox', { name: 'Nota' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('switch', { name: 'Con nota' }))
    expect(screen.getByRole('textbox', { name: 'Nota' })).toBeInTheDocument()

    await usuario.click(screen.getByRole('switch', { name: 'Con nota' }))
    expect(screen.queryByRole('textbox', { name: 'Nota' })).not.toBeInTheDocument()
  })

  test('el valor de un campo oculto sigue viajando al guardar', async () => {
    const { usuario, onSubmit } = pintar({
      sections: seccion([
        { name: 'nombre', label: 'Nombre', type: 'text' },
        { name: 'secreto', label: 'Secreto', type: 'text', visibleWhen: () => false },
      ]),
      initialValues: { secreto: 'sigue aquí' },
    })

    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'x')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSubmit).toHaveBeenCalledWith({ nombre: 'x', secreto: 'sigue aquí' })
  })

  test('una sección con visibleWhen falso no se pinta', () => {
    pintar({
      sections: [
        { title: 'Visible', fields: [] },
        { title: 'Oculta', fields: [], visibleWhen: () => false },
      ],
    })
    expect(screen.getByRole('heading', { name: 'Visible' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Oculta' })).not.toBeInTheDocument()
  })

  test('readOnly, disabledWhen y los readOnlyFields del metadata deshabilitan', async () => {
    const { usuario } = pintar(
      {
        sections: seccion([
          { name: 'fijo', label: 'Fijo', type: 'text', readOnly: true },
          { name: 'tipo', label: 'Tipo', type: 'text' },
          { name: 'bloqueado', label: 'Bloqueado', type: 'text', disabledWhen: (v) => v.tipo === 'x' },
          { name: 'delServidor', label: 'Del servidor', type: 'text' },
        ]),
        resource: 'Cosas',
      },
      { readOnlyFields: ['delServidor'], enumFields: {} },
    )

    expect(screen.getByRole('textbox', { name: 'Fijo' })).toBeDisabled()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Del servidor' })).toBeDisabled())
    expect(screen.getByRole('textbox', { name: 'Bloqueado' })).toBeEnabled()

    await usuario.type(screen.getByRole('textbox', { name: 'Tipo' }), 'x')
    expect(screen.getByRole('textbox', { name: 'Bloqueado' })).toBeDisabled()
  })
})

describe('dependsOn: cuándo se repinta un campo custom', () => {
  /** Cuenta sus pintados, para ver qué repinta el formulario y qué no. */
  const pintados = vi.fn()
  function Espia({ values }: FieldRenderArgs) {
    pintados(values.a)
    return <span>a vale {String(values.a)}</span>
  }

  const conEspia = (dependsOn?: string[]) =>
    pintar({
      sections: seccion([
        { name: 'a', label: 'A', type: 'text' },
        { name: 'b', label: 'B', type: 'text' },
        { name: 'espia', component: Espia, dependsOn },
      ]),
    })

  test('con dependsOn, escribir en OTRO campo no lo repinta', async () => {
    const { usuario } = conEspia(['a'])
    pintados.mockClear()

    await usuario.type(screen.getByRole('textbox', { name: 'B' }), 'hola')

    expect(pintados).not.toHaveBeenCalled()
  })

  test('con dependsOn, cambiar su dependencia sí lo repinta', async () => {
    const { usuario } = conEspia(['a'])

    await usuario.type(screen.getByRole('textbox', { name: 'A' }), 'z')

    expect(screen.getByText('a vale z')).toBeInTheDocument()
  })

  test('sin dependsOn se repinta con cada tecla (el caso que dependsOn evita)', async () => {
    const { usuario } = conEspia(undefined)
    pintados.mockClear()

    await usuario.type(screen.getByRole('textbox', { name: 'B' }), 'hola')

    // Al menos una vez por tecla; puede que alguna más (el foco).
    expect(pintados.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  test('un campo render recibe los valores y el contexto', () => {
    pintar({
      sections: seccion([
        {
          name: 'aviso',
          render: ({ context, mode }) => <p>{`${mode} en ${context.divisa}`}</p>,
          dependsOn: [],
        },
      ]),
    })
    expect(screen.getByText('create en EUR')).toBeInTheDocument()
  })

  test('props como función se recalculan con los valores vivos', async () => {
    function Eco({ texto }: { texto: string }) {
      return <span>{texto}</span>
    }
    const { usuario } = pintar({
      sections: seccion([
        { name: 'a', label: 'A', type: 'text' },
        {
          name: 'eco',
          component: Eco,
          props: ({ values }) => ({ texto: `eco ${String(values.a)}` }),
          dependsOn: ['a'],
        },
        { name: 'fijo', component: Eco, props: { texto: 'fijo' }, dependsOn: [] },
      ]),
    })

    await usuario.type(screen.getByRole('textbox', { name: 'A' }), 'q')

    expect(screen.getByText('eco q')).toBeInTheDocument()
    expect(screen.getByText('fijo')).toBeInTheDocument()
  })
})

describe('select', () => {
  test('un select de enumeración sin options las toma del metadata por su name', async () => {
    const { usuario } = pintar(
      { sections: seccion([{ name: 'tipo', label: 'Tipo', type: 'select' }]), resource: 'Cosas' },
      {
        readOnlyFields: [],
        enumFields: { tipo: [{ key: 'expense', label: 'Gasto' }, { key: 'income', label: 'Ingreso' }] },
      },
    )
    await waitFor(() => expect(acciones.fetchFormMetadata).toHaveBeenCalledWith('Cosas'))

    await usuario.click(screen.getByRole('combobox', { name: 'Tipo' }))
    await usuario.click(await screen.findByRole('option', { name: 'Ingreso' }))

    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveValue('Ingreso')
  })

  test('optionsFrom recorta las opciones según otro campo', async () => {
    const { usuario } = pintar({
      sections: seccion([
        { name: 'grupo', label: 'Grupo', type: 'text' },
        {
          name: 'cosa',
          label: 'Cosa',
          type: 'select',
          dependsOn: ['grupo'],
          optionsFrom: (v) =>
            v.grupo === 'b' ? [{ value: 'b1', label: 'Be uno' }] : [{ value: 'a1', label: 'A uno' }],
        },
      ]),
    })

    await usuario.type(screen.getByRole('textbox', { name: 'Grupo' }), 'b')
    await usuario.click(screen.getByRole('combobox', { name: 'Cosa' }))

    expect(await screen.findByRole('option', { name: 'Be uno' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'A uno' })).not.toBeInTheDocument()
  })

  test('optionsFrom sin dependsOn también se re-evalúa (lo seguro por defecto)', async () => {
    const { usuario } = pintar({
      sections: seccion([
        { name: 'grupo', label: 'Grupo', type: 'text' },
        {
          name: 'cosa',
          label: 'Cosa',
          type: 'select',
          optionsFrom: (v) =>
            v.grupo === 'b' ? [{ value: 'b1', label: 'Be uno' }] : [{ value: 'a1', label: 'A uno' }],
        },
      ]),
    })

    await usuario.type(screen.getByRole('textbox', { name: 'Grupo' }), 'b')
    await usuario.click(screen.getByRole('combobox', { name: 'Cosa' }))

    expect(await screen.findByRole('option', { name: 'Be uno' })).toBeInTheDocument()
  })

  test('si el metadata falla, el formulario se pinta con el select vacío', async () => {
    acciones.fetchFormMetadata.mockResolvedValue({ ok: false, error: 'No autorizado' })
    renderConMantine(
      <GenericForm
        title={{ create: 'Nueva', edit: 'Editar' }}
        mode="create"
        resource="Cosas"
        exitTo="/Cosas"
        sections={seccion([{ name: 'tipo', label: 'Tipo', type: 'select' }])}
        onSubmit={vi.fn()}
      />,
      { queryClient: nuevoQueryClient() },
    )
    await waitFor(() => expect(acciones.fetchFormMetadata).toHaveBeenCalled())
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveValue('')
  })
})

describe('fechas', () => {
  test('noFutureDates no deja elegir mañana, y sí hoy', async () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 15, 12), toFake: ['Date'] })
    try {
      const { usuario } = pintar({
        sections: seccion([{ name: 'fecha', label: 'Fecha', type: 'date', noFutureDates: true }]),
      })

      await usuario.click(screen.getByRole('textbox', { name: 'Fecha' }))

      expect(diaDelCalendario(15)).toBeEnabled()
      expect(diaDelCalendario(16)).toBeDisabled()
    } finally {
      vi.useRealTimers()
    }
  })

  test('sin noFutureDates, mañana se puede elegir y guarda la fecha civil', async () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 15, 12), toFake: ['Date'] })
    try {
      const { usuario, onSubmit } = pintar({
        sections: seccion([{ name: 'fecha', label: 'Fecha', type: 'date' }]),
      })

      await usuario.click(screen.getByRole('textbox', { name: 'Fecha' }))
      await usuario.click(diaDelCalendario(16))
      await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

      // Regla dura 5: viaja 'YYYY-MM-DD', nunca un Date.
      expect(onSubmit).toHaveBeenCalledWith({ fecha: '2026-03-16' })
    } finally {
      vi.useRealTimers()
    }
  })

  test('maxDateFrom y noFutureDates juntos: manda el tope más temprano', async () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 15, 12), toFake: ['Date'] })
    try {
      const { usuario } = pintar({
        sections: seccion([
          { name: 'hasta', label: 'Hasta', type: 'date' },
          { name: 'desde', label: 'Desde', type: 'date', maxDateFrom: 'hasta', noFutureDates: true },
        ]),
        initialValues: { hasta: '2026-03-10' },
      })

      await usuario.click(screen.getByRole('textbox', { name: 'Desde' }))

      expect(diaDelCalendario(10)).toBeEnabled()
      expect(diaDelCalendario(11)).toBeDisabled()
    } finally {
      vi.useRealTimers()
    }
  })

  test('maxDateFrom posterior a hoy no levanta el tope de hoy', async () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 15, 12), toFake: ['Date'] })
    try {
      const { usuario } = pintar({
        sections: seccion([
          { name: 'hasta', label: 'Hasta', type: 'date' },
          { name: 'desde', label: 'Desde', type: 'date', maxDateFrom: 'hasta', noFutureDates: true },
        ]),
        initialValues: { hasta: '2026-03-20' },
      })

      await usuario.click(screen.getByRole('textbox', { name: 'Desde' }))

      expect(diaDelCalendario(15)).toBeEnabled()
      expect(diaDelCalendario(16)).toBeDisabled()
    } finally {
      vi.useRealTimers()
    }
  })

  test('minDateFrom no deja elegir antes de la otra fecha', async () => {
    vi.useFakeTimers({ now: new Date(2026, 2, 15, 12), toFake: ['Date'] })
    try {
      const { usuario } = pintar({
        sections: seccion([
          { name: 'inicio', label: 'Inicio', type: 'date' },
          { name: 'fin', label: 'Fin', type: 'date', minDateFrom: 'inicio' },
        ]),
        initialValues: { inicio: '2026-03-12' },
      })

      await usuario.click(screen.getByRole('textbox', { name: 'Fin' }))

      expect(diaDelCalendario(11)).toBeDisabled()
      expect(diaDelCalendario(12)).toBeEnabled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('envío y salida', () => {
  test('al guardar con éxito manda los valores y vuelve a exitTo', async () => {
    const { usuario, onSubmit } = pintar({
      sections: seccion([
        { name: 'nombre', label: 'Nombre', type: 'text' },
        { name: 'importe', label: 'Importe', type: 'money' },
      ]),
    })

    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Luz')
    await usuario.type(screen.getByRole('textbox', { name: 'Importe' }), '45,90')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    // Regla dura 1: el importe llega en céntimos enteros.
    expect(onSubmit).toHaveBeenCalledWith({ nombre: 'Luz', importe: 4590 })
    expect(router.push).toHaveBeenCalledWith('/Cosas')
  })

  test('si el guardado falla (undefined) se queda en el formulario', async () => {
    const { usuario, onSubmit } = pintar({ sections: seccion([]) })
    onSubmit.mockResolvedValue(undefined)

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSubmit).toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  test('con onSuccess no navega: lo llama al guardar y al cancelar', async () => {
    const onSuccess = vi.fn()
    const { usuario } = pintar({ sections: seccion([]), onSuccess, exitTo: undefined })

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onSuccess).toHaveBeenCalledTimes(2)
    expect(router.push).not.toHaveBeenCalled()
  })

  test('cancelar vuelve a exitTo sin enviar', async () => {
    const { usuario, onSubmit } = pintar({ sections: seccion([]) })

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(router.push).toHaveBeenCalledWith('/Cosas')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('mientras envía, Cancelar está deshabilitado', () => {
    pintar({ sections: seccion([]), isSubmitting: true })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })
})

describe('modo edición', () => {
  const campos = seccion([
    { name: 'nombre', label: 'Nombre', type: 'text' },
    { name: 'importe', label: 'Importe', type: 'money' },
  ])

  const editar = (data: Props['data']) => (
    <GenericForm
      title={{ create: 'Nueva cosa', edit: 'Editar cosa' }}
      mode="edit"
      sections={campos}
      exitTo="/Cosas"
      onSubmit={vi.fn()}
      data={data}
    />
  )

  test('los datos que llegan después del primer pintado rellenan el formulario', () => {
    const { rerender } = pintar({ sections: campos, mode: 'edit', data: null, isLoadingData: true })

    rerender(editar({ nombre: 'Luz', importe: 4590 }))

    expect(screen.getByRole('heading', { level: 1, name: 'Editar cosa' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Luz')
    expect(screen.getByRole('textbox', { name: 'Importe' })).toHaveValue('45,90')
  })

  test('un refetch en segundo plano no pisa lo que la persona lleva escrito', async () => {
    const { usuario, rerender } = pintar({
      sections: campos,
      mode: 'edit',
      data: { nombre: 'Luz', importe: 4590 },
    })
    await usuario.type(screen.getByRole('textbox', { name: 'Nombre' }), ' y gas')

    rerender(editar({ nombre: 'Luz', importe: 4590 }))

    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Luz y gas')
  })

  test('sin datos y sin cargar, avisa de que no existe o no es suyo', () => {
    pintar({ sections: campos, mode: 'edit', data: null })
    const aviso = screen.getByRole('alert')
    expect(within(aviso).getByText('El registro no existe o no es tuyo.')).toBeInTheDocument()
  })
})

/**
 * El botón de un día de marzo de 2026 en el calendario abierto. Mantine lo
 * nombra en inglés porque los tests no cargan el locale 'es' de dayjs; da
 * igual, lo que se mira es si está habilitado.
 */
const diaDelCalendario = (dia: number) =>
  screen.getByRole('button', { name: `${dia} March 2026` })
