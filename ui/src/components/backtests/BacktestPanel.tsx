import {
  Card,
  Text,
  Select,
  Button,
  Group,
  Stack,
  NumberInput,
  Badge,
} from '@mantine/core';
import { DateTime } from 'luxon'
import { useState } from 'react';
import { useEngineStore } from '../../state/engineStore';
import { runBacktest } from '../../api/engine';

export function BacktestPanel() {
  const strategies = useEngineStore((s) => s.strategies);
  const backtests = useEngineStore((s) => s.backtests);
  const [strategyId, setStrategyId] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState<number>(7);
  const [running, setRunning] = useState(false);

  const strategyOptions = strategies.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  async function handleRun() {
    if (!strategyId) return;
    setRunning(true);
    const now = DateTime.now();
    const start = now.minus({ days: daysBack });

    try {
      await runBacktest({
        strategy_id: strategyId,
        start_ts: start.toMillis(),
        end_ts: now.toMillis(),
      });
    } catch (e) {
      console.error('Failed to run backtest', e);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card withBorder radius="md" h="100%">
      <Text fw={500} mb="xs">
        Run Backtest
      </Text>
      <Stack gap="sm">
        <Select
          label="Strategy"
          placeholder="Select strategy"
          data={strategyOptions}
          value={strategyId}
          onChange={setStrategyId}
          searchable
          nothingFoundMessage="No strategies"
        />
        <NumberInput
          label="Lookback (days)"
          value={daysBack}
          onChange={(val) => setDaysBack(Number(val) || 1)}
          min={1}
          max={365}
        />
        <Group justify="flex-end">
          <Button
            onClick={handleRun}
            disabled={!strategyId || running}
            loading={running}
          >
            Run backtest
          </Button>
        </Group>

        {backtests.length > 0 && (
          <>
            <Text fw={500} size="sm">
              Recent runs
            </Text>
            <Stack gap={4}>
              {backtests.slice(0, 5).map((b) => (
                <Group key={b.id} justify="space-between">
                  <Text size="xs">
                    {b.strategy_id} – {b.id}
                  </Text>
                  <Badge
                    size="xs"
                    color={
                      b.status === 'done'
                        ? 'green'
                        : b.status === 'error'
                        ? 'red'
                        : b.status === 'running'
                        ? 'yellow'
                        : 'gray'
                    }
                  >
                    {b.status}
                  </Badge>
                </Group>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
}
