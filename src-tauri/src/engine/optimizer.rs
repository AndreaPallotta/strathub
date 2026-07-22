#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub min_spread: f64,
    pub max_position_size: i64,
    pub total_pnl: f64,
    pub win_rate: f64,
    pub sharpe_ratio: f64,
    pub max_drawdown: f64,
}

pub struct ParameterOptimizer;

impl ParameterOptimizer {
    pub fn run_grid_search(
        _strategy_id: &str,
        min_spread_range: (f64, f64, f64), // (start, end, step)
        size_range: (i64, i64, i64),       // (start, end, step)
    ) -> Vec<OptimizationResult> {
        let mut results = Vec::new();
        let mut min_spread = min_spread_range.0;

        while min_spread <= min_spread_range.1 {
            let mut size = size_range.0;
            while size <= size_range.1 {
                // Simulate backtest performance metrics for (min_spread, size)
                let base_pnl = 200.0 - (min_spread * 1500.0) + (size as f64 * 8.5);
                let win_rate = (0.75 - (min_spread * 1.5)).clamp(0.40, 0.90);
                let sharpe = (2.8 - (min_spread * 10.0) + (size as f64 * 0.05)).clamp(0.5, 4.0);
                let max_dd = (-0.02 - (size as f64 * 0.003)).clamp(-0.25, -0.01);

                results.push(OptimizationResult {
                    min_spread: (min_spread * 1000.0).round() / 1000.0,
                    max_position_size: size,
                    total_pnl: (base_pnl * 100.0).round() / 100.0,
                    win_rate: (win_rate * 1000.0).round() / 1000.0,
                    sharpe_ratio: (sharpe * 100.0).round() / 100.0,
                    max_drawdown: (max_dd * 1000.0).round() / 100.0,
                });

                size += size_range.2;
            }
            min_spread += min_spread_range.2;
        }

        results
    }
}
