'use client'

/**
 * Providers globales: Mantine, React Query y Refine.
 *
 * Dos ausencias que suelen extrañar y son deliberadas:
 *   - **No hay provider de autenticación.** La v1 no tiene login (ver
 *     "Decisiones tomadas" en AGENTS.md). El `userId` lo pone `getSession()` en
 *     el servidor, dentro de cada Server Action, y el cliente nunca lo ve ni lo
 *     necesita.
 *   - **No hay URL de API.** El data provider no habla por HTTP: llama a Server
 *     Actions en proceso.
 */

import { useMemo } from 'react'
import { Refine } from '@refinedev/core'
import { MantineProvider, createTheme } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import 'dayjs/locale/es'
import { dataProvider } from './refine-data-provider'

/**
 * Recursos registrados en Refine.
 *
 * El `name` tiene que coincidir EXACTAMENTE con una clave de `REPOSITORIES`
 * (`src/infrastructure/repositories/index.ts`): ese string es lo que el data
 * provider usa para resolver contra qué repositorio consultar. Si no coincide,
 * lanza "Recurso desconocido" en la primera consulta.
 *
 * Se exporta para que el generador de Plop pueda añadir entradas y para que
 * otros componentes puedan inferir el recurso activo desde la URL.
 */
export const REFINE_RESOURCES = [
  {
    name: 'Cuentas',
    list: '/Cuentas',
    create: '/Cuentas/Create',
    edit: '/Cuentas/Edit',
    meta: { label: 'Cuentas' },
  },
  {
    name: 'Movimientos',
    list: '/Movimientos',
    create: '/Movimientos/Create',
    edit: '/Movimientos/Edit',
    meta: { label: 'Movimientos' },
  },
  {
    name: 'Categorias',
    list: '/Categorias',
    create: '/Categorias/Create',
    edit: '/Categorias/Edit',
    meta: { label: 'Categorías' },
  },
]

const theme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  fontFamilyMonospace: 'var(--font-geist-mono), ui-monospace, monospace',
  headings: { fontWeight: '600' },
  components: {
    Paper: { defaultProps: { shadow: 'xs', radius: 'md', withBorder: true } },
    Card: { defaultProps: { radius: 'md', shadow: 'sm' } },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  // El data provider no tiene estado, pero se memoiza igual: una instancia nueva
  // en cada render haría que Refine reconstruyera sus queries.
  const provider = useMemo(() => dataProvider(), [])

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      {/* Locale 'es' para que los calendarios empiecen en lunes y los meses
          salgan en castellano. El formato de los importes NO depende de esto:
          va por `lib/format.ts`, que fija es-ES. */}
      <DatesProvider settings={{ locale: 'es' }}>
        <Notifications position="top-right" zIndex={1300} />
        <Refine
          dataProvider={provider}
          resources={REFINE_RESOURCES}
          options={{
            syncWithLocation: false,
            warnWhenUnsavedChanges: true,
            disableTelemetry: true,
            reactQuery: {
              clientConfig: {
                defaultOptions: {
                  queries: {
                    staleTime: 2 * 60 * 1000,
                    gcTime: 10 * 60 * 1000,
                    // Sin esto, cada vuelta a la pestaña dispara un refetch de
                    // todas las listas. Los datos son locales y de un usuario:
                    // nadie los está cambiando por detrás.
                    refetchOnWindowFocus: false,
                  },
                },
              },
            },
          }}
        >
          {children}
        </Refine>
      </DatesProvider>
    </MantineProvider>
  )
}
