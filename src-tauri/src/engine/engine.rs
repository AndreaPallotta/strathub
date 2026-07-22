#![allow(dead_code)]

use super::feeds::{DataFeed, MockSyntheticFeed};
use super::models::{EngineEvent, FeedMode, StrategyInfo};
use super::py_bridge::PyStrategyBridge;
use super::simulator::ExecutionSimulator;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use tokio::time::{sleep, Duration};

pub struct EngineState {
    pub running: bool,
    pub feed_mode: FeedMode,
    pub strategies: HashMap<String, StrategyInfo>,
    pub params: HashMap<String, f64>,
}

pub struct Engine {
    pub state: Arc<Mutex<EngineState>>,
    pub simulator: Arc<Mutex<ExecutionSimulator>>,
    pub event_tx: broadcast::Sender<EngineEvent>,
    py_bridge: PyStrategyBridge,
}

impl Engine {
    pub fn new() -> (Self, broadcast::Receiver<EngineEvent>) {
        let (event_tx, rx) = broadcast::channel(1000);

        let mut strategies = HashMap::new();
        strategies.insert(
            "polymarket_nfl_arb".to_string(),
            StrategyInfo {
                id: "polymarket_nfl_arb".to_string(),
                name: "Polymarket NFL Moneyline Arbitrage".to_string(),
                enabled: false,
            },
        );
        strategies.insert(
            "kalshi_elections_arb".to_string(),
            StrategyInfo {
                id: "kalshi_elections_arb".to_string(),
                name: "Kalshi Elections & Political Odds Arbitrage".to_string(),
                enabled: false,
            },
        );
        strategies.insert(
            "stat_arb".to_string(),
            StrategyInfo {
                id: "stat_arb".to_string(),
                name: "Statistical Mean Reversion".to_string(),
                enabled: false,
            },
        );

        let mut params = HashMap::new();
        params.insert("min_spread".to_string(), 0.02);
        params.insert("max_position_size".to_string(), 15.0);
        params.insert("cooldown_seconds".to_string(), 1.5);
        params.insert("min_edge_enter".to_string(), 0.08);
        params.insert("min_edge_exit".to_string(), 0.02);
        params.insert("position_size".to_string(), 10.0);

        let state = Arc::new(Mutex::new(EngineState {
            running: true,
            feed_mode: FeedMode::SyntheticMock,
            strategies,
            params,
        }));

        let simulator = Arc::new(Mutex::new(ExecutionSimulator::new(10, 5000.0, 0.005, 0.005)));
        let py_bridge = PyStrategyBridge::new();

        (
            Self {
                state,
                simulator,
                event_tx,
                py_bridge,
            },
            rx,
        )
    }

    pub async fn run_loop(&self) {
        let mut feed = MockSyntheticFeed::new();

        loop {
            let is_running = {
                let s = self.state.lock().unwrap();
                s.running
            };

            if is_running {
                let snapshots = feed.next_snapshots();
                let now_ms = chrono::Utc::now().timestamp_millis();

                let (enabled_strats, current_params, min_edge_enter, min_edge_exit, pos_size) = {
                    let s = self.state.lock().unwrap();
                    let enabled: Vec<String> = s
                        .strategies
                        .values()
                        .filter(|info| info.enabled)
                        .map(|info| info.id.clone())
                        .collect();
                    let params_map = s.params.clone();
                    let enter = *s.params.get("min_edge_enter").unwrap_or(&0.08);
                    let exit = *s.params.get("min_edge_exit").unwrap_or(&0.02);
                    let psize = *s.params.get("position_size").unwrap_or(&10.0) as i64;
                    (enabled, params_map, enter, exit, psize)
                };

                for snapshot in &snapshots {
                    for strat_id in &enabled_strats {
                        {
                            let mut sim = self.simulator.lock().unwrap();
                            sim.update_mark(strat_id, snapshot);
                        }

                        let actions = self.py_bridge.evaluate(
                            strat_id,
                            snapshot,
                            &current_params,
                            min_edge_enter,
                            min_edge_exit,
                            pos_size,
                        );

                        if !actions.is_empty() {
                            let mut sim = self.simulator.lock().unwrap();
                            let fills = sim.simulate_actions(strat_id, actions.as_slice(), snapshot);

                            for fill in fills {
                                let _ = self.event_tx.send(EngineEvent::Trade { trade: fill.clone() });
                                if let Some(pos) = sim.get_position(strat_id, &snapshot.kalshi_ticker) {
                                    let _ = self.event_tx.send(EngineEvent::PositionUpdate {
                                        strategy_id: strat_id.clone(),
                                        position: pos,
                                    });
                                }
                            }
                        }
                    }
                }

                // Collect strategy IDs and calculate global and per-strategy PnL
                let (registered_strats, total_pnl) = {
                    let sim = self.simulator.lock().unwrap();
                    let eng = self.state.lock().unwrap();
                    let ids: Vec<String> = eng.strategies.keys().cloned().collect();
                    let total = sim.get_total_pnl(None);
                    (ids, total)
                };

                // Emit Global PnL update
                let _ = self.event_tx.send(EngineEvent::PnlUpdate {
                    timestamp: now_ms,
                    pnl: total_pnl,
                    strategy_id: None,
                });

                // Emit Per-Strategy PnL updates
                {
                    let sim = self.simulator.lock().unwrap();
                    for strat_id in registered_strats {
                        let strat_pnl = sim.get_total_pnl(Some(&strat_id));
                        let _ = self.event_tx.send(EngineEvent::PnlUpdate {
                            timestamp: now_ms,
                            pnl: strat_pnl,
                            strategy_id: Some(strat_id),
                        });
                    }
                }

                // Publish system metrics
                let _ = self.event_tx.send(EngineEvent::Metrics {
                    cpu: 1.2,
                    mem_gb: Some(0.18),
                    timestamp: now_ms,
                });
            }

            sleep(Duration::from_millis(1500)).await;
        }
    }
}
