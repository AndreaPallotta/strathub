import { create } from 'zustand';
import type {
  EngineConnectionStatus,
  PnlPoint,
  Strategy,
  Position,
  Trade,
  BacktestRun,
} from '../types/engine';

interface EngineState {
  connectionStatus: EngineConnectionStatus;
  pnlSeries: PnlPoint[];
  strategyPnl: Record<string, PnlPoint[]>;
  strategies: Strategy[];
  positions: Position[];
  trades: Trade[];
  backtests: BacktestRun[];
  logs: string[];
  selectedStrategyId: string | null;
  metrics?: {
  lastCpu: number;
  lastMemGb: number | null;
  ts: number;
};
}

interface EngineActions {
  setConnectionStatus: (status: EngineConnectionStatus) => void;
  addPnlPoint: (point: PnlPoint) => void;
  addStrategyPnlPoint: (strategyId: string, point: PnlPoint) => void;
  setStrategies: (strategies: Strategy[]) => void;
  upsertStrategy: (strategy: Strategy) => void;
  setPositions: (positions: Position[]) => void;
  upsertPosition: (position: Position) => void;
  addTrade: (trade: Trade) => void;
  upsertBacktest: (run: BacktestRun) => void;
  addLog: (line: string) => void;
  reset: () => void;
  setSelectedStrategy: (id: string | null) => void;
  setMetrics: (cpu: number, memGb: number | null, ts: number) => void;
}

export type EngineStore = EngineState & EngineActions;

export const useEngineStore = create<EngineStore>((set, _) => ({
  connectionStatus: 'disconnected',
  pnlSeries: [],
  strategyPnl: {},
  strategies: [],
  positions: [],
  trades: [],
  backtests: [],
  logs: [],
  selectedStrategyId: null,
  lastEventAt: null,
  lastError: null,
  metrics: undefined,

  setConnectionStatus(status) {
    set({ connectionStatus: status });
  },

  addPnlPoint(point) {
    set((state) => ({
      pnlSeries: [...state.pnlSeries, point],
    }));
  },

  addStrategyPnlPoint(strategyId, point) {
    set((state) => {
      const existing = state.strategyPnl[strategyId] ?? [];
      return {
        strategyPnl: {
          ...state.strategyPnl,
          [strategyId]: [...existing, point],
        },
      };
    });
  },

  setStrategies(strategies) {
    set({ strategies });
  },

  upsertStrategy(strategy) {
    set((state) => {
      const idx = state.strategies.findIndex((s) => s.id === strategy.id);
      if (idx === -1) {
        return { strategies: [...state.strategies, strategy] };
      }
      const copy = [...state.strategies];
      copy[idx] = { ...copy[idx], ...strategy };
      return { strategies: copy };
    });
  },

  setPositions(positions) {
    set({ positions });
  },

  upsertPosition(position) {
    set((state) => {
      const idx = state.positions.findIndex(
        (p) =>
          p.instrument === position.instrument &&
          p.strategy_id === position.strategy_id
      );
      if (idx === -1) {
        return { positions: [...state.positions, position] };
      }
      const copy = [...state.positions];
      copy[idx] = { ...copy[idx], ...position };
      return { positions: copy };
    });
  },

  addTrade(trade) {
    const MAX_TRADES = 200;
    set((state) => {
      const next = [trade, ...state.trades];
      if (next.length > MAX_TRADES) next.length = MAX_TRADES;
      return { trades: next };
    });
  },

  upsertBacktest(run) {
    set((state) => {
      const idx = state.backtests.findIndex((b) => b.id === run.id);
      if (idx === -1) {
        return { backtests: [run, ...state.backtests] };
      }
      const copy = [...state.backtests];
      copy[idx] = { ...copy[idx], ...run };
      return { backtests: copy };
    });
  },

  addLog(line) {
    const MAX_LOGS = 500;
    set((state) => {
      const next = [...state.logs, line];
      if (next.length > MAX_LOGS) {
        next.splice(0, next.length - MAX_LOGS);
      }
      return { logs: next };
    });
  },

  setSelectedStrategy(id) {
    set({ selectedStrategyId: id });
  },

  reset() {
    set({
      connectionStatus: 'disconnected',
      pnlSeries: [],
      strategyPnl: {},
      strategies: [],
      positions: [],
      trades: [],
      backtests: [],
      logs: [],
      selectedStrategyId: null,
    });
  },

  setMetrics(cpu, memGb, ts) {
    set({
      metrics: { lastCpu: cpu, lastMemGb: memGb, ts },
    });
  },
}));