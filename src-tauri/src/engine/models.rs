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
    pub side: Option<String>, // "BUY" or "SELL"
    pub size: Option<i64>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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
#[serde(tag = "type")]
pub enum EngineEvent {
    #[serde(rename = "pnl_update")]
    PnlUpdate {
        timestamp: i64,
        pnl: f64,
        strategy_id: Option<String>,
    },
    #[serde(rename = "strategy_snapshot")]
    StrategySnapshot { strategies: Vec<StrategyInfo> },
    #[serde(rename = "strategy_status")]
    StrategyStatus {
        strategy_id: String,
        enabled: bool,
        name: String,
    },
    #[serde(rename = "position_update")]
    PositionUpdate {
        strategy_id: String,
        position: Position,
    },
    #[serde(rename = "trade")]
    Trade { trade: SimulatedFill },
    #[serde(rename = "log")]
    Log { level: String, message: String },
    #[serde(rename = "metrics")]
    Metrics {
        cpu: f64,
        mem_gb: Option<f64>,
        timestamp: i64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FeedMode {
    SyntheticMock,
    FileReplayer,
    LiveApi,
}
