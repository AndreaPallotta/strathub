#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSnapshot {
    pub snapshot_id: String,
    pub kalshi_ticker: String,
    pub sport_key: String,
    pub event_id: String,
    pub kalshi_yes_bid: Option<f64>,
    pub kalshi_yes_ask: Option<f64>,
    pub kalshi_yes_mid: Option<f64>,
    pub ref_implied_yes: Option<f64>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyAction {
    pub action_type: String,
    pub kalshi_ticker: String,
    pub side: Option<String>,
    pub size: Option<i64>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub instrument: String,
    pub strategy_id: String,
    pub size: i64,
    pub avg_price: f64,
    pub realized_pnl: f64,
    pub mark: f64,
    pub unrealized_pnl: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulatedFill {
    pub strategy_id: String,
    pub kalshi_ticker: String,
    pub action_type: String,
    pub side: String,
    pub size: i64,
    pub price: f64,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyInfo {
    pub id: String,
    pub name: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EngineEvent {
    PnlUpdate {
        timestamp: i64,
        pnl: f64,
        strategy_id: Option<String>,
    },
    StrategySnapshot {
        strategies: Vec<StrategyInfo>,
    },
    StrategyStatus {
        strategy_id: String,
        enabled: bool,
        name: Option<String>,
    },
    PositionUpdate {
        strategy_id: String,
        position: Position,
    },
    Trade {
        trade: SimulatedFill,
    },
    Log {
        level: String,
        message: String,
    },
    Metrics {
        cpu: f64,
        mem_gb: Option<f64>,
        timestamp: i64,
    },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum FeedMode {
    SyntheticMock,
    ReplayerFile,
}
