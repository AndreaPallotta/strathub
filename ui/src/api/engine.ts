import { apiFetch } from '../lib/httpClient';
import type { Strategy } from '../types/engine';

export async function toggleStrategy(id: string, enabled: boolean): Promise<void> {
  await apiFetch<void>(`/strategies/${id}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export interface RunBacktestPayload {
  strategy_id: string;
  start_ts: number;
  end_ts: number;
  // TODO: Add additional parameters
}

export interface RunBacktestResponse {
  backtest_id: string;
  status: 'queued' | 'running' | 'done' | 'error';
}

export type EngineCommand =
  | 'pause_all'
  | 'resume_all'
  | 'reload_config';

export async function sendEngineCommand(
  command: EngineCommand
): Promise<void> {
  await apiFetch<void>('/engine/command', {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
}

export async function runBacktest(
  payload: RunBacktestPayload
): Promise<RunBacktestResponse> {
  return apiFetch<RunBacktestResponse>(`/backtests/run`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchStrategiesSnapshot(): Promise<Strategy[]> {
  return apiFetch<Strategy[]>(`/strategies`);
}

export async function updateStrategyConfig(
  strategyId: string,
  config: unknown
): Promise<void> {
  await apiFetch<void>(`/strategies/${encodeURIComponent(strategyId)}/config`, {
    method: 'POST',
    body: JSON.stringify({ config }),
  });
}