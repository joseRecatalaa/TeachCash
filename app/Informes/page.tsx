'use client'

/**
 * Informes.
 *
 * Todo lo que se pinta aquí EXCLUYE las transferencias: mover 500 € al ahorro no
 * es un gasto. La exclusión se hace en el repositorio, no aquí — ver la nota de
 * cabecera de `informes.repository.ts`.
 */

import { useState } from 'react'
import { Container, Grid, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { MonthPickerInput } from '@mantine/dates'
import { IconChartPie } from '@tabler/icons-react'
import {
  GastoPorCategoriaChart,
  IngresosVsGastosChart,
  SerieSaldoChart,
} from '@/src/presentation/components/Charts/FinanceCharts'
import {
  useGastoPorCategoria,
  useIngresosVsGastos,
  useSerieSaldo,
  useTotalesDelMes,
} from '@/src/application/hooks/useInformes'
import { currentPeriod } from '@/lib/dates'
import { formatMoney, formatPeriod } from '@/lib/format'
import { money } from '@/lib/money'

function Panel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Paper p="lg" withBorder radius="md" h="100%">
      <Title order={5} mb="md">
        {titulo}
      </Title>
      {children}
    </Paper>
  )
}

export default function InformesPage() {
  // El periodo es 'YYYY-MM'. `MonthPickerInput` de Mantine 9 trabaja con
  // cadenas 'YYYY-MM-DD', así que se recorta a los siete primeros caracteres —
  // sin pasar por `Date`, que es lo que movería el mes según el huso.
  const [periodo, setPeriodo] = useState(() => currentPeriod())

  const totales = useTotalesDelMes(periodo)
  const gasto = useGastoPorCategoria(periodo)
  const ingresosVsGastos = useIngresosVsGastos(12)
  const serie = useSerieSaldo()

  const t = totales.data

  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Group gap="xs">
            <IconChartPie size={24} />
            <Title order={2}>Informes</Title>
          </Group>
          <MonthPickerInput
            value={`${periodo}-01`}
            onChange={(v) => v && setPeriodo(v.slice(0, 7))}
            valueFormat="MMMM YYYY"
            w={220}
          />
        </Group>

        <Grid gap="md">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Text size="sm" c="dimmed">
                Ingresos · {formatPeriod(periodo)}
              </Text>
              <Text size="xl" fw={700} className="tabular" c="var(--income)">
                {t ? formatMoney(money(t.ingresos, t.divisa)) : '—'}
              </Text>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Text size="sm" c="dimmed">
                Gastos · {formatPeriod(periodo)}
              </Text>
              <Text size="xl" fw={700} className="tabular" c="var(--expense)">
                {t ? formatMoney(money(t.gastos, t.divisa)) : '—'}
              </Text>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Paper p="lg" withBorder radius="md">
              <Text size="sm" c="dimmed">
                Neto
              </Text>
              {/* El neto lleva signo SIEMPRE: es la cifra donde importa si el
                  mes cerró en positivo, y el color no puede ser la única señal. */}
              <Text
                size="xl"
                fw={700}
                className="tabular"
                c={t && t.neto < 0 ? 'var(--expense)' : 'var(--income)'}
              >
                {t ? formatMoney(money(t.neto, t.divisa)) : '—'}
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Panel titulo={`Gasto por categoría · ${formatPeriod(periodo)}`}>
              <GastoPorCategoriaChart datos={gasto.data ?? []} />
            </Panel>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Panel titulo="Ingresos frente a gastos · últimos 12 meses">
              <IngresosVsGastosChart datos={ingresosVsGastos.data ?? []} />
            </Panel>
          </Grid.Col>

          <Grid.Col span={12}>
            <Panel titulo="Evolución del saldo">
              <SerieSaldoChart datos={serie.data ?? []} />
            </Panel>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}
