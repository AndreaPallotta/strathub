use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktestPoint {
    pub t: i64,
    pub pnl: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrawdownPoint {
    pub t: i64,
    pub drawdown_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeDistributionPoint {
    pub trade_num: i64,
    pub pnl: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BacktestRecord {
    pub id: String,
    pub strategy_id: String,
    pub status: String,
    pub started_at: i64,
    pub finished_at: i64,
    pub total_pnl: f64,
    pub win_rate: f64,
    pub total_trades: i64,
    pub max_drawdown: f64,
    pub sharpe_ratio: f64,
    pub lookback_days: i64,
    pub pnl_series: Vec<BacktestPoint>,
    pub drawdown_series: Vec<DrawdownPoint>,
    pub trade_distribution: Vec<TradeDistributionPoint>,
}

pub struct BacktestStorage;

#[allow(dead_code)]
impl BacktestStorage {
    /// Always save backtests outside src-tauri to prevent Tauri dev watcher from triggering app restarts
    pub fn get_backtests_dir() -> PathBuf {
        if Path::new("../data").exists() {
            PathBuf::from("../data/backtests")
        } else {
            PathBuf::from("data/backtests")
        }
    }

    pub fn save<P: AsRef<Path>>(record: &BacktestRecord, path: P) -> Result<(usize, usize), String> {
        let raw_bytes = bincode::serialize(record).map_err(|e| e.to_string())?;
        let uncompressed_len = raw_bytes.len();

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(&raw_bytes).map_err(|e| e.to_string())?;
        let compressed_bytes = encoder.finish().map_err(|e| e.to_string())?;
        let compressed_len = compressed_bytes.len();

        if let Some(parent) = path.as_ref().parent() {
            let _ = fs::create_dir_all(parent);
        }

        let mut file = File::create(path).map_err(|e| e.to_string())?;
        file.write_all(&compressed_bytes).map_err(|e| e.to_string())?;

        Ok((uncompressed_len, compressed_len))
    }

    pub fn load<P: AsRef<Path>>(path: P) -> Result<BacktestRecord, String> {
        let file = File::open(path).map_err(|e| e.to_string())?;
        let mut decoder = GzDecoder::new(file);
        let mut raw_bytes = Vec::new();
        decoder.read_to_end(&mut raw_bytes).map_err(|e| e.to_string())?;

        let record: BacktestRecord = bincode::deserialize(&raw_bytes).map_err(|e| e.to_string())?;
        Ok(record)
    }

    pub fn list_all<P: AsRef<Path>>(dir: P) -> Vec<(PathBuf, usize, usize)> {
        let mut results = Vec::new();
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "gz") {
                    if let Ok(meta) = entry.metadata() {
                        let comp_len = meta.len() as usize;
                        if let Ok(rec) = Self::load(&path) {
                            let uncomp_len = bincode::serialized_size(&rec).unwrap_or(0) as usize;
                            results.push((path, uncomp_len, comp_len));
                        }
                    }
                }
            }
        }
        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compressed_binary_backtest_storage() {
        let rec = BacktestRecord {
            id: "bt_test_123".to_string(),
            strategy_id: "stat_arb".to_string(),
            status: "done".to_string(),
            started_at: 1000,
            finished_at: 2000,
            total_pnl: 142.50,
            win_rate: 0.68,
            total_trades: 24,
            max_drawdown: -0.045,
            sharpe_ratio: 2.14,
            lookback_days: 7,
            pnl_series: vec![
                BacktestPoint { t: 1000, pnl: 0.0 },
                BacktestPoint { t: 2000, pnl: 142.50 },
            ],
            drawdown_series: vec![
                DrawdownPoint { t: 1000, drawdown_pct: 0.0 },
                DrawdownPoint { t: 2000, drawdown_pct: -0.045 },
            ],
            trade_distribution: vec![
                TradeDistributionPoint { trade_num: 1, pnl: 12.5 },
                TradeDistributionPoint { trade_num: 2, pnl: -5.0 },
            ],
        };

        let temp_dir = BacktestStorage::get_backtests_dir();
        let temp_path = temp_dir.join("test_storage.bin.gz");
        let (uncomp, comp) = BacktestStorage::save(&rec, &temp_path).unwrap();
        assert!(comp < uncomp);

        let loaded = BacktestStorage::load(&temp_path).unwrap();
        assert_eq!(loaded.id, "bt_test_123");
        assert_eq!(loaded.total_pnl, 142.50);

        let _ = fs::remove_file(temp_path);
    }
}
