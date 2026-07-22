import { useEffect, useState } from 'react';
import { Container, Grid, Card, Text, Title, Badge, Group, Stack, Paper, ThemeIcon } from '@mantine/core';
import { IconRss, IconTrendingUp, IconCpu, IconBriefcase, IconActivity } from '@tabler/icons-react';

import { AppShellLayout, type NavTab } from './components/layout/AppShellLayout';

import { PnlPanel } from './components/pnl/PnlPanel';
import { StrategiesPanel } from './components/strategies/StrategiesPanel';
import { PositionsPanel } from './components/positions/PositionsPanel';
import { StrategyDetailsPanel } from './components/strategies/StrategyDetailsPanel';
import { StrategyConfigPanel } from './components/strategies/StrategyConfigPanel';
import { TradesPanel } from './components/trades/TradesPanel';
import { BacktestPanel } from './components/backtests/BacktestPanel';
import { EngineControlPanel } from './components/control/EngineControlPanel';
import { LogsPanel } from './components/logs/LogsPanel';
import { ParamOptimizerPanel } from './components/optimizer/ParamOptimizerPanel';
import { WebhookSettingsPanel } from './components/settings/WebhookSettingsPanel';

import { useEngineStream } from './hooks/useEngineStream';
import { useEngineStore } from './state/engineStore';
import { loadPrefs } from './lib/prefs';

function App() {
  useEngineStream();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  const strategies = useEngineStore((s) => s.strategies);
  const positions = useEngineStore((s) => s.positions);
  const pnlSeries = useEngineStore((s) => s.pnlSeries);
  const metrics = useEngineStore((s) => s.metrics);

  useEffect(() => {
    const prefs = loadPrefs();
    if (prefs.selectedStrategyId) {
      const { setSelectedStrategy } = useEngineStore.getState();
      setSelectedStrategy(prefs.selectedStrategyId);
    }
  }, []);

  const latestPnl = pnlSeries.length > 0 ? pnlSeries[pnlSeries.length - 1].pnl : 0;
  const activeStratsCount = strategies.filter((s) => s.enabled).length;
  const totalOpenPositions = positions.reduce((sum, p) => sum + Math.abs(p.size), 0);

  return (
    <AppShellLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <Container fluid p={0}>
        {activeTab === 'dashboard' && (
          <Stack gap="md">
            {/* Top Row: Hero Metric Cards */}
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="sm" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Net Portfolio PnL
                    </Text>
                    <ThemeIcon size="sm" color={latestPnl >= 0 ? 'green' : 'red'} variant="light">
                      <IconTrendingUp size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text size="xl" fw={700} c={latestPnl >= 0 ? 'green' : 'red'} mt={2}>
                    {latestPnl >= 0 ? '+' : ''}${latestPnl.toFixed(2)}
                  </Text>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="sm" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Active Strategies
                    </Text>
                    <ThemeIcon size="sm" color="sky" variant="light">
                      <IconCpu size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text size="xl" fw={700} c="sky" mt={2}>
                    {activeStratsCount} / {strategies.length}
                  </Text>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="sm" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Open Contracts
                    </Text>
                    <ThemeIcon size="sm" color="blue" variant="light">
                      <IconBriefcase size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text size="xl" fw={700} mt={2}>
                    {totalOpenPositions} <Text component="span" size="xs" c="dimmed">contracts</Text>
                  </Text>
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Paper p="sm" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                      Engine Memory / Load
                    </Text>
                    <ThemeIcon size="sm" color="teal" variant="light">
                      <IconActivity size={14} />
                    </ThemeIcon>
                  </Group>
                  <Text size="xl" fw={700} c="teal" mt={2}>
                    {metrics?.lastCpu ? `${metrics.lastCpu.toFixed(1)}%` : '1.2%'}
                    <Text component="span" size="xs" c="dimmed" ml={6}>
                      ({metrics?.lastMemGb ? `${metrics.lastMemGb.toFixed(2)} GB` : '0.18 GB'})
                    </Text>
                  </Text>
                </Paper>
              </Grid.Col>
            </Grid>

            {/* Middle Section: Full-Width PnL Performance Chart (Global or Selected Strategy) */}
            <Grid>
              <Grid.Col span={{ base: 12 }}>
                <PnlPanel />
              </Grid.Col>
            </Grid>

            {/* Lower Section: Two-Column Streamlined Command Center */}
            <Grid>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="md">
                  <PositionsPanel />
                  <TradesPanel />
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="md">
                  <StrategiesPanel />
                  <LogsPanel />
                </Stack>
              </Grid.Col>
            </Grid>
          </Stack>
        )}

        {activeTab === 'strategies' && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 5 }}>
              <StrategiesPanel />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <StrategyDetailsPanel />
            </Grid.Col>
            <Grid.Col span={{ base: 12 }} mt="md">
              <StrategyConfigPanel />
            </Grid.Col>
          </Grid>
        )}

        {activeTab === 'positions' && (
          <Grid>
            <Grid.Col span={{ base: 12 }}>
              <PnlPanel />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }} mt="md">
              <PositionsPanel />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }} mt="md">
              <TradesPanel />
            </Grid.Col>
          </Grid>
        )}

        {activeTab === 'feeds' && (
          <Stack gap="md">
            <Card withBorder radius="md">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <ThemeIcon size="lg" color="teal" variant="light">
                    <IconRss size={20} />
                  </ThemeIcon>
                  <div>
                    <Title order={4}>Data Feeds & Market Stream</Title>
                    <Text size="xs" c="dimmed">
                      Configured Market Price Snapshot Ingestion
                    </Text>
                  </div>
                </Group>
                <Badge size="lg" color="teal" variant="filled">
                  Synthetic Mock Mode Active
                </Badge>
              </Group>

              <Grid mt="md">
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <Group justify="space-between">
                      <Text fw={600} size="sm">
                        KXNFL-CHIEFS-WIN
                      </Text>
                      <Badge color="green" size="xs">
                        LIVE
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={4}>
                      Sport: American Football (NFL)
                    </Text>
                    <Text size="xs" c="sky" mt={4}>
                      Simulated YES Mid: ~0.58
                    </Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <Group justify="space-between">
                      <Text fw={600} size="sm">
                        KXPOL-FED-CUT
                      </Text>
                      <Badge color="green" size="xs">
                        LIVE
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={4}>
                      Macro: Federal Reserve Interest Rates
                    </Text>
                    <Text size="xs" c="sky" mt={4}>
                      Simulated YES Mid: ~0.42
                    </Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Paper p="md" radius="md" withBorder style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <Group justify="space-between">
                      <Text fw={600} size="sm">
                        KXEST-SP500-HIGHER
                      </Text>
                      <Badge color="green" size="xs">
                        LIVE
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={4}>
                      Market: S&P 500 Index Prediction
                    </Text>
                    <Text size="xs" c="sky" mt={4}>
                      Simulated YES Mid: ~0.65
                    </Text>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Card>
          </Stack>
        )}

        {activeTab === 'backtest' && (
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <BacktestPanel />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <EngineControlPanel />
            </Grid.Col>
          </Grid>
        )}

        {activeTab === 'optimizer' && (
          <Grid>
            <Grid.Col span={{ base: 12 }}>
              <ParamOptimizerPanel />
            </Grid.Col>
          </Grid>
        )}

        {activeTab === 'webhooks' && (
          <Grid>
            <Grid.Col span={{ base: 12 }}>
              <WebhookSettingsPanel />
            </Grid.Col>
          </Grid>
        )}

        {activeTab === 'logs' && (
          <Grid>
            <Grid.Col span={{ base: 12 }}>
              <LogsPanel />
            </Grid.Col>
          </Grid>
        )}
      </Container>
    </AppShellLayout>
  );
}

export default App;