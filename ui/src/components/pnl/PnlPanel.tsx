import { Card, Text, Group, SegmentedControl, Stack } from '@mantine/core';
import { useEngineStore } from '../../state/engineStore';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useMemo, useState } from 'react';
import { loadPrefs, savePrefs } from '../../lib/prefs';

type TimeRange = 'all' | '5m' | '1h' | '1d';

function rangeToMs(range: TimeRange): number | null {
  switch (range) {
    case '5m':
      return 5 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '1d':
      return 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

export function PnlPanel() {
  const pnlSeries = useEngineStore((s) => s.pnlSeries);
  const prefs = loadPrefs();
  const [range, setRange] = useState<TimeRange>(
    (prefs.pnlRange as TimeRange) || 'all'
  );

  const filtered = useMemo(() => {
    const windowMs = rangeToMs(range);
    if (!windowMs) return pnlSeries;
    const now = Date.now();
    return pnlSeries.filter((p) => now - p.t <= windowMs);
  }, [pnlSeries, range]);

  const options: ApexOptions = {
    chart: {
      id: 'global-pnl',
      toolbar: { show: false },
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
  };

  const series = [
    {
      name: 'PnL',
      data: filtered.map((p) => [p.t, p.pnl] as [number, number]),
    },
  ];

  function handleRangeChange(value: string) {
    const r = value as TimeRange;
    setRange(r);
    savePrefs({ pnlRange: r });
  }

  return (
    <Card withBorder radius="md" h="100%">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={500}>Global PnL</Text>
          <SegmentedControl
            size="xs"
            value={range}
            onChange={handleRangeChange}
            data={[
              { label: 'All', value: 'all' },
              { label: '5m', value: '5m' },
              { label: '1h', value: '1h' },
              { label: '1d', value: '1d' },
            ]}
          />
        </Group>
        {filtered.length === 0 ? (
          <Text size="xs" c="dimmed">
            Waiting for PnL data...
          </Text>
        ) : (
          <ReactApexChart options={options} series={series} type="line" height={260} />
        )}
      </Stack>
    </Card>
  );
}
