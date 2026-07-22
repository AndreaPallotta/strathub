#![allow(dead_code)]

use super::models::MarketSnapshot;
use rand::Rng;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

pub trait DataFeed: Send + Sync {
    fn next_snapshots(&mut self) -> Vec<MarketSnapshot>;
}

pub struct MockSyntheticFeed {
    markets: Vec<MockMarketState>,
    counter: u64,
}

pub struct MockMarketState {
    pub ticker: String,
    pub sport_key: String,
    pub event_id: String,
    pub current_prob: f64,
    pub spread: f64,
}

impl MockSyntheticFeed {
    pub fn new() -> Self {
        let markets = vec![
            MockMarketState {
                ticker: "KXNFL-2026-CHIEFS-WIN".to_string(),
                sport_key: "americanfootball_nfl".to_string(),
                event_id: "evt_nfl_chiefs".to_string(),
                current_prob: 0.58,
                spread: 0.02,
            },
            MockMarketState {
                ticker: "KXPOL-2026-FED-CUT".to_string(),
                sport_key: "macro_economics".to_string(),
                event_id: "evt_fed_cut".to_string(),
                current_prob: 0.42,
                spread: 0.03,
            },
            MockMarketState {
                ticker: "KXEST-2026-SP500-HIGHER".to_string(),
                sport_key: "financial_markets".to_string(),
                event_id: "evt_sp500".to_string(),
                current_prob: 0.65,
                spread: 0.01,
            },
            MockMarketState {
                ticker: "KXNBA-2026-CELTICS-WIN".to_string(),
                sport_key: "basketball_nba".to_string(),
                event_id: "evt_nba_celtics".to_string(),
                current_prob: 0.51,
                spread: 0.02,
            },
        ];

        Self {
            markets,
            counter: 0,
        }
    }
}

impl DataFeed for MockSyntheticFeed {
    fn next_snapshots(&mut self) -> Vec<MarketSnapshot> {
        let mut rng = rand::thread_rng();
        let now_ms = chrono::Utc::now().timestamp_millis();
        let mut snapshots = Vec::new();
        self.counter += 1;

        for m in &mut self.markets {
            let shift: f64 = rng.gen_range(-0.035..=0.035);
            m.current_prob = (m.current_prob + shift).clamp(0.10, 0.90);

            // Generate realistic arbitrage mispricing edge (+0.03 to +0.07)
            let arb_spike: f64 = if rng.gen_bool(0.35) { rng.gen_range(0.03..=0.07) } else { rng.gen_range(-0.02..=0.02) };
            let ref_implied = (m.current_prob + arb_spike).clamp(0.05, 0.95);

            let half_spread = m.spread * 0.5;
            let bid = (m.current_prob - half_spread).clamp(0.01, 0.98);
            let ask = (m.current_prob + half_spread).clamp(0.02, 0.99);
            let mid = 0.5 * (bid + ask);

            snapshots.push(MarketSnapshot {
                snapshot_id: format!("snap_{}_{}", m.ticker, self.counter),
                kalshi_ticker: m.ticker.clone(),
                sport_key: m.sport_key.clone(),
                event_id: m.event_id.clone(),
                kalshi_yes_bid: Some(bid),
                kalshi_yes_ask: Some(ask),
                kalshi_yes_mid: Some(mid),
                ref_implied_yes: Some(ref_implied),
                timestamp: now_ms,
            });
        }

        snapshots
    }
}

pub struct FileReplayerFeed {
    pub snapshots: Vec<MarketSnapshot>,
    pub cursor: usize,
}

impl FileReplayerFeed {
    pub fn new<P: AsRef<Path>>(path: P) -> std::io::Result<Self> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut snapshots = Vec::new();

        for (idx, line) in reader.lines().flatten().enumerate() {
            if idx == 0 && line.starts_with("timestamp") {
                continue; // Skip CSV header
            }

            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 5 {
                let ts: i64 = parts[0].parse().unwrap_or(0);
                let ticker = parts[1].to_string();
                let bid: f64 = parts[2].parse().unwrap_or(0.50);
                let ask: f64 = parts[3].parse().unwrap_or(0.52);
                let ref_implied: f64 = parts[4].parse().unwrap_or(0.55);
                let mid = 0.5 * (bid + ask);

                snapshots.push(MarketSnapshot {
                    snapshot_id: format!("hist_{}_{}", ticker, ts),
                    kalshi_ticker: ticker,
                    sport_key: "historical_replayer".to_string(),
                    event_id: "evt_replayer".to_string(),
                    kalshi_yes_bid: Some(bid),
                    kalshi_yes_ask: Some(ask),
                    kalshi_yes_mid: Some(mid),
                    ref_implied_yes: Some(ref_implied),
                    timestamp: ts,
                });
            } else if let Ok(snap) = serde_json::from_str::<MarketSnapshot>(&line) {
                snapshots.push(snap);
            }
        }

        Ok(Self { snapshots, cursor: 0 })
    }
}

impl DataFeed for FileReplayerFeed {
    fn next_snapshots(&mut self) -> Vec<MarketSnapshot> {
        if self.snapshots.is_empty() {
            return Vec::new();
        }

        if self.cursor >= self.snapshots.len() {
            self.cursor = 0; // Loop for continuous replay
        }

        let end = (self.cursor + 3).min(self.snapshots.len());
        let batch = self.snapshots[self.cursor..end].to_vec();
        self.cursor = end;
        batch
    }
}
