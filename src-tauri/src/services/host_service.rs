use crate::models::host::{CreateHost, Host, UpdateHost};
use crate::services::crypto;
use sqlx::SqlitePool;

pub async fn create(pool: &SqlitePool, input: CreateHost) -> Result<Host, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let port = input.port.unwrap_or(22);
    let auth_type = input.auth_type.unwrap_or_else(|| "password".to_string());
    let encrypted_password = match (auth_type.as_str(), &input.password) {
        ("password", Some(pwd)) => Some(crypto::encrypt(pwd)?),
        _ => None,
    };
    let remote_path = input
        .remote_path
        .unwrap_or_else(|| "~/.claude/settings.json".to_string());
    let now = chrono::Utc::now().to_rfc3339();
    let existing_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM hosts")
            .fetch_one(pool)
            .await
            .unwrap_or(0);
    let is_default = existing_count == 0;
    sqlx::query_as::<_, Host>(
        "INSERT INTO hosts (id, name, address, port, username, auth_type, encrypted_password, key_path, remote_path, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"
    )
    .bind(&id).bind(&input.name).bind(&input.address).bind(port).bind(&input.username)
    .bind(&auth_type).bind(&encrypted_password).bind(&input.key_path).bind(&remote_path)
    .bind(is_default).bind(&now).bind(&now)
    .fetch_one(pool).await.map_err(|e| format!("Failed to create host: {}", e))
}

pub async fn list(pool: &SqlitePool) -> Result<Vec<Host>, String> {
    sqlx::query_as::<_, Host>("SELECT * FROM hosts ORDER BY created_at ASC")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to list hosts: {}", e))
}

pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Host, String> {
    sqlx::query_as::<_, Host>("SELECT * FROM hosts WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or_else(|| "Host not found".to_string())
}

pub async fn update(pool: &SqlitePool, input: UpdateHost) -> Result<Host, String> {
    let mut host = get_by_id(pool, &input.id).await?;
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(name) = &input.name {
        host.name = name.clone();
    }
    if let Some(address) = &input.address {
        host.address = address.clone();
    }
    if let Some(port) = input.port {
        host.port = port;
    }
    if let Some(username) = &input.username {
        host.username = username.clone();
    }
    if let Some(password) = &input.password {
        host.encrypted_password = Some(crypto::encrypt(password)?);
    }
    if let Some(key_path) = &input.key_path {
        host.key_path = Some(key_path.clone());
    }
    if let Some(remote_path) = &input.remote_path {
        host.remote_path = remote_path.clone();
    }
    sqlx::query_as::<_, Host>(
        "UPDATE hosts SET name=?, address=?, port=?, username=?, encrypted_password=?, key_path=?, remote_path=?, updated_at=? WHERE id=? RETURNING *"
    )
    .bind(&host.name).bind(&host.address).bind(host.port).bind(&host.username)
    .bind(&host.encrypted_password).bind(&host.key_path).bind(&host.remote_path)
    .bind(&now).bind(&host.id)
    .fetch_one(pool).await.map_err(|e| format!("Failed to update host: {}", e))
}

pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), String> {
    let was_default = get_by_id(pool, id).await.map(|h| h.is_default).unwrap_or(false);
    sqlx::query("DELETE FROM sync_history WHERE host_id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete sync history: {}", e))?;
    sqlx::query("DELETE FROM hosts WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete host: {}", e))?;
    if was_default {
        if let Ok(first) = sqlx::query_as::<_, Host>("SELECT * FROM hosts ORDER BY created_at ASC LIMIT 1")
            .fetch_optional(pool)
            .await
        {
            if let Some(h) = first {
                let _ = set_default(pool, &h.id).await;
            }
        }
    }
    Ok(())
}

pub async fn set_default(pool: &SqlitePool, host_id: &str) -> Result<Host, String> {
    sqlx::query("UPDATE hosts SET is_default = 0")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to clear defaults: {}", e))?;
    sqlx::query_as::<_, Host>("UPDATE hosts SET is_default = 1 WHERE id = ? RETURNING *")
        .bind(host_id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Failed to set default host: {}", e))
}

pub async fn get_password(pool: &SqlitePool, id: &str) -> Result<Option<String>, String> {
    let host = get_by_id(pool, id).await?;
    match host.encrypted_password {
        Some(enc) => Ok(Some(crypto::decrypt(&enc)?)),
        None => Ok(None),
    }
}
