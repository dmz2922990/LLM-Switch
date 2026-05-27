use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuotaInfo {
    pub label: String,
    pub percentage: f64,
    pub next_reset_time: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remaining: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageInfo {
    pub provider_name: String,
    pub quotas: Vec<QuotaInfo>,
}
