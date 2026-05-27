use crate::models::usage::{QuotaInfo, UsageInfo};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

#[derive(Debug)]
pub struct ProviderError(pub String);

impl std::fmt::Display for ProviderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

// --- Provider keyword matching ---

const PROVIDERS: &[(&str, &str)] = &[
    ("bigmodel.cn", "ZhiPu"),
    ("kimi.com", "Kimi"),
    ("moonshot.cn", "Kimi"),
];

fn match_provider(url: &str) -> Option<(&'static str, &'static str)> {
    PROVIDERS
        .iter()
        .find(|(keyword, _)| url.contains(keyword))
        .map(|&(k, n)| (k, n))
}

// --- ZhiPu fetch ---

async fn fetch_zhipu_usage(token: &str) -> Result<UsageInfo, ProviderError> {
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| ProviderError(e.to_string()))?;

    let resp: Value = client
        .get("https://open.bigmodel.cn/api/monitor/usage/quota/limit")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| ProviderError(format!("request failed: {}", e)))?
        .json()
        .await
        .map_err(|e| ProviderError(format!("decode failed: {}", e)))?;

    let limits = resp
        .get("data")
        .and_then(|d| d.get("limits"))
        .and_then(|l| l.as_array())
        .cloned()
        .unwrap_or_default();

    let target_units = [(3i64, "5h"), (6i64, "Weekly")];
    let mut quotas = Vec::new();

    for limit in &limits {
        let limit_type = limit.get("type").and_then(|v| v.as_str()).unwrap_or("");
        if limit_type != "TOKENS_LIMIT" {
            continue;
        }
        let unit = limit.get("unit").and_then(|v| v.as_i64()).unwrap_or(-1);
        if let Some((_, label)) = target_units.iter().find(|(u, _)| *u == unit) {
            quotas.push(QuotaInfo {
                label: label.to_string(),
                percentage: limit.get("percentage").and_then(|v| v.as_f64()).unwrap_or(0.0),
                next_reset_time: limit.get("nextResetTime").and_then(|v| v.as_i64()).unwrap_or(0),
                remaining: None,
            });
        }
    }

    Ok(UsageInfo {
        provider_name: "ZhiPu".to_string(),
        quotas,
    })
}

// --- Kimi fetch ---

fn parse_iso_to_ms(iso: &str) -> i64 {
    chrono::DateTime::parse_from_rfc3339(iso)
        .map(|dt| dt.timestamp_millis())
        .unwrap_or(0)
}

async fn fetch_kimi_usage(token: &str) -> Result<UsageInfo, ProviderError> {
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| ProviderError(e.to_string()))?;

    let resp: Value = client
        .get("https://api.kimi.com/coding/v1/usages")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| ProviderError(format!("request failed: {}", e)))?
        .json()
        .await
        .map_err(|e| ProviderError(format!("decode failed: {}", e)))?;

    let mut quotas = Vec::new();

    if let Some(limits) = resp.get("limits").and_then(|v| v.as_array()) {
        if let Some(first) = limits.first() {
            let detail = first.get("detail");
            let limit: f64 = detail
                .and_then(|d| d.get("limit"))
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(1.0);
            let remaining: f64 = detail
                .and_then(|d| d.get("remaining"))
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse().ok())
                .unwrap_or(0.0);
            let reset_time = detail
                .and_then(|d| d.get("resetTime"))
                .and_then(|v| v.as_str())
                .map(parse_iso_to_ms)
                .unwrap_or(0);

            let used = limit - remaining;
            let pct = if limit > 0.0 { used / limit * 100.0 } else { 0.0 };

            quotas.push(QuotaInfo {
                label: "5h".to_string(),
                percentage: pct,
                next_reset_time: reset_time,
                remaining: Some(format!("{}/{}", used as i64, limit as i64)),
            });
        }
    }

    if let Some(usage) = resp.get("usage") {
        let limit: f64 = usage
            .get("limit")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(1.0);
        let remaining: f64 = usage
            .get("remaining")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse().ok())
            .unwrap_or(0.0);
        let reset_time = usage
            .get("resetTime")
            .and_then(|v| v.as_str())
            .map(parse_iso_to_ms)
            .unwrap_or(0);

        let used = limit - remaining;
        let pct = if limit > 0.0 { used / limit * 100.0 } else { 0.0 };

        quotas.push(QuotaInfo {
            label: "Weekly".to_string(),
            percentage: pct,
            next_reset_time: reset_time,
            remaining: Some(format!("{}/{}", used as i64, limit as i64)),
        });
    }

    Ok(UsageInfo {
        provider_name: "Kimi".to_string(),
        quotas,
    })
}

// --- Public API ---

pub async fn get_usage(base_url: &str, auth_token: &str) -> Result<Option<UsageInfo>, ProviderError> {
    let matched = match match_provider(base_url) {
        Some(m) => m,
        None => return Ok(None),
    };

    let usage = match matched.0 {
        "bigmodel.cn" => fetch_zhipu_usage(auth_token).await?,
        "kimi.com" | "moonshot.cn" => fetch_kimi_usage(auth_token).await?,
        _ => return Ok(None),
    };

    Ok(Some(usage))
}
