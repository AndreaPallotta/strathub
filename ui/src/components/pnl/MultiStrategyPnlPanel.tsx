import { useMemo, useState } from 'react';
import {
  Card,
  Text,
  Group,
  MultiSelect,
  Badge,
  Stack,
} from '@mantine/core';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useEngineStore } from '../../state/engineStore';

export function MultiStrategyPnlPanel() {
  const strategies = useEngineStore((s) => s.strategies);
  const strategyPnl = useEngineStore((s) => s.strategyPnl);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const optionsData = useMemo(
    () =>
      strategies.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    [strategies],
  );

  const effectiveIds =
    selectedIds.length > 0 ? selectedIds : strategies.map((s) => s.id);

  const series = useMemo(() => {
    return effectiveIds
      .map((id) => {
        const data = strategyPnl[id] ?? [];
        if (!data.length) return null;
        return {
          name: id,
          data: data.map((p) => [p.t, p.pnl] as [number, number]),
        };
      })
      .filter(Boolean) as { name: string; data: [number, number][] }[];
  }, [effectiveIds, strategyPnl]);

  const options: ApexOptions = {
    chart: {
      id: 'multi-strategy-pnl',
      toolbar: { show: true },
      animations: { enabled: true },
    },
    xaxis: {
      type: 'datetime',
    },
    yaxis: {
      decimalsInFloat: 2,
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    legend: {
      show: true,
    },
  };

  return (
    <Card withBorder radius="md" h="100%">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={500}>Multi-strategy PnL</Text>
          <Badge size="sm" variant="light">
            {series.length} shown
          </Badge>
        </Group>

        <MultiSelect
          size="xs"
          data={optionsData}
          value={selectedIds}
          onChange={setSelectedIds}
          placeholder="Select strategies (empty = all with data)"
          searchable
          clearable
        />

        {series.length === 0 ? (
          <Text size="xs" c="dimmed">
            No per-strategy PnL data yet. Make sure your engine sends
            <code> pnl_update </code> events with <code>strategy_id</code>.
          </Text>
        ) : (
          <ReactApexChart
            options={options}
            series={series}
            type="line"
            height={260}
          />
        )}
      </Stack>
    </Card>
  );
}
