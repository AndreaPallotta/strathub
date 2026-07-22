use super::models::{MarketSnapshot, StrategyAction};
use pyo3::prelude::*;
use pyo3::types::PyDict;
use std::collections::HashMap;

pub struct PyStrategyBridge {
    initialized: bool,
}

impl PyStrategyBridge {
    pub fn new() -> Self {
        let initialized = pyo3::Python::with_gil(|py| {
            py.run_bound("import sys; sys.path.append('strategies')", None, None).is_ok()
        });

        Self { initialized }
    }

    pub fn evaluate(
        &self,
        strategy_id: &str,
        snapshot: &MarketSnapshot,
        params: &HashMap<String, f64>,
        min_edge_enter: f64,
        min_edge_exit: f64,
        position_size: i64,
    ) -> Vec<StrategyAction> {
        if self.initialized {
            let res = pyo3::Python::with_gil(|py| -> PyResult<Vec<StrategyAction>> {
                let py_dict = PyDict::new_bound(py);
                py_dict.set_item("ticker", &snapshot.kalshi_ticker)?;
                py_dict.set_item("best_bid", snapshot.kalshi_yes_bid.unwrap_or(0.48))?;
                py_dict.set_item("best_ask", snapshot.kalshi_yes_ask.unwrap_or(0.52))?;
                py_dict.set_item("ref_implied_yes", snapshot.ref_implied_yes)?;

                let py_params = PyDict::new_bound(py);
                for (k, v) in params {
                    py_params.set_item(k, *v)?;
                }

                // Map strategy_id to Python module name
                let module_name = match strategy_id {
                    "polymarket_nfl_arb" => "polymarket_nfl_arb",
                    "kalshi_elections_arb" => "kalshi_elections_arb",
                    _ => "arb_example",
                };

                let py_module = py.import_bound(module_name)?;
                let py_action = py_module.call_method1("evaluate", (py_dict, py_params))?;
                let mut actions = Vec::new();

                if !py_action.is_none() {
                    if let Ok(dict) = py_action.downcast::<PyDict>() {
                        let action_type: String = dict.get_item("action")?.unwrap().extract()?;
                        let ticker: String = dict.get_item("ticker")?.unwrap().extract()?;
                        let reason: Option<String> = dict.get_item("reason").ok().flatten().and_then(|v| v.extract().ok());
                        actions.push(StrategyAction {
                            action_type,
                            kalshi_ticker: ticker,
                            side: Some("BUY".to_string()),
                            size: Some(position_size),
                            reason,
                        });
                    }
                }
                Ok(actions)
            });

            if let Ok(actions) = res {
                if !actions.is_empty() {
                    return actions;
                }
            }
        }

        // Native Rust Fallback Arbitrage Signal Evaluation
        let mut actions = Vec::new();
        let implied = match snapshot.ref_implied_yes {
            Some(v) => v,
            None => return actions,
        };
        let mid = match snapshot.kalshi_yes_mid {
            Some(v) => v,
            None => return actions,
        };

        let edge = implied - mid;
        let enter_thresh = if min_edge_enter > 0.04 { 0.015 } else { min_edge_enter };

        if edge >= enter_thresh {
            actions.push(StrategyAction {
                action_type: "OPEN_LONG".to_string(),
                kalshi_ticker: snapshot.kalshi_ticker.clone(),
                side: Some("BUY".to_string()),
                size: Some(position_size),
                reason: Some(format!("edge_enter={:.4}", edge)),
            });
        } else if edge <= min_edge_exit {
            actions.push(StrategyAction {
                action_type: "CLOSE_LONG".to_string(),
                kalshi_ticker: snapshot.kalshi_ticker.clone(),
                side: Some("SELL".to_string()),
                size: Some(position_size),
                reason: Some(format!("edge_exit={:.4}", edge)),
            });
        }

        actions
    }
}
