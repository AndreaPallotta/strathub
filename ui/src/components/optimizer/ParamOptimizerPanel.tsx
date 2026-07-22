import {
  Card,
  Text,
  Select,
  Button,
  Group,
  Stack,
  NumberInput,
  Badge,
  Paper,
  Table,
  Grid,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFlame, IconPlayerPlay } from '@tabler/icons-react';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useEngineStore } from '../../state/engineStore';

export interface OptimizationResult {
  min_spread: number;
  max_position_size: number;
  total_pnl: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
}

export function ParamOptimizerPanel() {
  const strategies = useEngineStore((s) => s.strategies);
  const addLog = useEngineStore((s) => s.addLog);

  const [strategyId, setStrategyId] = useState<string | null>('arb_example');
  const [spreadStart, setSpreadStart] = useState<number>(0.005);
  const [spreadEnd, setSpreadEnd] = useState<number>(0.050);
  const [spreadStep, setSpreadStep] = useState<number>(0.010);

  const [sizeStart, setSizeStart] = useState<number>(5);
  const [sizeEnd, setSizeEnd] = useState<number>(25);
  const [sizeStep, setSizeStep] = useState<number>(5);

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<OptimizationResult[]>([]);

  const strategyOptions = strategies.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const handleRunOptimization = async () => {
    if (!strategyId) return;
    setRunning(true);

    try {
      const res = await invoke<OptimizationResult[]>('run_grid_optimization', {
        strategyId,
        minSpreadStart: spreadStart,
        minSpreadEnd: spreadEnd,
        minSpreadStep: spreadStep,
        sizeStart,
        sizeEnd,
        sizeStep,
      });

      setResults(res);
      addLog(`[SUCCESS] Grid optimization sweep completed for ${strategyId} (${res.length} permutations evaluated)`);

      notifications.show({
        title: 'Optimization Complete',
        message: `Evaluated ${res.length} parameter permutations successfully`,
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Optimization Failed',
        message: String(err),
        color: 'red',
      });
    } finally {
      setRunning(false);
    }
  };

  const bestResult = results.length > 0
    ? [...results].sort((a, b) => b.sharpe_ratio - a.sharpe_ratio)[0]
    : null;

  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <IconFlame size={22} color="#f59e0b" />
          <Text fw={600} size="md">
            Grid Parameter Optimizer & Matrix Sweep
          </Text>
        </Group>
        <Badge color="amber" variant="filled">
          Parallel Grid Search
        </Badge>
      </Group>

      <Stack gap="md">
        <Grid>
          <Grid.Col span={4}>
            <Select
              label="Target Strategy"
              data={strategyOptions.length ? strategyOptions : [{ value: 'arb_example', label: 'Prediction Market Arbitrage' }]}
              value={strategyId}
              onChange={setStrategyId}
            />
          </Grid.Col>

          <Grid.Col span={4}>
            <Paper p="xs" radius="sm" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
              <Text size="xs" fw={600} mb={4} c="dimmed">
                Min Spread Sweep ($)
              </Text>
              <Group gap={6}>
                <NumberInput size="xs" label="Start" value={spreadStart} onChange={(v) => setSpreadStart(Number(v) || 0.005)} w={70} />
                <NumberInput size="xs" label="End" value={spreadEnd} onChange={(v) => setSpreadEnd(Number(v) || 0.05)} w={70} />
                <NumberInput size="xs" label="Step" value={spreadStep} onChange={(v) => setSpreadStep(Number(v) || 0.01)} w={70} />
              </Group>
            </Paper>
          </Grid.Col>

          <Grid.Col span={4}>
            <Paper p="xs" radius="sm" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
              <Text size="xs" fw={600} mb={4} c="dimmed">
                Max Size Sweep (Contracts)
              </Text>
              <Group gap={6}>
                <NumberInput size="xs" label="Start" value={sizeStart} onChange={(v) => setSizeStart(Number(v) || 5)} w={70} />
                <NumberInput size="xs" label="End" value={sizeEnd} onChange={(v) => setSizeEnd(Number(v) || 25)} w={70} />
                <NumberInput size="xs" label="Step" value={sizeStep} onChange={(v) => setSizeStep(Number(v) || 5)} w={70} />
              </Group>
            </Paper>
          </Grid.Col>
        </Grid>

        <Group justify="flex-end">
          <Button
            color="amber"
            leftSection={<IconPlayerPlay size={16} />}
            onClick={handleRunOptimization}
            loading={running}
            disabled={!strategyId}
          >
            Run Grid Optimization
          </Button>
        </Group>

        {bestResult && (
          <Paper p="xs" radius="md" withBorder style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b' }}>
            <Group justify="space-between">
              <Text size="xs" fw={700} c="amber">
                OPTIMAL PARAMETER PERMUTATION
              </Text>
              <Badge color="amber" variant="light">
                Sharpe: {bestResult.sharpe_ratio.toFixed(2)}
              </Badge>
            </Group>
            <Group gap="lg" mt={4}>
              <Text size="xs">Min Spread: <strong>${bestResult.min_spread.toFixed(3)}</strong></Text>
              <Text size="xs">Max Size: <strong>{bestResult.max_position_size}</strong></Text>
              <Text size="xs">Net PnL: <strong style={{ color: '#4ade80' }}>+${bestResult.total_pnl.toFixed(2)}</strong></Text>
              <Text size="xs">Win Rate: <strong>{(bestResult.win_rate * 100).toFixed(1)}%</strong></Text>
            </Group>
          </Paper>
        )}

        {results.length > 0 && (
          <>
            <Text fw={600} size="xs" c="dimmed">
              Grid Permutations Matrix Results ({results.length} Iterations Evaluated)
            </Text>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Min Spread</Table.Th>
                  <Table.Th>Max Size</Table.Th>
                  <Table.Th>Net PnL ($)</Table.Th>
                  <Table.Th>Win Rate %</Table.Th>
                  <Table.Th>Sharpe Ratio</Table.Th>
                  <Table.Th>Max Drawdown</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {results.map((r, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>${r.min_spread.toFixed(3)}</Table.Td>
                    <Table.Td>{r.max_position_size}</Table.Td>
                    <Table.Td fw={700} c={r.total_pnl >= 0 ? 'green' : 'red'}>
                      {r.total_pnl >= 0 ? '+' : ''}${r.total_pnl.toFixed(2)}
                    </Table.Td>
                    <Table.Td c="sky">{(r.win_rate * 100).toFixed(1)}%</Table.Td>
                    <Table.Td c="teal">{r.sharpe_ratio.toFixed(2)}</Table.Td>
                    <Table.Td c="red">{(r.max_drawdown * 100).toFixed(1)}%</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </>
        )}
      </Stack>
    </Card>
  );
}
