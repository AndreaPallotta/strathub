import {
  Card,
  Text,
  Table,
  Switch,
  Group,
  Badge,
  TextInput,
  SegmentedControl,
  Stack,
  ActionIcon,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import { useEngineStore } from '../../state/engineStore';
import { toggleStrategy } from '../../api/engine';
import { savePrefs } from '../../lib/prefs';

type StatusFilter = 'all' | 'enabled' | 'disabled';

export function StrategiesPanel() {
  const strategies = useEngineStore((s) => s.strategies);
  const selectedStrategyId = useEngineStore((s) => s.selectedStrategyId);
  const setSelectedStrategy = useEngineStore((s) => s.setSelectedStrategy);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await toggleStrategy(id, enabled);
    } catch (e) {
      console.error('Failed to toggle strategy', e);
    }
  }

  function handleSelect(id: string) {
    const next = selectedStrategyId === id ? null : id;
    setSelectedStrategy(next);
    savePrefs({ selectedStrategyId: next });
  }

  const filtered = useMemo(() => {
    return strategies.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (statusFilter === 'enabled' && !s.enabled) return false;
      if (statusFilter === 'disabled' && s.enabled) return false;
      return true;
    });
  }, [strategies, search, statusFilter]);

  return (
    <Card withBorder radius="md" h="100%">
      <Stack gap="xs" mb="xs">
        <Group justify="space-between">
          <Text fw={500}>Registered Strategies</Text>
          <Badge size="sm" variant="light">
            {strategies.length} total
          </Badge>
        </Group>
        <Group gap="xs">
          <TextInput
            size="xs"
            placeholder="Search strategies by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            rightSection={
              search ? (
                <ActionIcon size="xs" variant="subtle" onClick={() => setSearch('')}>
                  <IconX size={12} />
                </ActionIcon>
              ) : null
            }
            style={{ flex: 1 }}
          />
          <SegmentedControl
            size="xs"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            data={[
              { label: 'All', value: 'all' },
              { label: 'On', value: 'enabled' },
              { label: 'Off', value: 'disabled' },
            ]}
          />
        </Group>
      </Stack>

      {filtered.length === 0 ? (
        <Text size="xs" c="dimmed" mt="xs">
          No strategies match current filters.
        </Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Strategy</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((row) => {
              const isSelected = row.id === selectedStrategyId;
              return (
                <Table.Tr
                  key={row.id}
                  onClick={() => handleSelect(row.id)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isSelected
                      ? 'rgba(56, 189, 248, 0.12)'
                      : undefined,
                  }}
                >
                  <Table.Td>
                    <Group gap="xs">
                      {isSelected && (
                        <Badge size="xs" color="sky" variant="filled">
                          selected
                        </Badge>
                      )}
                      <div>
                        <Text size="xs" fw={600}>
                          {row.name}
                        </Text>
                        <Text size="11px" c="dimmed" style={{ fontFamily: 'monospace' }}>
                          {row.id}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Group gap="xs">
                      <Switch
                        size="xs"
                        checked={row.enabled}
                        onChange={(e) =>
                          handleToggle(row.id, e.currentTarget.checked)
                        }
                        color="green"
                      />
                      <Badge
                        size="xs"
                        color={row.enabled ? 'green' : 'gray'}
                        variant={row.enabled ? 'filled' : 'light'}
                      >
                        {row.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}
