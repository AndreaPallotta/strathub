import { Card, Text, Table, Badge, TextInput, Group, Select, Stack } from '@mantine/core';
import { useState, useMemo } from 'react';
import { useEngineStore } from '../../state/engineStore';

export function PositionsPanel() {
  const positions = useEngineStore((s) => s.positions);
  const strategies = useEngineStore((s) => s.strategies);

  const [instrumentFilter, setInstrumentFilter] = useState('');
  const [strategyFilter, setStrategyFilter] = useState<string | null>(null);

  const strategyOptions = [
    { value: '', label: 'All strategies' },
    ...strategies.map((s) => ({ value: s.id, label: s.name })),
  ];

  const filtered = useMemo(() => {
    return positions.filter((p) => {
      if (
        instrumentFilter &&
        !p.instrument.toLowerCase().includes(instrumentFilter.toLowerCase())
      ) {
        return false;
      }
      if (strategyFilter && p.strategy_id !== strategyFilter) return false;
      return true;
    });
  }, [positions, instrumentFilter, strategyFilter]);

  return (
    <Card withBorder radius="md" h="100%">
      <Stack gap="xs" mb="xs">
        <Group justify="space-between">
          <Text fw={500}>Open Positions</Text>
          <Badge size="sm" variant="light">
            {positions.length} total
          </Badge>
        </Group>
        <Group gap="xs">
          <TextInput
            size="xs"
            placeholder="Filter by instrument"
            value={instrumentFilter}
            onChange={(e) => setInstrumentFilter(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            size="xs"
            data={strategyOptions}
            value={strategyFilter ?? ''}
            onChange={(v) => setStrategyFilter(v || null)}
            style={{ width: 180 }}
          />
        </Group>
      </Stack>

      {filtered.length === 0 ? (
        <Text size="xs" c="dimmed">
          No positions match filters.
        </Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Instrument</Table.Th>
              <Table.Th>Strategy</Table.Th>
              <Table.Th>Size</Table.Th>
              <Table.Th>Avg Price</Table.Th>
              <Table.Th>Unrealized PnL</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((p, idx) => (
              <Table.Tr key={`${p.instrument}-${p.strategy_id}-${idx}`}>
                <Table.Td>{p.instrument}</Table.Td>
                <Table.Td>{p.strategy_id ?? '—'}</Table.Td>
                <Table.Td>
                  <Badge
                    size="xs"
                    color={p.size > 0 ? 'green' : p.size < 0 ? 'red' : 'gray'}
                  >
                    {p.size}
                  </Badge>
                </Table.Td>
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
      )}
    </Card>
  );
}
