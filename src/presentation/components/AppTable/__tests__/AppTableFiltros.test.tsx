/**
 * Segunda parte de la tabla genérica: cada tipo de filtro, la ordenación, la
 * paginación, las celdas por tipo y la exportación a Excel. La primera parte
 * (`AppTable.test.tsx`) cubre el pintado del dinero y el modo servidor.
 */

import { describe, expect, test, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderConMantine } from '@/test/render'
import { AppTable, type AppTableColumn } from '../AppTable'

const xlsx = vi.hoisted(() => ({
  utils: {
    json_to_sheet: vi.fn((filas: unknown[]) => ({ filas })),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))
vi.mock('xlsx', () => xlsx)

type Fila = {
  id: string
  nombre: string
  tipo: string
  veces: number
  importe: number
  fecha: string
  activa: boolean
  color: string
  nota: string | null
}

const FILAS: Fila[] = [
  { id: 'a', nombre: 'Mercadona', tipo: 'expense', veces: 3, importe: -4590, fecha: '2026-03-02', activa: true, color: 'cat-2', nota: null },
  { id: 'b', nombre: 'Nómina', tipo: 'income', veces: 1, importe: 1234567, fecha: '2026-03-28', activa: false, color: '', nota: 'marzo' },
  { id: 'c', nombre: 'Farmacia', tipo: 'expense', veces: 7, importe: -1200, fecha: '2026-02-15', activa: true, color: 'cat-5', nota: '' },
]

const METADATA = { tipo: [{ key: 'expense', label: 'Gasto' }, { key: 'income', label: 'Ingreso' }] }

const COLUMNAS: AppTableColumn<Fila>[] = [
  { accessor: 'nombre', title: 'Nombre', sortable: true, badge: true, badgeColorAccessor: 'color' },
  { accessor: 'tipo', title: 'Tipo', type: 'enum', filterable: true, badge: true, badgeColors: { expense: 'expense' } },
  { accessor: 'veces', title: 'Veces', type: 'number', filterable: true, sortable: true },
  { accessor: 'importe', title: 'Importe', type: 'money', filterable: true, sortable: true },
  { accessor: 'fecha', title: 'Fecha', type: 'date', filterable: true },
  { accessor: 'activa', title: 'Activa', type: 'boolean', filterable: true },
  { accessor: 'nota', title: 'Nota' },
  { accessor: 'color', title: 'Oculta', visible: false },
]

type Props = Parameters<typeof AppTable<Fila>>[0]
const pintar = (props: Partial<Props> = {}) =>
  renderConMantine(
    <AppTable<Fila> data={FILAS} columns={COLUMNAS} enumMetadata={METADATA} height="auto" {...props} />,
  )

/** Las filas visibles, por el texto de su primera celda. */
const nombresVisibles = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((fila) => within(fila).queryAllByRole('cell')[0]?.textContent ?? '')

const abrirFiltro = async (usuario: ReturnType<typeof pintar>['usuario'], columna: string) =>
  usuario.click(screen.getByRole('button', { name: `Filtrar por ${columna}` }))

const elegir = async (usuario: ReturnType<typeof pintar>['usuario'], campo: string, opcion: string) => {
  await usuario.click(screen.getByRole('combobox', { name: campo }))
  await usuario.click(await screen.findByRole('option', { name: opcion }))
}

describe('celdas por tipo', () => {
  test('enum con su etiqueta, fecha civil, sí/no y guion para lo vacío', () => {
    pintar()
    const [, mercadona] = screen.getAllByRole('row')
    const celdas = within(mercadona).getAllByRole('cell').map((c) => c.textContent)

    expect(celdas).toEqual(['Mercadona', 'Gasto', '3', expect.stringMatching(/^-45,90\s€$/), '02/03/2026', 'Sí', '—'])
  })

  test('una columna visible:false no se pinta ni tiene cabecera', () => {
    pintar()
    expect(screen.queryByRole('columnheader', { name: 'Oculta' })).not.toBeInTheDocument()
  })

  test('los badges llevan su tono como dato, no como color: del dato, por valor o por hash', () => {
    pintar()
    expect(screen.getByText('Mercadona').closest('[data-tono]')).toHaveAttribute('data-tono', 'cat-2')
    expect(screen.getAllByText('Gasto')[0].closest('[data-tono]')).toHaveAttribute('data-tono', 'expense')
    expect(screen.getByText('Nómina').closest('[data-tono]')?.getAttribute('data-tono')).toMatch(/^cat-\d$/)
  })

  test('un importe sin signo (columna de saldo) no lleva "+"', () => {
    pintar({ columns: [{ accessor: 'importe', title: 'Saldo', type: 'money' }] })
    expect(screen.getByText(/^12\.345,67\s€$/)).toBeInTheDocument()
  })

  test('un importe que no es número se pinta como guion', () => {
    pintar({
      data: [{ ...FILAS[0], importe: null as unknown as number }],
      columns: [{ accessor: 'importe', title: 'Importe', type: 'money' }],
    })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  test('pulsar una fila avisa con su registro', async () => {
    const onRowClick = vi.fn()
    const { usuario } = pintar({ onRowClick })

    await usuario.click(screen.getByText('Farmacia'))

    expect(onRowClick).toHaveBeenCalledWith(FILAS[2])
  })
})

describe('ordenación (modo cliente)', () => {
  test('por defecto ordena por id; pulsar una cabecera ordena por ella y otra vez invierte', async () => {
    const { usuario } = pintar()
    expect(nombresVisibles()).toEqual(['Mercadona', 'Nómina', 'Farmacia'])

    await usuario.click(screen.getByText('Importe'))
    expect(nombresVisibles()).toEqual(['Mercadona', 'Farmacia', 'Nómina'])

    await usuario.click(screen.getByText('Importe'))
    expect(nombresVisibles()).toEqual(['Nómina', 'Farmacia', 'Mercadona'])
  })

  test('respeta el orden inicial pedido', () => {
    pintar({ defaultSort: { columnAccessor: 'veces', direction: 'desc' } })
    expect(nombresVisibles()).toEqual(['Farmacia', 'Mercadona', 'Nómina'])
  })

  test('en modo servidor no reordena: avisa al padre', async () => {
    const onSortChange = vi.fn()
    const { usuario } = pintar({ manualSorting: true, onSortChange })

    await usuario.click(screen.getByText('Veces'))

    expect(onSortChange).toHaveBeenCalledWith(expect.objectContaining({ columnAccessor: 'veces' }))
    expect(nombresVisibles()).toEqual(['Mercadona', 'Nómina', 'Farmacia'])
  })
})

describe('filtros por tipo (modo cliente)', () => {
  test('enum: las opciones salen del metadata, con su etiqueta', async () => {
    const { usuario } = pintar()
    await abrirFiltro(usuario, 'Tipo')

    await elegir(usuario, 'Valor', 'Ingreso')

    expect(nombresVisibles()).toEqual(['Nómina'])
  })

  test('enum con "No es"', async () => {
    const { usuario } = pintar()
    await abrirFiltro(usuario, 'Tipo')
    await elegir(usuario, 'Valor', 'Ingreso')

    await elegir(usuario, 'Operador', 'No es')

    expect(nombresVisibles()).toEqual(['Mercadona', 'Farmacia'])
  })

  test('enum sin metadata: las opciones son los valores de los datos', async () => {
    const { usuario } = pintar({ enumMetadata: undefined })
    await abrirFiltro(usuario, 'Tipo')

    await elegir(usuario, 'Valor', 'income')

    expect(nombresVisibles()).toEqual(['Nómina'])
  })

  test('enum de catálogo: manda filterOptions', async () => {
    const { usuario } = pintar({
      columns: [
        { accessor: 'nombre', title: 'Nombre' },
        { accessor: 'tipo', title: 'Tipo', type: 'enum', filterable: true, filterOptions: [{ value: 'income', label: 'Entradas' }] },
      ],
    })
    await abrirFiltro(usuario, 'Tipo')

    await elegir(usuario, 'Valor', 'Entradas')

    expect(nombresVisibles()).toEqual(['Nómina'])
  })

  test('sí/no', async () => {
    const { usuario } = pintar()
    await abrirFiltro(usuario, 'Activa')

    await elegir(usuario, 'Valor', 'No')

    expect(nombresVisibles()).toEqual(['Nómina'])
  })

  test('número con "Mayor que"', async () => {
    const { usuario } = pintar()
    await abrirFiltro(usuario, 'Veces')
    await usuario.type(screen.getByRole('textbox', { name: 'Valor' }), '2')

    await elegir(usuario, 'Operador', 'Mayor que')

    expect(nombresVisibles()).toEqual(['Mercadona', 'Farmacia'])
  })

  test('número "Entre" dos valores', async () => {
    const { usuario } = pintar()
    await abrirFiltro(usuario, 'Veces')
    await usuario.type(screen.getByRole('textbox', { name: 'Valor' }), '2')
    await elegir(usuario, 'Operador', 'Entre')

    await usuario.type(screen.getByRole('textbox', { name: 'Hasta' }), '5')

    expect(nombresVisibles()).toEqual(['Mercadona'])
  })

  test('dinero "Entre" se escribe en euros en los dos extremos', async () => {
    const { usuario } = pintar()
    await abrirFiltro(usuario, 'Importe')
    await usuario.type(screen.getByRole('textbox', { name: 'Importe' }), '-50')
    await elegir(usuario, 'Operador', 'Entre')

    await usuario.type(screen.getByRole('textbox', { name: 'Hasta' }), '-20')

    expect(nombresVisibles()).toEqual(['Mercadona'])
  })

  test('fecha "Desde"', async () => {
    const { usuario } = pintar()
    await abrirFiltro(usuario, 'Fecha')
    await usuario.type(screen.getByPlaceholderText('AAAA-MM-DD'), '2026-03-01')

    await elegir(usuario, 'Operador', 'Desde')

    expect(nombresVisibles()).toEqual(['Mercadona', 'Nómina'])
  })

  test('cambiar el operador sin valor no crea un filtro', async () => {
    const onFiltersChange = vi.fn()
    const { usuario } = pintar({ onFiltersChange })
    await abrirFiltro(usuario, 'Veces')

    await elegir(usuario, 'Operador', 'Mayor que')

    expect(onFiltersChange).toHaveBeenLastCalledWith({})
    expect(nombresVisibles()).toHaveLength(3)
  })

  test('"Quitar filtro" devuelve todas las filas y marca el embudo como inactivo', async () => {
    const { usuario } = pintar()
    await abrirFiltro(usuario, 'Tipo')
    await elegir(usuario, 'Valor', 'Ingreso')
    expect(nombresVisibles()).toEqual(['Nómina'])

    await usuario.click(screen.getByRole('button', { name: 'Quitar filtro' }))

    expect(nombresVisibles()).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Quitar filtro' })).not.toBeInTheDocument()
  })

  test('borrar el valor del filtro lo quita', async () => {
    const { usuario } = pintar()
    await abrirFiltro(usuario, 'Fecha')
    const campo = screen.getByPlaceholderText('AAAA-MM-DD')
    await usuario.type(campo, '2026-03-28')
    expect(nombresVisibles()).toEqual(['Nómina'])

    await usuario.clear(campo)

    expect(nombresVisibles()).toHaveLength(3)
  })
})

describe('buscador', () => {
  test('sin columnas buscables busca en todas', async () => {
    const { usuario } = pintar()

    await usuario.type(screen.getByPlaceholderText('Buscar...'), 'marzo')

    expect(nombresVisibles()).toEqual(['Nómina'])
  })

  test('la X lo vacía y avisa al padre', async () => {
    const onSearchChange = vi.fn()
    const { usuario } = pintar({ onSearchChange })
    const buscador = screen.getByPlaceholderText('Buscar...')
    await usuario.type(buscador, 'marzo')

    const x = buscador.closest('.mantine-TextInput-root')?.querySelector('button')
    await usuario.click(x!)

    expect(buscador).toHaveValue('')
    expect(onSearchChange).toHaveBeenLastCalledWith('')
    expect(nombresVisibles()).toHaveLength(3)
  })
})

describe('paginación', () => {
  const muchas = Array.from({ length: 25 }, (_, i) => ({
    ...FILAS[0],
    id: `f${String(i).padStart(2, '0')}`,
    nombre: `F${String(i).padStart(2, '0')}`,
  }))

  test('pagina en memoria y avisa del cambio de página', async () => {
    const onPageChange = vi.fn()
    const { usuario } = pintar({ data: muchas, onPageChange })
    expect(nombresVisibles()).toHaveLength(20)
    expect(screen.getByText('1 – 20 de 25')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: '2' }))

    expect(nombresVisibles()).toEqual(['F20', 'F21', 'F22', 'F23', 'F24'])
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  test('cambiar las filas por página vuelve a la primera y avisa', async () => {
    const onPageSizeChange = vi.fn()
    const { usuario } = pintar({ data: muchas, onPageSizeChange })
    await usuario.click(screen.getByRole('button', { name: '2' }))

    await usuario.click(screen.getByRole('button', { name: '20' }))
    await usuario.click(screen.getByRole('menuitem', { name: '50' }))

    expect(onPageSizeChange).toHaveBeenCalledWith(50)
    expect(nombresVisibles()).toHaveLength(25)
  })

  test('en modo servidor la página la manda el padre, y el total también', () => {
    const { rerender } = pintar({ data: FILAS, manualPagination: true, serverTotalRecords: 60, currentPage: 1 })
    // Las filas son las que manda el servidor para esa página (aquí, tres).
    expect(screen.getByText('1 – 3 de 60')).toBeInTheDocument()

    rerender(
      <AppTable<Fila>
        data={FILAS}
        columns={COLUMNAS}
        height="auto"
        manualPagination
        serverTotalRecords={60}
        currentPage={3}
      />,
    )

    expect(screen.getByText('41 – 43 de 60')).toBeInTheDocument()
  })
})

describe('exportación a Excel', () => {
  test('sin nombre de fichero no hay botón', () => {
    pintar()
    expect(screen.queryByRole('button', { name: 'Excel' })).not.toBeInTheDocument()
  })

  test('exporta lo filtrado, con el dinero en euros que se pueden sumar', async () => {
    const { usuario } = pintar({ exportExcel: 'movimientos' })
    await usuario.type(screen.getByPlaceholderText('Buscar...'), 'merca')

    await usuario.click(screen.getByRole('button', { name: 'Excel' }))

    await waitFor(() => expect(xlsx.writeFile).toHaveBeenCalledWith(expect.anything(), 'movimientos.xlsx'))
    expect(xlsx.utils.json_to_sheet).toHaveBeenCalledWith([
      {
        Nombre: 'Mercadona',
        Tipo: 'expense',
        Veces: 3,
        // Regla dura 1: aquí, y solo aquí además de la pantalla, el entero se
        // vuelve decimal, porque una hoja de cálculo tiene que poder sumarlo.
        Importe: -45.9,
        'Importe (divisa)': 'EUR',
        Fecha: '2026-03-02',
        Activa: 'Sí',
        Nota: '',
      },
    ])
  })

  test('sin filas que exportar, el botón está deshabilitado', () => {
    pintar({ data: [], exportExcel: 'vacio' })
    expect(screen.getByRole('button', { name: 'Excel' })).toBeDisabled()
  })
})
