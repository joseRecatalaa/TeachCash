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
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Input,
  InputWrapper,
  MantineProvider,
  Menu,
  Modal,
  Notification,
  Paper,
  Popover,
  Switch,
  Title,
  Tooltip,
  createTheme,
} from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import 'dayjs/locale/es'
import sketch from '@/src/presentation/styles/mantine-sketch.module.css'
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

/**
 * El verde de la aplicación, en los diez pasos que pide Mantine.
 *
 * Son los mismos valores que `--verde-*` en `app/globals.css`. Están duplicados
 * porque Mantine necesita la escala en JavaScript para calcular los estados
 * (hover, borde, contraste automático) y no sabe leer Custom Properties. Si
 * cambias uno, cambia el otro: son la misma paleta escrita dos veces.
 */
const VERDE_BOSQUE: [
  string, string, string, string, string,
  string, string, string, string, string,
] = [
  '#edf9f0',
  '#d8f3dc',
  '#b7e4c7',
  '#95d5b2',
  '#74c69d',
  '#52b788',
  '#40916c',
  '#2d6a4f',
  '#1b4332',
  '#0f2e21',
]

/**
 * El tema.
 *
 * La parte visual del sistema de diseño NO está aquí: está en
 * `src/presentation/styles/mantine-sketch.module.css`, y se engancha con
 * `Componente.extend({ classNames })`. Este fichero solo decide QUÉ clase le
 * toca a cada componente.
 *
 * Es lo que hace que un `<Button>` escrito hace tres meses —o el que genere
 * Plop mañana— salga con el trazo, la sombra dura y el gesto de pulsación sin
 * que nadie lo toque. Para cambiar el aspecto de TODOS los botones se edita el
 * módulo CSS; para cambiar el de UNO, se usa su prop `className`.
 */
const theme = createTheme({
  colors: { bosque: VERDE_BOSQUE },
  primaryColor: 'bosque',
  // Verde bosque sobre papel blanco; musgo sobre papel oscuro. El paso 8 no
  // tiene contraste suficiente contra el fondo oscuro y el 5 se lava sobre el
  // claro: cada esquema necesita el suyo.
  primaryShade: { light: 8, dark: 5 },
  defaultRadius: 'md',
  fontFamily: 'var(--sd-font-body)',
  fontFamilyMonospace: 'var(--sd-font-mono)',
  headings: { fontFamily: 'var(--sd-font-display)', fontWeight: '600' },
  // `focusRing` se queda en 'auto' A PROPÓSITO. Ponerlo en 'never' quitaría el
  // anillo de Mantine de TODO lo enfocable, y el módulo de arriba solo repone el
  // de botones e inputs: los enlaces del menú y las filas de la tabla se
  // quedarían sin indicador de foco, que es lo que usa quien navega con teclado.
  components: {
    Button: Button.extend({ classNames: { root: sketch.button } }),
    ActionIcon: ActionIcon.extend({ classNames: { root: sketch.actionIcon } }),
    Paper: Paper.extend({
      defaultProps: { withBorder: true },
      classNames: { root: sketch.paper },
    }),
    Card: Card.extend({ classNames: { root: sketch.card } }),
    Modal: Modal.extend({
      classNames: {
        content: sketch.modalContent,
        header: sketch.modalHeader,
        title: sketch.modalTitle,
      },
    }),
    Alert: Alert.extend({ classNames: { root: sketch.alert } }),
    Tooltip: Tooltip.extend({ classNames: { tooltip: sketch.tooltip } }),
    Badge: Badge.extend({ classNames: { root: sketch.badge } }),
    Title: Title.extend({ classNames: { root: sketch.title } }),
    Notification: Notification.extend({
      classNames: { root: sketch.notification },
    }),
    Switch: Switch.extend({ classNames: { track: sketch.switchTrack } }),
    Popover: Popover.extend({ classNames: { dropdown: sketch.dropdown } }),
    Menu: Menu.extend({ classNames: { dropdown: sketch.dropdown } }),
    // `Input` e `InputWrapper` son la base de TextInput, Select, DateInput y del
    // MoneyInput del proyecto: estilarlos aquí los cubre todos de una vez.
    Input: Input.extend({ classNames: { input: sketch.input } }),
    InputWrapper: InputWrapper.extend({
      classNames: { label: sketch.inputLabel, error: sketch.inputError },
    }),
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
