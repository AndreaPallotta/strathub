import { Group, Text } from '@mantine/core';
import { useEngineStore } from '../../state/engineStore';
import { useEffect, useState } from 'react';

function formatAge(ms: number | null): string {
  if (!ms) return 'never';
  const diff = Date.now() - ms;
  if (diff < 5_000) return 'just now';
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

export function EngineMetricsWidget() {
  const pnlSeries = useEngineStore((s) => s.pnlSeries);
  const [lastEventTs, setLastEventTs] = useState<number | null>(null);
  const [eps, setEps] = useState<number>(0);

  useEffect(() => {
    if (!pnlSeries.length) return;

    const last = pnlSeries[pnlSeries.length - 1]?.t ?? null;
    setLastEventTs(last);

    const now = Date.now();
    const windowMs = 60_000;
    const cutoff = now - windowMs;
    const recent = pnlSeries.filter((p) => p.t >= cutoff);
    const rate = recent.length / (windowMs / 1000);
    setEps(rate);
  }, [pnlSeries]);

  return (
    <Group gap="md">
      <Text size="xs" c="dimmed">
        last PnL: {formatAge(lastEventTs)}
      </Text>
      <Text size="xs" c="dimmed">
        events/s: {eps.toFixed(2)}
      </Text>
    </Group>
  );
}
