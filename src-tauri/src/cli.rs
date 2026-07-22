mod engine;

use engine::storage::{BacktestRecord, BacktestStorage};
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        print_usage();
        return;
    }

    let command = args[1].as_str();
    match command {
        "inspect" => {
            if args.len() < 3 {
                println!("Error: Missing backtest file path.");
                println!("Usage: strathub-cli inspect <path/to/backtest.bin.gz>");
                return;
            }
            let file_path = &args[2];
            match BacktestStorage::load(file_path) {
                Ok(rec) => print_inspection_report(&rec, file_path),
                Err(err) => println!("Error loading binary backtest: {}", err),
            }
        }
        "list" => {
            let dir = if args.len() >= 3 { &args[2] } else { "data/backtests" };
            println!("Scanning backtest storage directory: {}\n", dir);
            let items = BacktestStorage::list_all(dir);

            if items.is_empty() {
                println!("No compressed backtest files found in {}", dir);
                return;
            }

            println!("{:<45} {:<15} {:<15} {:<10}", "FILE", "UNCOMPRESSED", "COMPRESSED", "RATIO");
            println!("{:-<90}", "");

            for (path, uncomp, comp) in items {
                let fname = path.file_name().unwrap_or_default().to_string_lossy();
                let ratio = if uncomp > 0 {
                    (1.0 - (comp as f64 / uncomp as f64)) * 100.0
                } else {
                    0.0
                };
                println!(
                    "{:<45} {:<15} {:<15} {:.1}%",
                    fname,
                    format_bytes(uncomp),
                    format_bytes(comp),
                    ratio
                );
            }
        }
        "export" => {
            if args.len() < 3 {
                println!("Error: Missing backtest file path.");
                return;
            }
            let file_path = &args[2];
            match BacktestStorage::load(file_path) {
                Ok(rec) => {
                    if let Ok(json_str) = serde_json::to_string_pretty(&rec) {
                        println!("{}", json_str);
                    }
                }
                Err(err) => println!("Error loading backtest: {}", err),
            }
        }
        _ => print_usage(),
    }
}

fn print_usage() {
    println!("StratHub 2.0 CLI Backtest Analyzer Tool");
    println!("=========================================");
    println!("Usage:");
    println!("  strathub-cli inspect <file.bin.gz>    Inspect performance metrics of a compressed backtest");
    println!("  strathub-cli list [dir]               List all compressed backtest files and compression stats");
    println!("  strathub-cli export <file.bin.gz>     Export compressed backtest to JSON format");
}

fn print_inspection_report(rec: &BacktestRecord, path: &str) {
    println!("\n=========================================");
    println!(" STRATHUB BACKTEST INSPECTOR REPORT");
    println!("=========================================");
    println!("File Path:      {}", path);
    println!("Backtest ID:    {}", rec.id);
    println!("Strategy ID:    {}", rec.strategy_id);
    println!("Status:         {}", rec.status);
    println!("Lookback Days:  {} days", rec.lookback_days);
    println!("-----------------------------------------");
    println!("Total Net PnL:  ${:.2}", rec.total_pnl);
    println!("Win Rate:       {:.1}%", rec.win_rate * 100.0);
    println!("Total Trades:   {}", rec.total_trades);
    println!("Sharpe Ratio:   {:.2}", rec.sharpe_ratio);
    println!("Max Drawdown:   {:.1}%", rec.max_drawdown * 100.0);
    println!("PnL Points:     {} tick trajectory entries", rec.pnl_series.len());
    println!("=========================================\n");
}

fn format_bytes(bytes: usize) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}
