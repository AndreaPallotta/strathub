import {
  Card,
  Text,
  Table,
  Badge,
  Group,
  TextInput,
  SegmentedControl,
  Stack,
  ScrollArea,
} from '@mantine/core';
import { useEngineStore } from '../../state/engineStore';
import { useMemo, useState } from 'react';
import { loadPrefs, savePrefs } from '../../lib/prefs';

type SideFilter = 'all' | 'buy' | 'sell';
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

export function TradesPanel() {
  const trades = useEngineStore((s) => s.trades);
  const selectedStrategyId = useEngineStore((s) => s.selectedStrategyId);
  const prefs = loadPrefs();

  const [instrumentFilter, setInstrumentFilter] = useState('');
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [range, setRange] = useState<TimeRange>(
    (prefs.tradesRange as TimeRange) || 'all'
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const windowMs = rangeToMs(range);

    return trades.filter((t) => {
      const inst = t.instrument || t.kalshi_ticker || '';
      const timestamp = t.ts || Date.now();
      if (selectedStrategyId && t.strategy_id !== selectedStrategyId) {
        return false;
      }
      if (
        instrumentFilter &&
        !inst.toLowerCase().includes(instrumentFilter.toLowerCase())
      ) {
        return false;
      }
      if (sideFilter !== 'all' && t.side.toLowerCase() !== sideFilter.toLowerCase()) {
        return false;
      }
      if (windowMs != null && now - timestamp > windowMs) {
        return false;
      }
      return true;
    });
  }, [trades, selectedStrategyId, instrumentFilter, sideFilter, range]);

  const title = selectedStrategyId
    ? `Trades – ${selectedStrategyId}`
    : 'Recent Trades';

  function handleRangeChange(value: string) {
    const r = value as TimeRange;
    setRange(r);
    savePrefs({ tradesRange: r });
  }

  return (
    <Card withBorder radius="md" h="100%">
      <Stack gap="xs" mb="xs">
        <Group justify="space-between">
          <Text fw={500}>{title}</Text>
          <Badge size="sm" variant="light">
            {filtered.length} shown
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
          <SegmentedControl
            size="xs"
            value={sideFilter}
            onChange={(v) => setSideFilter(v as SideFilter)}
            data={[
              { label: 'All', value: 'all' },
              { label: 'Buy', value: 'buy' },
              { label: 'Sell', value: 'sell' },
            ]}
          />
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
      </Stack>

      {filtered.length === 0 ? (
        <Text size="xs" c="dimmed" mt="xs">
          No trades match filters.
        </Text>
      ) : (
        <ScrollArea h={260} type="always" offsetScrollbars>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Time</Table.Th>
                <Table.Th>Strategy</Table.Th>
                <Table.Th>Instrument</Table.Th>
                <Table.Th>Side</Table.Th>
                <Table.Th>Size</Table.Th>
                <Table.Th>Price</Table.Th>
                <Table.Th>PnL</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((t, idx) => {
                const isBuy = t.side.toUpperCase() === 'BUY';
                return (
                  <Table.Tr key={t.id ?? idx}>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {new Date(t.ts || Date.now()).toLocaleTimeString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>{t.strategy_id}</Table.Td>
                    <Table.Td>{t.instrument || t.kalshi_ticker || 'N/A'}</Table.Td>
                    <Table.Td>
                      <Badge
                        size="xs"
                        color={isBuy ? 'teal' : 'orange'}
                        variant="filled"
                      >
                        {t.side.toUpperCase()}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{t.size}</Table.Td>
                    <Table.Td>${t.price.toFixed(3)}</Table.Td>
                    <Table.Td>
                      {t.pnl != null ? (
                        <Text
                          size="xs"
                          fw={600}
                          c={t.pnl > 0 ? 'green' : t.pnl < 0 ? 'red' : 'dimmed'}
                        >
                          {t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(2)}
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Card>
  );
}
