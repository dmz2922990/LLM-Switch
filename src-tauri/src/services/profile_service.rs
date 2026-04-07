use crate::models::profile::{CreateProfile, Profile};
use sqlx::SqlitePool;

pub async fn create(pool: &SqlitePool, input: CreateProfile) -> Result<Profile, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let settings = input.settings_json.unwrap_or_else(|| "{}".to_string());
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query_as::<_, Profile>(
        "INSERT INTO profiles (id, name, settings_json, is_active, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?) RETURNING *"
    )
    .bind(&id).bind(&input.name).bind(&settings).bind(&now).bind(&now)
    .fetch_one(pool).await.map_err(|e| format!("Failed to create profile: {}", e))
}

pub async fn list(pool: &SqlitePool) -> Result<Vec<Profile>, String> {
    let _ = sync_active_from_file(pool).await;
    sqlx::query_as::<_, Profile>("SELECT * FROM profiles ORDER BY created_at ASC")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Failed to list profiles: {}", e))
}

pub async fn sync_active_from_file(pool: &SqlitePool) -> bool {
    let active = match get_active(pool).await {
        Ok(Some(p)) => p,
        _ => return false,
    };
    let file_content = match read_current_settings_json() {
        Some(c) => c,
        None => return false,
    };
    if file_content == active.settings_json {
        return false;
    }
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("UPDATE profiles SET settings_json = ?, updated_at = ? WHERE id = ?")
        .bind(&file_content)
        .bind(&now)
        .bind(&active.id)
        .execute(pool)
        .await
        .is_ok()
}

pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Profile, String> {
    sqlx::query_as::<_, Profile>("SELECT * FROM profiles WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Failed to get profile: {}", e))?
        .ok_or_else(|| "Profile not found".to_string())
}

pub async fn rename(pool: &SqlitePool, id: &str, new_name: &str) -> Result<Profile, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let duplicate =
        sqlx::query_as::<_, Profile>("SELECT * FROM profiles WHERE name = ? AND id != ?")
            .bind(new_name)
            .bind(id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("Database error: {}", e))?;
    if duplicate.is_some() {
        return Err("Profile name already exists".to_string());
    }
    sqlx::query_as::<_, Profile>(
        "UPDATE profiles SET name = ?, updated_at = ? WHERE id = ? RETURNING *",
    )
    .bind(new_name)
    .bind(&now)
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to rename profile: {}", e))
}

pub async fn duplicate(pool: &SqlitePool, id: &str) -> Result<Profile, String> {
    let source = get_by_id(pool, id).await?;
    let mut copy_name = format!("{} (副本)", source.name);
    let mut counter = 2;
    loop {
        let exists = sqlx::query_as::<_, Profile>("SELECT * FROM profiles WHERE name = ?")
            .bind(&copy_name)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("Database error: {}", e))?;
        if exists.is_none() {
            break;
        }
        copy_name = format!("{} (副本 {})", source.name, counter);
        counter += 1;
    }
    create(
        pool,
        CreateProfile {
            name: copy_name,
            settings_json: Some(source.settings_json),
        },
    )
    .await
}

pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), String> {
    let profile = get_by_id(pool, id).await?;
    sqlx::query("DELETE FROM profiles WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to delete profile: {}", e))?;
    if profile.is_active {
        let settings_path = get_claude_settings_path()?;
        let _ = std::fs::remove_file(&settings_path);
    }
    Ok(())
}

pub async fn set_active(pool: &SqlitePool, id: &str) -> Result<Profile, String> {
    let profile = get_by_id(pool, id).await?;
    let previous_json = read_current_settings_json();
    sqlx::query("UPDATE profiles SET is_active = 0")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to deactivate profiles: {}", e))?;
    let now = chrono::Utc::now().to_rfc3339();
    let updated = sqlx::query_as::<_, Profile>(
        "UPDATE profiles SET is_active = 1, updated_at = ? WHERE id = ? RETURNING *",
    )
    .bind(&now)
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to activate profile: {}", e))?;
    if let Err(e) = write_settings_json(&updated.settings_json) {
        rollback_active(pool, &previous_json).await?;
        return Err(format!("Failed to write settings.json: {}", e));
    }
    Ok(updated)
}

pub async fn get_active(pool: &SqlitePool) -> Result<Option<Profile>, String> {
    sqlx::query_as::<_, Profile>("SELECT * FROM profiles WHERE is_active = 1")
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

pub async fn update_settings(
    pool: &SqlitePool,
    id: &str,
    settings_json: &str,
) -> Result<Profile, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let profile = sqlx::query_as::<_, Profile>(
        "UPDATE profiles SET settings_json = ?, updated_at = ? WHERE id = ? RETURNING *",
    )
    .bind(settings_json)
    .bind(&now)
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to update settings: {}", e))?;
    if profile.is_active {
        write_settings_json(&profile.settings_json)
            .map_err(|e| format!("Failed to sync to settings.json: {}", e))?;
    }
    Ok(profile)
}

fn get_claude_settings_path() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    Ok(home.join(".claude").join("settings.json"))
}

pub async fn ensure_default_profile(pool: &SqlitePool) -> Result<(), String> {
    let profiles = list(pool).await?;
    if !profiles.is_empty() {
        return Ok(());
    }
    let settings_json = read_current_settings_json();
    let input = CreateProfile {
        name: "Local".to_string(),
        settings_json,
    };
    let profile = create(pool, input).await?;
    set_active(pool, &profile.id).await?;
    Ok(())
}

fn read_current_settings_json() -> Option<String> {
    let path = get_claude_settings_path().ok()?;
    std::fs::read_to_string(path).ok()
}

fn write_settings_json(content: &str) -> Result<(), String> {
    let path = get_claude_settings_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

async fn rollback_active(pool: &SqlitePool, _previous_json: &Option<String>) -> Result<(), String> {
    sqlx::query("UPDATE profiles SET is_active = 0")
        .execute(pool)
        .await
        .map_err(|e| format!("Rollback failed: {}", e))?;
    Ok(())
}
