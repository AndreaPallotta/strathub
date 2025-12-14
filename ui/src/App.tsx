import { useEffect } from 'react';
import { Container, Grid } from '@mantine/core';

import { AppShellLayout } from './components/layout/AppShellLayout';

import { PnlPanel } from './components/pnl/PnlPanel';
import { MultiStrategyPnlPanel } from './components/pnl/MultiStrategyPnlPanel';
import { StrategyPnlChart } from './components/strategies/StrategyPnlChart';
import { StrategiesPanel } from './components/strategies/StrategiesPanel';
import { PositionsPanel } from './components/positions/PositionsPanel';
import { StrategyDetailsPanel } from './components/strategies/StrategyDetailsPanel';
import { StrategyConfigPanel } from './components/strategies/StrategyConfigPanel';
import { TradesPanel } from './components/trades/TradesPanel';
import { BacktestPanel } from './components/backtests/BacktestPanel';
import { EngineControlPanel } from './components/control/EngineControlPanel';
import { LogsPanel } from './components/logs/LogsPanel';

import { useEngineStream } from './hooks/useEngineStream';
import { useEngineStore } from './state/engineStore';
import { loadPrefs } from './lib/prefs';

function App() {
  useEngineStream();

  useEffect(() => {
    const prefs = loadPrefs();
    if (prefs.selectedStrategyId) {
      const { setSelectedStrategy } = useEngineStore.getState();
      setSelectedStrategy(prefs.selectedStrategyId);
    }
  }, []);

  return (
    <AppShellLayout>
      <Container fluid>
        <Grid>

          {/* Row 1: Global PnL + per-strategy mini */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <PnlPanel />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <StrategyPnlChart />
          </Grid.Col>

          {/* Row 1.5: Multi-strategy overlay */}
          <Grid.Col span={{ base: 12 }} mt="md">
            <MultiStrategyPnlPanel />
          </Grid.Col>

          {/* Row 2: Strategies list + Positions + Strategy details */}
          <Grid.Col span={{ base: 12, md: 4 }} mt="md">
            <StrategiesPanel />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }} mt="md">
            <PositionsPanel />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }} mt="md">
            <StrategyDetailsPanel />
          </Grid.Col>

          {/* Row 3: Strategy config editor + Trades */}
          <Grid.Col span={{ base: 12, md: 4 }} mt="md">
            <StrategyConfigPanel />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 8 }} mt="md">
            <TradesPanel />
          </Grid.Col>

          {/* Row 4: Backtests + Engine controls */}
          <Grid.Col span={{ base: 12, md: 6 }} mt="md">
            <BacktestPanel />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }} mt="md">
            <EngineControlPanel />
          </Grid.Col>

          {/* Row 5: Logs (now resizable) */}
          <Grid.Col span={{ base: 12 }} mt="md">
            <LogsPanel />
          </Grid.Col>

        </Grid>
      </Container>
    </AppShellLayout>
  );
}

export default App;