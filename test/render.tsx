/**
 * `render` de Testing Library con lo que necesita cualquier componente de la
 * aplicación: el `MantineProvider`. Sin él, Mantine revienta al montar.
 *
 * Devuelve además un `userEvent` ya preparado: se interactúa como una persona
 * (teclear, pulsar), no disparando eventos sueltos.
 *
 * Con `{ queryClient }` monta también React Query, para los componentes que
 * piden datos (el `GenericForm` pide su metadata). Se le pasa uno nuevo por
 * test: compartido, la caché de un test respondería en el siguiente.
 */

import type { ReactElement, ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Un `QueryClient` de test: sin reintentos, para que una consulta que falla
 * falle ya y no a los tres intentos con espera.
 */
export const nuevoQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

export function renderConMantine(ui: ReactElement, { queryClient }: { queryClient?: QueryClient } = {}) {
  const usuario = userEvent.setup()
  const Envoltorio = ({ children }: { children: ReactNode }) => {
    // `env="test"` quita las transiciones y los portales: sin ello, un
    // desplegable recién abierto sigue oculto mientras "anima" y Testing
    // Library no lo encuentra.
    const conMantine = <MantineProvider env="test">{children}</MantineProvider>
    return queryClient ? (
      <QueryClientProvider client={queryClient}>{conMantine}</QueryClientProvider>
    ) : (
      conMantine
    )
  }
  const resultado = render(ui, { wrapper: Envoltorio })
  return { usuario, ...resultado }
}
