import { Card, Text } from '@mantine/core';
import { useEngineStore } from '../../state/engineStore';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

export function StrategyPnlChart() {
  const selectedStrategyId = useEngineStore((s) => s.selectedStrategyId);
  const globalPnl = useEngineStore((s) => s.pnlSeries);
  const strategyPnlMap = useEngineStore((s) => s.strategyPnl);

  const seriesData =
    selectedStrategyId && strategyPnlMap[selectedStrategyId]
      ? strategyPnlMap[selectedStrategyId]
      : globalPnl;

  const title = selectedStrategyId
    ? `PnL – ${selectedStrategyId}`
    : 'PnL – all strategies';

  const options: ApexOptions = {
    chart: {
      id: 'strategy-pnl-mini',
      animations: { enabled: true },
      toolbar: { show: false },
      sparkline: {
        enabled: true,
      },
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
      data: seriesData.map((p) => [p.t, p.pnl] as [number, number]),
    },
  ];

  return (
    <Card withBorder radius="md" h="100%">
      <Text fw={500} mb="xs">
        {title}
      </Text>
      {seriesData.length === 0 ? (
        <Text size="xs" c="dimmed">
          Waiting for PnL data...
        </Text>
      ) : (
        <ReactApexChart
          options={options}
          series={series}
          type="line"
          height={120}
        />
      )}
    </Card>
  );
}
