/**
 * Entorno de los tests de componentes (jsdom).
 *
 * Mantine pregunta al navegador por `matchMedia` (esquema de color, breakpoints)
 * y por `ResizeObserver` (ScrollArea, Popover). jsdom no trae ninguno de los
 * dos: sin estos sustitutos, cualquier componente de Mantine revienta al montar.
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      // Como en un navegador: la consulta vacía coincide siempre, y las demás
      // (pantalla oscura, móvil…) no. mantine-datatable pregunta por '' para
      // cada columna sin `visibleMediaQuery`: con `false` las ocultaba todas.
      matches: query.trim() === '',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom no implementa el scroll; Mantine lo llama al abrir desplegables.
Element.prototype.scrollIntoView ??= () => {}
