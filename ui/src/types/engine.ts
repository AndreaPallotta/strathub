export type EngineConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface PnlPoint {
  t: number;
  pnl: number;
}

export interface DrawdownPoint {
  t: number;
  drawdown_pct: number;
}

export interface TradeDistributionPoint {
  trade_num: number;
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
  realized_pnl?: number;
  mark?: number;
  unrealized_pnl?: number;
  strategy_id?: string;
}

export interface Trade {
  id?: string;
  strategy_id: string;
  kalshi_ticker?: string;
  instrument?: string;
  ts?: number;
  side: string;
  size: number;
  price: number;
  reason?: string;
  pnl?: number;
}

export interface BacktestRun {
  id: string;
  strategy_id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  started_at?: number;
  finished_at?: number;
  total_pnl?: number;
  win_rate?: number;
  total_trades?: number;
  max_drawdown?: number;
  sharpe_ratio?: number;
  lookback_days?: number;
  pnl_series?: PnlPoint[];
  drawdown_series?: DrawdownPoint[];
  trade_distribution?: TradeDistributionPoint[];
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
