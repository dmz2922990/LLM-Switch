use crate::models::sync_history::SyncHistory;
use sqlx::SqlitePool;

pub async fn record(
    pool: &SqlitePool,
    profile_id: &str,
    host_id: &str,
    status: &str,
    error_message: Option<&str>,
    source_hash: Option<&str>,
    target_hash: Option<&str>,
) -> Result<SyncHistory, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query_as::<_, SyncHistory>(
        "INSERT INTO sync_history (id, profile_id, host_id, synced_at, status, error_message, source_hash, target_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"
    )
    .bind(&id).bind(profile_id).bind(host_id).bind(&now).bind(status).bind(error_message)
    .bind(source_hash).bind(target_hash)
    .fetch_one(pool).await.map_err(|e| format!("Failed to record sync history: {}", e))
}

pub async fn list_by_profile(
    pool: &SqlitePool,
    profile_id: &str,
) -> Result<Vec<SyncHistory>, String> {
    sqlx::query_as::<_, SyncHistory>(
        "SELECT * FROM sync_history WHERE profile_id = ? ORDER BY synced_at DESC",
    )
    .bind(profile_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to list sync history: {}", e))
}

pub async fn list_all(pool: &SqlitePool) -> Result<Vec<SyncHistory>, String> {
    sqlx::query_as::<_, SyncHistory>("SELECT * FROM sync_history ORDER BY synced_at DESC")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to list sync history: {}", e))
}

pub async fn list_by_host(pool: &SqlitePool, host_id: &str) -> Result<Vec<SyncHistory>, String> {
    sqlx::query_as::<_, SyncHistory>(
        "SELECT * FROM sync_history WHERE host_id = ? ORDER BY synced_at DESC",
    )
    .bind(host_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Failed to list sync history: {}", e))
}
