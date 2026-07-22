import { Card, Text, Group, Badge, Stack, Table, Divider } from '@mantine/core';
import { useEngineStore } from '../../state/engineStore';
import { StrategyParamTweaker } from './StrategyParamTweaker';

export function StrategyDetailsPanel() {
  const selectedStrategyId = useEngineStore((s) => s.selectedStrategyId);
  const strategies = useEngineStore((s) => s.strategies);
  const positions = useEngineStore((s) => s.positions);
  const trades = useEngineStore((s) => s.trades);

  if (!selectedStrategyId) {
    return (
      <Card withBorder radius="md" h="100%">
        <Text fw={500} mb="xs">
          Strategy details
        </Text>
        <Text size="xs" c="dimmed">
          Select a strategy from the list to see details and live parameter controls.
        </Text>
      </Card>
    );
  }

  const strategy = strategies.find((s) => s.id === selectedStrategyId);
  const stratPositions = positions.filter(
    (p) => p.strategy_id === selectedStrategyId
  );
  const stratTrades = trades.filter((t) => t.strategy_id === selectedStrategyId);

  const totalExposure = stratPositions.reduce(
    (acc, p) => acc + Math.abs(p.size),
    0
  );
  const unrealizedPnl = stratPositions.reduce(
    (acc, p) => acc + (p.unrealized_pnl ?? 0),
    0
  );
  const realizedPnl = stratTrades.reduce(
    (acc, t) => acc + (t.pnl ?? 0),
    0
  );

  return (
    <Card withBorder radius="md" h="100%">
      <Group justify="space-between" mb="xs">
        <Text fw={500}>Strategy details</Text>
        <Badge size="sm" variant="light">
          {selectedStrategyId}
        </Badge>
      </Group>

      <Stack gap="xs" mb="md">
        <Group gap="xs">
          <Text size="sm" fw={500}>
            Name:
          </Text>
          <Text size="sm">
            {strategy?.name ?? selectedStrategyId}
          </Text>
        </Group>

        <Group gap="xs">
          <Text size="sm" fw={500}>
            Status:
          </Text>
          <Badge
            size="sm"
            color={strategy?.enabled ? 'green' : 'red'}
            variant="filled"
          >
            {strategy?.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </Group>

        <Group gap="xs">
          <Text size="sm" fw={500}>
            Exposure:
          </Text>
          <Text size="sm">{totalExposure}</Text>
        </Group>

        <Group gap="xs">
          <Text size="sm" fw={500}>
            Unrealized PnL:
          </Text>
          <Text
            size="sm"
            c={
              unrealizedPnl > 0
                ? 'green'
                : unrealizedPnl < 0
                ? 'red'
                : 'dimmed'
            }
          >
            {unrealizedPnl.toFixed(2)}
          </Text>
        </Group>

        <Group gap="xs">
          <Text size="sm" fw={500}>
            Realized PnL:
          </Text>
          <Text
            size="sm"
            c={
              realizedPnl > 0
                ? 'green'
                : realizedPnl < 0
                ? 'red'
                : 'dimmed'
            }
          >
            {realizedPnl.toFixed(2)}
          </Text>
        </Group>
      </Stack>

      {/* Embedded Live Strategy Parameter Tweaker Panel */}
      <StrategyParamTweaker strategyId={selectedStrategyId} />

      <Divider my="md" />

      {stratPositions.length > 0 && (
        <>
          <Text fw={500} size="sm" mb={4}>
            Positions
          </Text>
          <Table striped highlightOnHover withTableBorder mb="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Instrument</Table.Th>
                <Table.Th>Size</Table.Th>
                <Table.Th>Avg price</Table.Th>
                <Table.Th>Unrealized PnL</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stratPositions.map((p, idx) => (
                <Table.Tr key={`${p.instrument}-${idx}`}>
                  <Table.Td>{p.instrument}</Table.Td>
                  <Table.Td>{p.size}</Table.Td>
                  <Table.Td>{p.avg_price.toFixed(4)}</Table.Td>
                  <Table.Td>
                    {p.unrealized_pnl != null
                      ? p.unrealized_pnl.toFixed(2)
                      : '—'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      {stratTrades.length > 0 && (
        <>
          <Text fw={500} size="sm" mb={4}>
            Recent trades
          </Text>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Time</Table.Th>
                <Table.Th>Instrument</Table.Th>
                <Table.Th>Side</Table.Th>
                <Table.Th>Size</Table.Th>
                <Table.Th>Price</Table.Th>
                <Table.Th>PnL</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stratTrades.slice(0, 10).map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {new Date(t.ts || Date.now()).toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>{t.instrument}</Table.Td>
                  <Table.Td>
                    <Badge
                      size="xs"
                      color={t.side === 'buy' ? 'green' : 'red'}
                      variant="filled"
                    >
                      {t.side.toUpperCase()}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{t.size}</Table.Td>
                  <Table.Td>{t.price.toFixed(4)}</Table.Td>
                  <Table.Td>
                    {t.pnl != null ? (
                      <Text
                        size="xs"
                        c={t.pnl > 0 ? 'green' : t.pnl < 0 ? 'red' : 'dimmed'}
                      >
                        {t.pnl.toFixed(2)}
                      </Text>
                    ) : (
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </Card>
  );
}
