import { invoke } from '@tauri-apps/api/core';
import type { PnlPoint, DrawdownPoint, TradeDistributionPoint } from '../types/engine';

export interface AppVersionInfo {
  version: string;
  engine: string;
  edition: string;
}

export async function fetchAppVersion(): Promise<AppVersionInfo> {
  try {
    return await invoke<AppVersionInfo>('get_app_version');
  } catch (err) {
    return {
      version: '2.0.0-dev',
      engine: 'Rust Core',
      edition: '2021',
    };
  }
}

export async function toggleStrategy(id: string, enabled: boolean): Promise<void> {
  try {
    await invoke('toggle_strategy', { strategyId: id, enabled });
  } catch (err) {
    console.warn('Tauri IPC not available', err);
  }
}

export interface RunBacktestPayload {
  strategy_id: string;
  start_ts?: number;
  end_ts?: number;
  days_back?: number;
}

export interface RunBacktestResponse {
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

export type EngineCommand =
  | 'pause_all'
  | 'resume_all'
  | 'reload_config';

export async function sendEngineCommand(
  command: EngineCommand
): Promise<void> {
  try {
    if (command === 'pause_all') {
      await invoke('set_engine_running', { running: false });
    } else if (command === 'resume_all') {
      await invoke('set_engine_running', { running: true });
    }
  } catch (err) {
    console.warn('Tauri IPC command failed', err);
  }
}

export async function runBacktest(
  payload: RunBacktestPayload
): Promise<RunBacktestResponse> {
  try {
    const daysBack = payload.days_back || 7;
    const res = await invoke<any>('run_backtest', {
      strategyId: payload.strategy_id,
      daysBack,
    });
    return res;
  } catch (err) {
    return {
      id: `bt_err_${Date.now()}`,
      strategy_id: payload.strategy_id,
      status: 'error',
    };
  }
}

export async function updateStrategyConfig(
  strategyId: string,
  config: unknown
): Promise<void> {
  if (typeof config === 'object' && config !== null) {
    await updateStrategyParams(strategyId, config as Record<string, number>);
  }
}

export async function updateStrategyParams(
  strategyId: string,
  params: Record<string, number>
): Promise<void> {
  try {
    await invoke('update_strategy_params', { strategyId, params });
  } catch (err) {
    console.warn('Failed to update strategy params via Tauri IPC', err);
  }
}

export async function fetchEngineSnapshot(): Promise<any> {
  try {
    return await invoke('get_engine_snapshot');
  } catch (err) {
    console.warn('Failed to fetch snapshot via Tauri IPC', err);
    return null;
  }
}