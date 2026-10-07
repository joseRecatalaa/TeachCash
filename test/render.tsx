/**
 * `render` de Testing Library con lo que necesita cualquier componente de la
 * aplicación: el `MantineProvider`. Sin él, Mantine revienta al montar.
 *
 * Devuelve además un `userEvent` ya preparado: se interactúa como una persona
 * (teclear, pulsar), no disparando eventos sueltos.
 */

import type { ReactElement } from 'react'
import { MantineProvider } from '@mantine/core'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

export function renderConMantine(ui: ReactElement) {
  const usuario = userEvent.setup()
  const resultado = render(ui, {
    // `env="test"` quita las transiciones y los portales: sin ello, un
    // desplegable recién abierto sigue oculto mientras "anima" y Testing
    // Library no lo encuentra.
    wrapper: ({ children }) => <MantineProvider env="test">{children}</MantineProvider>,
  })
  return { usuario, ...resultado }
}
