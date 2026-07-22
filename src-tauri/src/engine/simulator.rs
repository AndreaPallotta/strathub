#![allow(dead_code)]

use super::models::{MarketSnapshot, Position, SimulatedFill, StrategyAction};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ExecutionSimulator {
    pub contract_per_trade: i64,
    pub max_exposure_usd: f64,
    pub slippage_buy: f64,
    pub slippage_sell: f64,
    positions: HashMap<(String, String), Position>,
    marks: HashMap<(String, String), f64>,
    exposures: HashMap<String, f64>,
}

impl ExecutionSimulator {
    pub fn new(contract_per_trade: i64, max_exposure_usd: f64, slippage_buy: f64, slippage_sell: f64) -> Self {
        Self {
            contract_per_trade,
            max_exposure_usd,
            slippage_buy,
            slippage_sell,
            positions: HashMap::new(),
            marks: HashMap::new(),
            exposures: HashMap::new(),
        }
    }

    pub fn update_mark(&mut self, strategy_id: &str, snapshot: &MarketSnapshot) {
        let key = (strategy_id.to_string(), snapshot.kalshi_ticker.clone());
        let mark = snapshot
            .kalshi_yes_mid
            .or_else(|| match (snapshot.kalshi_yes_bid, snapshot.kalshi_yes_ask) {
                (Some(b), Some(a)) => Some(0.5 * (b + a)),
                (Some(b), None) => Some(b),
                (None, Some(a)) => Some(a),
                _ => None,
            })
            .unwrap_or(0.50)
            .clamp(0.01, 0.99);

        self.marks.insert(key.clone(), mark);

        if let Some(pos) = self.positions.get_mut(&key) {
            if pos.size != 0 {
                pos.mark = mark;
                pos.unrealized_pnl = pos.size as f64 * (mark - pos.avg_price);
            }
        }
    }

    pub fn simulate_actions(
        &mut self,
        strategy_id: &str,
        actions: &[StrategyAction],
        snapshot: &MarketSnapshot,
    ) -> Vec<SimulatedFill> {
        let mut fills = Vec::new();

        for action in actions {
            if action.kalshi_ticker != snapshot.kalshi_ticker {
                continue;
            }

            let side = match action.side.as_deref() {
                Some("BUY") => "BUY",
                Some("SELL") => "SELL",
                _ => continue,
            };

            let req_size = action.size.unwrap_or(self.contract_per_trade);
            if req_size <= 0 {
                continue;
            }

            let key = (strategy_id.to_string(), snapshot.kalshi_ticker.clone());
            let pos = self.positions.entry(key.clone()).or_insert_with(|| Position {
                instrument: snapshot.kalshi_ticker.clone(),
                strategy_id: strategy_id.to_string(),
                size: 0,
                avg_price: 0.0,
                realized_pnl: 0.0,
                mark: snapshot.kalshi_yes_mid.unwrap_or(0.50),
                unrealized_pnl: 0.0,
            });

            let price = match side {
                "BUY" => {
                    let base = snapshot.kalshi_yes_ask.or(snapshot.kalshi_yes_mid);
                    match base {
                        Some(p) => (p + self.slippage_buy).clamp(0.01, 0.99),
                        None => continue,
                    }
                }
                "SELL" => {
                    let base = snapshot.kalshi_yes_bid.or(snapshot.kalshi_yes_mid);
                    match base {
                        Some(p) => (p - self.slippage_sell).clamp(0.01, 0.99),
                        None => continue,
                    }
                }
                _ => continue,
            };

            let mut fill_size = req_size;
            if side == "SELL" && fill_size > pos.size {
                fill_size = pos.size;
                if fill_size <= 0 {
                    continue;
                }
            }

            let exposure = *self.exposures.get(strategy_id).unwrap_or(&0.0);
            if side == "BUY" && self.max_exposure_usd > 0.0 {
                let notional = fill_size as f64 * price;
                if exposure + notional > self.max_exposure_usd {
                    continue;
                }
            }

            if side == "BUY" {
                let total_size = pos.size + fill_size;
                let new_notional = pos.size as f64 * pos.avg_price + fill_size as f64 * price;
                pos.size = total_size;
                pos.avg_price = if total_size > 0 { new_notional / total_size as f64 } else { 0.0 };
                self.exposures.insert(strategy_id.to_string(), exposure + fill_size as f64 * price);
            } else {
                let close_size = fill_size.min(pos.size);
                let realized = close_size as f64 * (price - pos.avg_price);
                pos.size -= close_size;
                pos.realized_pnl += realized;
                if pos.size == 0 {
                    pos.avg_price = 0.0;
                }
                let new_exposure = (exposure - fill_size as f64 * pos.avg_price).max(0.0);
                self.exposures.insert(strategy_id.to_string(), new_exposure);
            }

            let mark = snapshot.kalshi_yes_mid.unwrap_or(price);
            pos.mark = mark;
            pos.unrealized_pnl = pos.size as f64 * (mark - pos.avg_price);
            self.marks.insert(key, mark);

            fills.push(SimulatedFill {
                strategy_id: strategy_id.to_string(),
                kalshi_ticker: snapshot.kalshi_ticker.clone(),
                action_type: action.action_type.clone(),
                side: side.to_string(),
                size: fill_size,
                price,
                reason: action.reason.clone(),
            });
        }

        fills
    }

    pub fn get_position(&self, strategy_id: &str, ticker: &str) -> Option<Position> {
        let key = (strategy_id.to_string(), ticker.to_string());
        self.positions.get(&key).cloned()
    }

    pub fn get_all_positions(&self, strategy_id: &str) -> Vec<Position> {
        self.positions
            .iter()
            .filter(|((sid, _), _)| sid == strategy_id)
            .map(|(_, pos)| {
                let key = (pos.strategy_id.clone(), pos.instrument.clone());
                let mark = *self.marks.get(&key).unwrap_or(&pos.avg_price);
                let mut p = pos.clone();
                p.mark = mark;
                p.unrealized_pnl = p.size as f64 * (mark - p.avg_price);
                p
            })
            .collect()
    }

    pub fn get_total_pnl(&self, strategy_id: Option<&str>) -> f64 {
        let mut total = 0.0;
        for ((sid, _), pos) in &self.positions {
            if let Some(target) = strategy_id {
                if sid != target {
                    continue;
                }
            }
            let key = (sid.clone(), pos.instrument.clone());
            let mark = *self.marks.get(&key).unwrap_or(&pos.avg_price);
            let unrealized = pos.size as f64 * (mark - pos.avg_price);
            total += pos.realized_pnl + unrealized;
        }
        total
    }
}
