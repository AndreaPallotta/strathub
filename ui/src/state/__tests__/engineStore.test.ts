import { describe, it, expect, beforeEach } from 'vitest';
import { useEngineStore } from '../engineStore';

describe('engineStore Zustand state', () => {
  beforeEach(() => {
    useEngineStore.getState().reset();
  });

  it('initializes with default disconnected state', () => {
    const state = useEngineStore.getState();
    expect(state.connectionStatus).toBe('disconnected');
    expect(state.strategies).toEqual([]);
    expect(state.positions).toEqual([]);
    expect(state.pnlSeries).toEqual([]);
  });

  it('updates connection status correctly', () => {
    useEngineStore.getState().setConnectionStatus('connected');
    expect(useEngineStore.getState().connectionStatus).toBe('connected');
  });

  it('upserts positions correctly', () => {
    const store = useEngineStore.getState();
    store.upsertPosition({
      instrument: 'KXNFL-CHIEFS',
      strategy_id: 'arb_example',
      size: 10,
      avg_price: 0.52,
      realized_pnl: 0,
      mark: 0.55,
      unrealized_pnl: 0.30,
    });

    expect(useEngineStore.getState().positions.length).toBe(1);
    expect(useEngineStore.getState().positions[0].size).toBe(10);

    // Update existing position
    useEngineStore.getState().upsertPosition({
      instrument: 'KXNFL-CHIEFS',
      strategy_id: 'arb_example',
      size: 20,
      avg_price: 0.50,
      realized_pnl: 1.20,
      mark: 0.60,
      unrealized_pnl: 2.00,
    });

    expect(useEngineStore.getState().positions.length).toBe(1);
    expect(useEngineStore.getState().positions[0].size).toBe(20);
  });
});
