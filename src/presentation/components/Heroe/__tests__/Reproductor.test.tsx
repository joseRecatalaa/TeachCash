/**
 * El reproductor, jugado como lo juega una persona: elegir, comprobar, leer la
 * explicación al fallar, terminar y ver el resultado.
 *
 * El servidor está doblado (`enviarNivel`): aquí se comprueba que el cliente
 * le manda las respuestas con la forma que espera y que pinta lo que él
 * decide. La corrección de verdad la prueba `heroe.repository.test.ts`.
 */

import { describe, expect, test, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { nuevoQueryClient, renderConMantine } from '@/test/render'
import type { Nivel, ResultadoNivelDto } from '@/src/types/heroe.types'
import { Reproductor } from '../reproductor/Reproductor'

const acciones = vi.hoisted(() => ({
  fetchMapa: vi.fn(),
  fetchMundo: vi.fn(),
  fetchNivel: vi.fn(),
  enviarNivel: vi.fn(),
}))
vi.mock('@/src/application/actions/heroe.actions', () => acciones)

const E = 'Porque es así.'

const INTERACTIVO: Nivel = {
  id: 'ahorro/02',
  tipo: 'interactivo',
  titulo: 'Practica',
  descripcion: 'Ejercicios.',
  minutos: 3,
  ejercicios: [
    { id: 'e1', tipo: 'opcion', enunciado: '¿Cuál?', opciones: ['Mala', 'Buena'], correcta: 1, explicacion: E },
    { id: 'e2', tipo: 'verdaderoFalso', enunciado: '¿Es verdad?', correcta: true, explicacion: E },
    { id: 'e3', tipo: 'calcula', enunciado: '¿Cuánto?', unidad: 'euros', solucion: 285_000, tolerancia: 0, explicacion: E },
  ],
}

const LECTURA: Nivel = {
  id: 'ahorro/01',
  tipo: 'lectura',
  titulo: 'Leer',
  descripcion: 'Una lectura.',
  minutos: 2,
  paginas: [
    { titulo: 'Primera', bloques: [{ tipo: 'parrafo', texto: 'Hola.' }] },
    {
      titulo: 'Segunda',
      bloques: [
        { tipo: 'idea', texto: 'La idea.' },
        { tipo: 'ejemplo', titulo: 'Gastos', filas: [{ concepto: 'Alquiler', importe: -65_000 }] },
        { tipo: 'lista', items: ['uno', 'dos'] },
      ],
    },
  ],
  minitest: [
    { id: 'm1', tipo: 'verdaderoFalso', enunciado: '¿Uno?', correcta: true, explicacion: 'Explicación uno.' },
    { id: 'm2', tipo: 'verdaderoFalso', enunciado: '¿Dos?', correcta: false, explicacion: 'Explicación dos.' },
    { id: 'm3', tipo: 'hueco', enunciado: 'Un ___ aquí', opciones: ['hueco', 'agujero'], correcta: 0, explicacion: 'Explicación tres.' },
  ],
}

const JEFE: Nivel = {
  id: 'ahorro/03',
  tipo: 'jefe',
  titulo: 'El Tragaperras',
  descripcion: 'El monstruo.',
  minutos: 4,
  aprobado: 70,
  preguntas: Array.from({ length: 8 }, (_, i) => ({
    id: `j${i}`,
    tipo: 'verdaderoFalso' as const,
    enunciado: `¿Jefe ${i}?`,
    correcta: true,
    explicacion: E,
  })),
}

const resultado = (r: Partial<ResultadoNivelDto>): ResultadoNivelDto => ({
  aciertos: 3,
  total: 3,
  estrellas: 3,
  mejorEstrellas: 3,
  superado: true,
  correccion: [true, true, true],
  siguiente: null,
  ...r,
})

const jugar = (nivel: Nivel, alRepetir = vi.fn()) =>
  renderConMantine(<Reproductor nivel={nivel} rutaCamino={'/CaminoHeroe/Mundo?id=ahorro' as never} alRepetir={alRepetir} />, {
    queryClient: nuevoQueryClient(),
  })

describe('interactivo: feedback al momento', () => {
  test('no se puede comprobar sin contestar; al fallar enseña la buena y la explicación', async () => {
    const { usuario } = jugar(INTERACTIVO)

    const comprobar = screen.getByRole('button', { name: 'Comprobar' })
    expect(comprobar).toBeDisabled()

    await usuario.click(screen.getByRole('radio', { name: 'Mala' }))
    await usuario.click(comprobar)

    expect(screen.getByText('No es eso')).toBeInTheDocument()
    expect(screen.getByText('Buena', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(E)).toBeInTheDocument()
    // Ya comprobada, no se puede cambiar.
    expect(screen.getByRole('radio', { name: 'Buena' })).toBeDisabled()
  })

  test('al acertar lo dice, y al terminar manda las respuestas en bruto y pinta el resultado', async () => {
    acciones.enviarNivel.mockResolvedValue({ ok: true, data: resultado({ siguiente: 'ahorro/03' }) })
    const { usuario } = jugar(INTERACTIVO)

    await usuario.click(screen.getByRole('radio', { name: 'Buena' }))
    await usuario.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(screen.getByText('¡Correcto!')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))

    await usuario.click(screen.getByRole('radio', { name: 'Verdadero' }))
    await usuario.click(screen.getByRole('button', { name: 'Comprobar' }))
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))

    await usuario.type(screen.getByRole('textbox', { name: 'Tu respuesta' }), '2850')
    await usuario.click(screen.getByRole('button', { name: 'Comprobar' }))
    expect(screen.getByText('¡Correcto!')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Terminar' }))

    // Un índice, un booleano y un ENTERO en céntimos: la forma que espera el servidor.
    expect(acciones.enviarNivel).toHaveBeenCalledWith('ahorro/02', [1, true, 285_000])
    expect(await screen.findByRole('heading', { name: '¡Nivel superado!' })).toBeInTheDocument()
    expect(screen.getByText('3 de 3 aciertos · 3 de 3 estrellas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Siguiente nivel/ })).toHaveAttribute('href', '/CaminoHeroe/Nivel?id=ahorro%2F03')
    expect(screen.getByRole('link', { name: /Volver al camino/ })).toHaveAttribute('href', '/CaminoHeroe/Mundo?id=ahorro')
  })
})

describe('lectura: lo vistoso', () => {
  const VISTOSA: Nivel = {
    id: 'ahorro/09',
    tipo: 'lectura',
    titulo: 'Vistosa',
    descripcion: 'Con de todo.',
    minutos: 2,
    paginas: [
      {
        titulo: 'Todo junto',
        bloques: [
          { tipo: 'parrafo', texto: 'Es **muy _importante_** y 3 * 4 = 12.' },
          { tipo: 'dato', texto: 'Casi la **mitad** no tiene colchón.', fuente: 'Banco de España' },
          { tipo: 'imagen', sprite: 'cerdito', pie: 'Un cerdito ahorrador' },
          { tipo: 'imagen', sprite: 'nube' },
        ],
      },
    ],
    minitest: [
      { id: 'm1', tipo: 'verdaderoFalso', enunciado: '¿Es **clave**?', correcta: true, explicacion: 'Porque _sí_.' },
      { id: 'm2', tipo: 'verdaderoFalso', enunciado: '¿Dos?', correcta: true, explicacion: 'Sí.' },
      { id: 'm3', tipo: 'verdaderoFalso', enunciado: '¿Tres?', correcta: true, explicacion: 'Sí.' },
    ],
  }

  test('negrita y cursiva son <strong> y <em>; un asterisco suelto es texto', () => {
    jugar(VISTOSA)

    const parrafo = screen.getByText(/y 3 \* 4 = 12\./)
    const negrita = within(parrafo).getByText(/muy/, { selector: 'strong' })
    expect(within(negrita).getByText('importante', { selector: 'em' })).toBeInTheDocument()
    expect(parrafo.textContent).toBe('Es muy importante y 3 * 4 = 12.')
  })

  test('el dato va con su encabezado y su fuente', () => {
    jugar(VISTOSA)

    const dato = screen.getByRole('complementary', { name: '¿Sabías que…?' })
    expect(within(dato).getByText('mitad', { selector: 'strong' })).toBeInTheDocument()
    expect(dato).toHaveTextContent('Fuente: Banco de España')
  })

  test('la imagen: el dibujo oculto para el lector de pantalla, el pie a la vista', () => {
    jugar(VISTOSA)

    const pie = screen.getByText('Un cerdito ahorrador')
    const figura = pie.closest('figure') as HTMLElement
    expect(figura.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    // Sin pie, la imagen es decoración: no deja texto.
    const figuras = document.querySelectorAll('figure')
    expect([...figuras].filter((f) => f.querySelector('figcaption') === null)).toHaveLength(1)
  })

  test('las marcas también en el enunciado y la explicación de las preguntas', async () => {
    acciones.enviarNivel.mockResolvedValue({
      ok: true,
      data: resultado({ aciertos: 2, estrellas: 0, mejorEstrellas: 0, superado: true, correccion: [false, true, true] }),
    })
    const { usuario } = jugar(VISTOSA)
    await usuario.click(screen.getByRole('button', { name: 'Al minitest' }))

    expect(screen.getByRole('heading', { name: '¿Es clave?' })).toContainHTML('<strong>clave</strong>')
    // El aria-label del grupo de respuestas, sin asteriscos.
    expect(document.querySelector('[aria-label="¿Es clave?"]')).not.toBeNull()
    expect(document.querySelector('[aria-label*="**"]')).toBeNull()

    for (let i = 0; i < 3; i++) {
      await usuario.click(screen.getByRole('radio', { name: 'Falso' }))
      await usuario.click(screen.getByRole('button', { name: i === 2 ? 'Terminar' : 'Siguiente' }))
    }
    expect(await screen.findByText('sí', { selector: 'em' })).toBeInTheDocument()
  })
})

describe('lectura: páginas y minitest', () => {
  test('se lee página a página y el minitest no dice nada hasta el final', async () => {
    acciones.enviarNivel.mockResolvedValue({
      ok: true,
      data: resultado({ aciertos: 2, estrellas: 1, mejorEstrellas: 2, correccion: [true, false, true] }),
    })
    const { usuario } = jugar(LECTURA)

    expect(screen.getByRole('heading', { name: 'Primera' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText('La idea.')).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Alquiler' })).toBeInTheDocument()
    expect(screen.getByText(/^-650,00\s€$/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Al minitest' }))

    await usuario.click(screen.getByRole('radio', { name: 'Verdadero' }))
    // En un test, sin comprobar: se pasa directamente a la siguiente.
    expect(screen.queryByRole('button', { name: 'Comprobar' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    await usuario.click(screen.getByRole('radio', { name: 'Verdadero' }))
    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('heading', { name: 'Completa la frase' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('radio', { name: 'hueco' }))
    await usuario.click(screen.getByRole('button', { name: 'Terminar' }))

    expect(acciones.enviarNivel).toHaveBeenCalledWith('ahorro/01', [true, true, 0])
    // El repaso usa la corrección del SERVIDOR: la segunda, fallada.
    const repaso = await screen.findByRole('heading', { name: 'Lo que conviene repasar' })
    const lista = within(repaso.parentElement!)
    expect(lista.getByText('¿Dos?')).toBeInTheDocument()
    expect(lista.getByText('Explicación dos.')).toBeInTheDocument()
    expect(lista.queryByText('¿Uno?')).not.toBeInTheDocument()
    expect(screen.getByText('Tu mejor marca sigue siendo de 2 estrellas.')).toBeInTheDocument()
  })
})

describe('jefe', () => {
  test('se presenta antes de pelear; si no se supera, dice cuánto hacía falta y se puede repetir', async () => {
    acciones.enviarNivel.mockResolvedValue({
      ok: true,
      data: resultado({ aciertos: 4, total: 8, estrellas: 0, mejorEstrellas: 0, superado: false, correccion: Array(8).fill(false) }),
    })
    const alRepetir = vi.fn()
    const { usuario } = jugar(JEFE, alRepetir)

    expect(screen.getByText('8 preguntas · necesitas un 70 % para vencerlo')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: '¡A por él!' }))

    for (let i = 0; i < 8; i++) {
      await usuario.click(screen.getByRole('radio', { name: 'Falso' }))
      await usuario.click(screen.getByRole('button', { name: i === 7 ? 'Terminar' : 'Siguiente' }))
    }

    expect(await screen.findByRole('heading', { name: 'Esta vez no ha podido ser' })).toBeInTheDocument()
    expect(screen.getByText(/al menos un 70 %/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Siguiente nivel/ })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Repetir' }))
    expect(alRepetir).toHaveBeenCalled()
  })
})

describe('si el servidor falla', () => {
  test('lo dice y deja reintentar con las mismas respuestas', async () => {
    acciones.enviarNivel
      .mockResolvedValueOnce({ ok: false, error: 'Se ha producido un error inesperado' })
      .mockResolvedValueOnce({ ok: true, data: resultado({}) })
    const { usuario } = jugar(JEFE)
    await usuario.click(screen.getByRole('button', { name: '¡A por él!' }))
    for (let i = 0; i < 8; i++) {
      await usuario.click(screen.getByRole('radio', { name: 'Verdadero' }))
      await usuario.click(screen.getByRole('button', { name: i === 7 ? 'Terminar' : 'Siguiente' }))
    }

    expect(await screen.findByRole('alert')).toHaveTextContent('Se ha producido un error inesperado')
    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: '¡Nivel superado!' })).toBeInTheDocument()
    expect(acciones.enviarNivel).toHaveBeenNthCalledWith(2, 'ahorro/03', Array(8).fill(true))
  })
})
