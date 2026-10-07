/**
 * La tabla genérica, vista como la ve una persona.
 *
 * Es la red de seguridad para partir `AppTable.tsx`: lo que se comprueba aquí
 * es el comportamiento visible (qué se pinta, qué filtra, qué avisa al padre),
 * no cómo está organizado por dentro.
 */

import { describe, expect, test, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderConMantine } from '@/test/render'
import { TAMANO_PAGINA_MAXIMO } from '@/src/types/limites.types'
import { AppTable, type AppTableColumn } from '../AppTable'

type Fila = { id: string; nombre: string; importe: number }

const FILAS: Fila[] = [
  { id: 'a', nombre: 'Mercadona', importe: -4590 },
  { id: 'b', nombre: 'Nómina', importe: 1234567 },
  { id: 'c', nombre: 'Farmacia', importe: -1200 },
]

const COLUMNAS: AppTableColumn<Fila>[] = [
  { accessor: 'nombre', title: 'Nombre', type: 'string', filterable: true, searchable: true },
  { accessor: 'importe', title: 'Importe', type: 'money', signed: true, filterable: true },
]

const pintar = (props: Partial<Parameters<typeof AppTable<Fila>>[0]> = {}) =>
  renderConMantine(<AppTable<Fila> data={FILAS} columns={COLUMNAS} height="auto" {...props} />)

/** Las filas visibles, por el texto de su primera celda. */
const nombresVisibles = () =>
  screen
    .getAllByRole('row')
    .slice(1) // la cabecera
    .map((fila) => within(fila).queryAllByRole('cell')[0]?.textContent ?? '')

describe('pintado', () => {
  test('una columna money pinta euros con su signo, no céntimos', () => {
    pintar()
    // Regla dura 1: 1234567 en la base es 12.345,67 € en pantalla. (Cinco
    // cifras a propósito: en es-ES, Intl no agrupa los miles con cuatro.)
    expect(screen.getByText(/\+12\.345,67\s€/)).toBeInTheDocument()
    expect(screen.getByText(/-45,90\s€/)).toBeInTheDocument()
    expect(screen.queryByText('1234567')).not.toBeInTheDocument()
  })

  test('sin filas, enseña el texto de vacío', () => {
    pintar({ data: [], noRecordsText: 'Aún no hay movimientos' })
    expect(screen.getByText('Aún no hay movimientos')).toBeInTheDocument()
  })
})

describe('buscador y filtros (modo cliente)', () => {
  test('el buscador filtra por las columnas buscables', async () => {
    const { usuario } = pintar()
    await usuario.type(screen.getByPlaceholderText('Buscar...'), 'merca')
    expect(nombresVisibles()).toEqual(['Mercadona'])
  })

  test('el filtro de texto de una columna filtra las filas', async () => {
    const { usuario } = pintar()
    await usuario.click(screen.getByRole('button', { name: 'Filtrar por Nombre' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Valor' }), 'nóm')
    expect(nombresVisibles()).toEqual(['Nómina'])
  })

  test('el filtro de una columna de dinero se escribe en EUROS, no en céntimos', async () => {
    // Para buscar el gasto de 45,90 € se escribe "45,90", igual que en un
    // formulario. Pedir 4590 sería enseñarle a la persona la unidad interna.
    const { usuario } = pintar()
    await usuario.click(screen.getByRole('button', { name: 'Filtrar por Importe' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Importe' }), '-45,90')
    expect(nombresVisibles()).toEqual(['Mercadona'])
  })
})

describe('modo servidor', () => {
  test('un filtro no filtra en memoria: avisa al padre con la igualdad', async () => {
    const onFiltersChange = vi.fn()
    const { usuario } = pintar({ manualFiltering: true, onFiltersChange })

    await usuario.click(screen.getByRole('button', { name: 'Filtrar por Nombre' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Valor' }), 'x')

    expect(onFiltersChange).toHaveBeenLastCalledWith({
      nombre: { operator: 'equals', value: 'x', valueTo: undefined },
    })
    // Las filas siguen todas: filtrar es trabajo del repositorio.
    expect(nombresVisibles()).toHaveLength(3)
  })

  test('no ofrece más filas por página de las que acepta el servidor', async () => {
    // La frontera rechaza un pageSize mayor que TAMANO_PAGINA_MAXIMO; ofrecerlo
    // aquí sería un botón que siempre da error.
    const muchas = Array.from({ length: 30 }, (_, i) => ({ id: `f${i}`, nombre: `F${i}`, importe: i }))
    const { usuario } = pintar({ data: muchas })

    await usuario.click(screen.getByRole('button', { name: '20' }))
    const opciones = screen.getAllByRole('menuitem').map((o) => Number(o.textContent))

    expect(opciones.length).toBeGreaterThan(1)
    expect(Math.max(...opciones)).toBeLessThanOrEqual(TAMANO_PAGINA_MAXIMO)
  })
})
