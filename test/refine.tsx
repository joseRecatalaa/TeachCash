/**
 * Refine de verdad, para probar los hooks como los usa la aplicación: el
 * `<Refine>` con el data provider REAL (`refine-data-provider.ts`) y los
 * recursos REALES (`REFINE_RESOURCES`). Lo único que el test sustituye son las
 * Server Actions, con `vi.mock('@/src/application/actions/entity.actions')`.
 *
 * Así se prueba también la traducción del data provider y las claves de
 * caché que construye Refine, que es justo donde una invalidación puede no
 * casar con nada sin avisar.
 *
 * El `QueryClient` lo pone el test, para poder espiarlo (`invalidateQueries`).
 */

import type { ReactNode } from 'react'
import { Refine } from '@refinedev/core'
import type { QueryClient } from '@tanstack/react-query'
import { dataProvider } from '@/src/application/providers/refine-data-provider'
import { REFINE_RESOURCES } from '@/src/application/providers/providers'

export function envoltorioRefine(queryClient: QueryClient) {
  const provider = dataProvider()
  return function ConRefine({ children }: { children: ReactNode }) {
    return (
      <Refine
        dataProvider={provider}
        resources={REFINE_RESOURCES}
        options={{
          syncWithLocation: false,
          disableTelemetry: true,
          reactQuery: { clientConfig: queryClient },
        }}
      >
        {children}
      </Refine>
    )
  }
}
