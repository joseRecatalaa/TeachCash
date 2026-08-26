'use client'

/**
 * Resumen.
 *
 * Es la página que se abre al entrar, así que solo enseña las tres cosas que se
 * miran de un vistazo: cuánto hay, cómo ha ido el mes y qué se ha movido.
 */

import Link from 'next/link'
import {
  Anchor,
  Button,
  Container,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconArrowsExchange, IconPlus } from '@tabler/icons-react'
import { useCuentas } from '@/src/application/hooks/useCuentas'
import { useMovimientos } from '@/src/application/hooks/useMovimientos'
import { usePatrimonio, useTotalesDelMes } from '@/src/application/hooks/useInformes'
import { currentPeriod, monthRange } from '@/lib/dates'
import { formatDate, formatMoney, formatMoneySigned, formatPeriod } from '@/lib/format'
import { money } from '@/lib/money'

export default function ResumenPage() {
  const periodo = currentPeriod()
  const rango = monthRange(periodo)

  const { data: patrimonio } = usePatrimonio()
  const totales = useTotalesDelMes(periodo)
  const cuentas = useCuentas(undefined, { paginate: false })
  const ultimos = useMovimientos(
    { desde: rango.from, hasta: rango.to },
    { page: 1, pageSize: 8, sortBy: 'fecha', sortDir: 'desc' },
  )

  const t = totales.data

  return (
    <Container fluid px="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Title order={2}>Resumen</Title>
          <Group gap="sm">
            <Button
              component={Link}
              href="/Movimientos/Create"
              leftSection={<IconPlus size={16} />}
            >
              Nuevo movimiento
            </Button>
            <Button
              variant="default"
              component={Link}
              href="/Movimientos/Transferencia"
              leftSection={<IconArrowsExchange size={16} />}
            >
              Transferencia
            </Button>
          </Group>
        </Group>

        <Grid gap="md">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Text size="sm" c="dimmed" mb="xs">
                Patrimonio
              </Text>
              {/* Una cifra por divisa. Nunca un total único (regla dura 2). */}
              {patrimonio && patrimonio.length > 0 ? (
                <Stack gap={4}>
                  {patrimonio.map((m) => (
                    <Text key={m.currency} size="xl" fw={700} className="tabular">
                      {formatMoney(m)}
                    </Text>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">—</Text>
              )}
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Text size="sm" c="dimmed" mb="xs">
                {formatPeriod(periodo)}
              </Text>
              <Group gap="xl">
                <div>
                  <Text size="xs" c="dimmed">
                    Ingresos
                  </Text>
                  <Text size="lg" fw={600} className="tabular" c="var(--income)">
                    {t ? formatMoney(money(t.ingresos, t.divisa)) : '—'}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Gastos
                  </Text>
                  <Text size="lg" fw={600} className="tabular" c="var(--expense)">
                    {t ? formatMoney(money(t.gastos, t.divisa)) : '—'}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">
                    Neto
                  </Text>
                  <Text size="lg" fw={600} className="tabular">
                    {t ? formatMoneySigned(money(t.neto, t.divisa)) : '—'}
                  </Text>
                </div>
              </Group>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Group justify="space-between" mb="md">
                <Title order={5}>Cuentas</Title>
                <Anchor component={Link} href="/Cuentas" size="sm">
                  Ver todas
                </Anchor>
              </Group>
              <Stack gap="xs">
                {(cuentas.result.data ?? []).slice(0, 6).map((c) => (
                  <Group key={c.id} justify="space-between" wrap="nowrap">
                    <Text size="sm" truncate>
                      {c.nombre}
                    </Text>
                    <Text size="sm" className="tabular" fw={500}>
                      {formatMoney(money(c.saldo, c.divisa))}
                    </Text>
                  </Group>
                ))}
                {(cuentas.result.data ?? []).length === 0 && (
                  <Text c="dimmed" size="sm">
                    Todavía no hay cuentas.{' '}
                    <Anchor component={Link} href="/Cuentas/Create">
                      Crea la primera
                    </Anchor>
                    .
                  </Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper p="lg" withBorder radius="md" h="100%">
              <Group justify="space-between" mb="md">
                <Title order={5}>Últimos movimientos</Title>
                <Anchor component={Link} href="/Movimientos" size="sm">
                  Ver todos
                </Anchor>
              </Group>
              <Stack gap="xs">
                {(ultimos.result.data ?? []).map((m) => (
                  <Group key={m.id} justify="space-between" wrap="nowrap" gap="sm">
                    <Text size="xs" c="dimmed" w={70}>
                      {formatDate(m.fecha)}
                    </Text>
                    <Text size="sm" truncate style={{ flex: 1 }}>
                      {m.descripcion}
                    </Text>
                    {/* Con signo siempre: es lo que distingue ingreso de gasto
                        sin depender del color. */}
                    <Text
                      size="sm"
                      className="tabular"
                      fw={500}
                      c={m.importe < 0 ? 'var(--expense)' : 'var(--income)'}
                    >
                      {formatMoneySigned(money(m.importe, m.divisa))}
                    </Text>
                  </Group>
                ))}
                {(ultimos.result.data ?? []).length === 0 && (
                  <Text c="dimmed" size="sm">
                    No hay movimientos este mes.
                  </Text>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}
