export type EngineConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface PnlPoint {
  t: number;
  pnl: number;
}

export interface Strategy {
  id: string;
  name: string;
  enabled: boolean;
}

export interface Position {
  instrument: string;
  size: number;
  avg_price: number;
  unrealized_pnl?: number;
  strategy_id?: string;
}

export interface Trade {
  id: string;
  strategy_id: string;
  instrument: string;
  ts: number;
  side: 'buy' | 'sell';
  size: number;
  price: number;
  pnl?: number;
}

export interface BacktestRun {
  id: string;
  strategy_id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  started_at?: number;
  finished_at?: number;
}

export type EngineEvent =
  | { type: 'pnl_update'; timestamp: number; pnl: number; strategy_id?: string }
  | { type: 'strategy_snapshot'; strategies: Strategy[] }
  | { type: 'strategy_status'; strategy_id: string; enabled: boolean; name?: string }
  | { type: 'positions_snapshot'; positions: Position[] }
  | { type: 'position_update'; position: Position }
  | { type: 'trade'; trade: Trade }
  | { type: 'backtest_status'; backtest: BacktestRun }
  | { type: 'log'; message: string; level?: string; timestamp?: number }
  | { type: 'metrics'; timestamp: number; cpu: number; mem_gb?: number };
