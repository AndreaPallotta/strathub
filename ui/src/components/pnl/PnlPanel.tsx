import { Card, Text, Group, SegmentedControl, Stack, Badge, Button } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
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
  const strategyPnl = useEngineStore((s) => s.strategyPnl);
  const selectedStrategyId = useEngineStore((s) => s.selectedStrategyId);
  const setSelectedStrategy = useEngineStore((s) => s.setSelectedStrategy);
  const strategies = useEngineStore((s) => s.strategies);

  const prefs = loadPrefs();
  const [range, setRange] = useState<TimeRange>(
    (prefs.pnlRange as TimeRange) || 'all'
  );

  const selectedStrat = useMemo(() => {
    return strategies.find((s) => s.id === selectedStrategyId);
  }, [strategies, selectedStrategyId]);

  const activeSeriesData = useMemo(() => {
    if (selectedStrategyId && strategyPnl[selectedStrategyId] && strategyPnl[selectedStrategyId].length > 0) {
      return strategyPnl[selectedStrategyId];
    }
    return pnlSeries;
  }, [selectedStrategyId, strategyPnl, pnlSeries]);

  const filtered = useMemo(() => {
    const windowMs = rangeToMs(range);
    if (!windowMs) return activeSeriesData;
    const now = Date.now();
    return activeSeriesData.filter((p) => now - p.t <= windowMs);
  }, [activeSeriesData, range]);

  const options: ApexOptions = {
    chart: {
      id: 'global-pnl',
      toolbar: { show: false },
      animations: { enabled: true },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false, // Display in local browser timezone (e.g. 15:23)
      },
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
      name: selectedStrat ? `${selectedStrat.name} PnL` : 'Global PnL',
      data: filtered.map((p) => [p.t, p.pnl] as [number, number]),
    },
  ];

  function handleRangeChange(value: string) {
    const r = value as TimeRange;
    setRange(r);
    savePrefs({ pnlRange: r });
  }

  const handleClearSelection = () => {
    setSelectedStrategy(null);
    savePrefs({ selectedStrategyId: null });
  };

  return (
    <Card withBorder radius="md" h="100%">
      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <Text fw={600}>
              {selectedStrat ? `${selectedStrat.name} PnL` : 'Global Portfolio PnL'}
            </Text>
            {selectedStrat ? (
              <Badge
                size="sm"
                color="sky"
                variant="filled"
                rightSection={
                  <IconX
                    size={12}
                    style={{ cursor: 'pointer' }}
                    onClick={handleClearSelection}
                  />
                }
              >
                Strategy: {selectedStrat.id}
              </Badge>
            ) : (
              <Badge size="sm" color="teal" variant="light">
                All Active Strategies
              </Badge>
            )}
          </Group>

          <Group gap="xs">
            {selectedStrat && (
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                onClick={handleClearSelection}
              >
                Show Global PnL
              </Button>
            )}
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
        </Group>

        {filtered.length === 0 ? (
          <Text size="xs" c="dimmed">
            Waiting for PnL data stream...
          </Text>
        ) : (
          <ReactApexChart options={options} series={series} type="line" height={280} />
        )}
      </Stack>
    </Card>
  );
}
