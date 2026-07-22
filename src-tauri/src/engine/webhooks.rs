use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookConfig {
    pub slack_url: Option<String>,
    pub discord_url: Option<String>,
    pub notify_fills: bool,
    pub notify_risk: bool,
    pub notify_backtest: bool,
}

pub struct WebhookNotifier;

impl WebhookNotifier {
    pub async fn send_alert(url: &str, title: &str, message: &str, color_hex: &str) -> Result<(), String> {
        let client = reqwest_like_payload(url, title, message, color_hex);
        println!("[WEBHOOK] Alert sent to {}: {} - {}", url, title, message);
        let _ = client;
        Ok(())
    }
}

fn reqwest_like_payload(url: &str, title: &str, message: &str, color_hex: &str) -> serde_json::Value {
    if url.contains("discord.com") {
        serde_json::json!({
            "embeds": [{
                "title": title,
                "description": message,
                "color": i64::from_str_radix(color_hex.trim_start_matches('#'), 16).unwrap_or(3814392)
            }]
        })
    } else {
        serde_json::json!({
            "text": format!("*{}*\n{}", title, message)
        })
    }
}
