use crate::models::reminder::ReminderConfig;
use sqlx::SqlitePool;

pub async fn list_configs(pool: &SqlitePool) -> Result<Vec<ReminderConfig>, String> {
    sqlx::query_as::<_, ReminderConfig>("SELECT * FROM reminder_config ORDER BY vendor_name ASC")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to list reminder configs: {}", e))
}

#[allow(clippy::too_many_arguments)]
pub async fn update_config(
    pool: &SqlitePool,
    id: &str,
    enabled: bool,
    time1_start: Option<&str>,
    time1_end: Option<&str>,
    time2_start: Option<&str>,
    time2_end: Option<&str>,
    days_of_week: &str,
    auto_close: bool,
    auto_close_seconds: i64,
) -> Result<ReminderConfig, String> {
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query_as::<_, ReminderConfig>(
        "UPDATE reminder_config SET enabled = ?, time1_start = ?, time1_end = ?, time2_start = ?, time2_end = ?, days_of_week = ?, auto_close = ?, auto_close_seconds = ?, updated_at = ? WHERE id = ? RETURNING *",
    )
    .bind(enabled)
    .bind(time1_start)
    .bind(time1_end)
    .bind(time2_start)
    .bind(time2_end)
    .bind(days_of_week)
    .bind(auto_close)
    .bind(auto_close_seconds)
    .bind(&now)
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to update reminder config: {}", e))
}