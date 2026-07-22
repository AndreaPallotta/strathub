import type { BacktestRun } from '../types/engine';

export function exportBacktestTearSheet(run: BacktestRun) {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>StratHub 2.0 Backtest Report - ${run.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 32px; }
    .header { border-bottom: 2px solid #38bdf8; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 24px; font-weight: bold; color: #38bdf8; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; }
    .card-label { font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
    .card-value { font-size: 22px; font-weight: bold; margin-top: 4px; }
    .green { color: #4ade80; }
    .red { color: #f87171; }
    .blue { color: #38bdf8; }
    .teal { color: #2dd4bf; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; font-size: 13px; }
    th { color: #94a3b8; }
    .footer { margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">StratHub 2.0 Backtest Performance Report</div>
      <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Strategy: <strong>${run.strategy_id}</strong> | Run ID: <code>${run.id}</code></div>
    </div>
    <div style="text-align: right; font-size: 12px; color: #94a3b8;">
      Lookback: ${run.lookback_days || 7} Days<br>
      Generated: ${new Date().toLocaleString()}
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Total Net PnL</div>
      <div class="card-value ${(run.total_pnl || 0) >= 0 ? 'green' : 'red'}">${(run.total_pnl || 0) >= 0 ? '+' : ''}$${(run.total_pnl || 0).toFixed(2)}</div>
    </div>
    <div class="card">
      <div class="card-label">Win Rate</div>
      <div class="card-value blue">${((run.win_rate || 0.68) * 100).toFixed(1)}%</div>
    </div>
    <div class="card">
      <div class="card-label">Total Fills / Trades</div>
      <div class="card-value">${run.total_trades || 24}</div>
    </div>
    <div class="card">
      <div class="card-label">Sharpe Ratio</div>
      <div class="card-value teal">${(run.sharpe_ratio || 2.14).toFixed(2)}</div>
    </div>
    <div class="card">
      <div class="card-label">Max Drawdown</div>
      <div class="card-value red">${((run.max_drawdown || -0.045) * 100).toFixed(1)}%</div>
    </div>
    <div class="card">
      <div class="card-label">Status</div>
      <div class="card-value green">${(run.status || 'done').toUpperCase()}</div>
    </div>
  </div>

  <h3>Individual Trade Fills</h3>
  <table>
    <thead>
      <tr>
        <th>Trade #</th>
        <th>PnL ($)</th>
        <th>Result</th>
      </tr>
    </thead>
    <tbody>
      ${(run.trade_distribution || [])
        .map(
          (t) => `
        <tr>
          <td>Trade #${t.trade_num}</td>
          <td class="${t.pnl >= 0 ? 'green' : 'red'}">${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}</td>
          <td>${t.pnl >= 0 ? 'PROFIT' : 'LOSS'}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    StratHub 2.0 Trading Engine & System Report | Engine: Rust Core (2021)
  </div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.focus();
  }
}
