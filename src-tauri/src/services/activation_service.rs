use crate::models::activation_log::ActivationLog;
use crate::models::profile::Profile;
use reqwest::Client;
use serde_json::Value;
use sqlx::SqlitePool;
use std::time::Duration;

/// Extracts (base_url, token, model) from a profile's settings_json env block.
/// Falls back to Sonnet/Opus/Haiku model or a default if ANTHROPIC_MODEL is unset.
fn parse_env(settings_json: &str) -> Option<(String, String, String)> {
    let parsed: Value = serde_json::from_str(settings_json).ok()?;
    let env = parsed.get("env")?;
    let base_url = env.get("ANTHROPIC_BASE_URL")?.as_str()?.to_string();
    let token = env.get("ANTHROPIC_AUTH_TOKEN")?.as_str()?.to_string();
    if base_url.is_empty() || token.is_empty() {
        return None;
    }
    // Prefer ANTHROPIC_MODEL, then fall back to sonnet/opus/haiku defaults.
    let model = env
        .get("ANTHROPIC_MODEL")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .or_else(|| env.get("ANTHROPIC_DEFAULT_SONNET_MODEL").and_then(|v| v.as_str()).filter(|s| !s.is_empty()))
        .or_else(|| env.get("ANTHROPIC_DEFAULT_OPUS_MODEL").and_then(|v| v.as_str()).filter(|s| !s.is_empty()))
        .or_else(|| env.get("ANTHROPIC_DEFAULT_HAIKU_MODEL").and_then(|v| v.as_str()).filter(|s| !s.is_empty()))
        .unwrap_or("glm-4.6")
        .to_string();
    Some((base_url, token, model))
}

/// Sends a minimal "hi" message to the profile's endpoint to trigger quota window reset.
/// Returns Ok(http_status) on success, Err((message, http_status)) on failure.
pub async fn send_activation(profile: &Profile) -> Result<u16, (String, Option<i64>)> {
    let (base_url, token, model) = parse_env(&profile.settings_json).ok_or_else(|| {
        (
            "Missing ANTHROPIC_BASE_URL/AUTH_TOKEN/MODEL in env".to_string(),
            None,
        )
    })?;

    let url = format!("{}/v1/messages", base_url.trim_end_matches('/'));
    let body = serde_json::json!({
        "model": model,
        "max_tokens": 16,
        "messages": [{"role": "user", "content": "hi"}]
    });

    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| (e.to_string(), None))?;

    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("Content-Type", "application/json")
        .header("anthropic-version", "2023-06-01")
        .json(&body)
        .send()
        .await
        .map_err(|e| (format!("Request failed: {}", e), None))?;

    let status_code = resp.status().as_u16() as i64;

    if resp.status().is_success() {
        Ok(status_code as u16)
    } else {
        let status_text = resp.status().to_string();
        let body_text = resp.text().await.unwrap_or_default();
        let summary: String = body_text.chars().take(200).collect();
        Err((
            format!("HTTP {}: {} — {}", status_text, summary, ""),
            Some(status_code),
        ))
    }
}

/// Records an activation result to the activation_log table.
pub async fn record_log(
    pool: &SqlitePool,
    profile_id: &str,
    status: &str,
    error_message: Option<&str>,
    http_status: Option<i64>,
) -> Result<ActivationLog, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let log = sqlx::query_as::<_, ActivationLog>(
        "INSERT INTO activation_log (id, profile_id, activated_at, status, error_message, http_status) \
         VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
    )
    .bind(&id)
    .bind(profile_id)
    .bind(&now)
    .bind(status)
    .bind(error_message)
    .bind(http_status)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to record activation log: {}", e))?;
    trim_log(pool, 50).await.ok();
    Ok(log)
}

async fn trim_log(pool: &SqlitePool, max_records: usize) -> Result<(), String> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM activation_log")
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to count activation log: {}", e))?;
    if count as usize > max_records {
        let excess = count - max_records as i64;
        sqlx::query(
            "DELETE FROM activation_log WHERE id IN (SELECT id FROM activation_log ORDER BY activated_at ASC LIMIT ?)",
        )
        .bind(excess)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to trim activation log: {}", e))?;
    }
    Ok(())
}

/// Lists activation logs, optionally filtered by profile_id.
pub async fn list_log(
    pool: &SqlitePool,
    profile_id: Option<&str>,
) -> Result<Vec<ActivationLog>, String> {
    match profile_id {
        Some(pid) => {
            sqlx::query_as::<_, ActivationLog>(
                "SELECT * FROM activation_log WHERE profile_id = ? ORDER BY activated_at DESC",
            )
            .bind(pid)
            .fetch_all(pool)
            .await
        }
        None => {
            sqlx::query_as::<_, ActivationLog>(
                "SELECT * FROM activation_log ORDER BY activated_at DESC LIMIT 50",
            )
            .fetch_all(pool)
            .await
        }
    }
    .map_err(|e| format!("Failed to list activation log: {}", e))
}
