use sqlx::SqlitePool;
use crate::models::profile::{CreateProfile, RenameProfile, CopyProfile};
use crate::models::host::{CreateHost, UpdateHost};
use crate::models::sync_history::SyncHistory;
use crate::services::{profile_service, host_service, sync_service, sync_history_service};
use crate::models::profile::Profile;
use crate::models::host::Host;

#[tauri::command]
pub async fn create_profile(pool: tauri::State<'_, SqlitePool>, input: CreateProfile) -> Result<Profile, String> {
    profile_service::create(&pool, input).await
}

#[tauri::command]
pub async fn list_profiles(pool: tauri::State<'_, SqlitePool>) -> Result<Vec<Profile>, String> {
    profile_service::list(&pool).await
}

#[tauri::command]
pub async fn get_profile(pool: tauri::State<'_, SqlitePool>, id: String) -> Result<Profile, String> {
    profile_service::get_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn rename_profile(pool: tauri::State<'_, SqlitePool>, id: String, new_name: String) -> Result<Profile, String> {
    profile_service::rename(&pool, &id, &new_name).await
}

#[tauri::command]
pub async fn copy_profile(pool: tauri::State<'_, SqlitePool>, id: String) -> Result<Profile, String> {
    profile_service::duplicate(&pool, &id).await
}

#[tauri::command]
pub async fn delete_profile(pool: tauri::State<'_, SqlitePool>, id: String) -> Result<(), String> {
    profile_service::delete(&pool, &id).await
}

#[tauri::command]
pub async fn set_active_profile(pool: tauri::State<'_, SqlitePool>, id: String) -> Result<Profile, String> {
    profile_service::set_active(&pool, &id).await
}

#[tauri::command]
pub async fn get_active_profile(pool: tauri::State<'_, SqlitePool>) -> Result<Option<Profile>, String> {
    profile_service::get_active(&pool).await
}

#[tauri::command]
pub async fn update_profile_settings(pool: tauri::State<'_, SqlitePool>, id: String, settings_json: String) -> Result<Profile, String> {
    profile_service::update_settings(&pool, &id, &settings_json).await
}

#[tauri::command]
pub async fn create_host(pool: tauri::State<'_, SqlitePool>, input: CreateHost) -> Result<Host, String> {
    host_service::create(&pool, input).await
}

#[tauri::command]
pub async fn list_hosts(pool: tauri::State<'_, SqlitePool>) -> Result<Vec<Host>, String> {
    host_service::list(&pool).await
}

#[tauri::command]
pub async fn update_host(pool: tauri::State<'_, SqlitePool>, input: UpdateHost) -> Result<Host, String> {
    host_service::update(&pool, input).await
}

#[tauri::command]
pub async fn delete_host(pool: tauri::State<'_, SqlitePool>, id: String) -> Result<(), String> {
    host_service::delete(&pool, &id).await
}

#[tauri::command]
pub async fn test_host_connection(address: String, port: i32, username: String, password: Option<String>, key_path: Option<String>) -> Result<(), String> {
    sync_service::test_connection(&address, port, &username, password.as_deref(), key_path.as_deref())
}

#[tauri::command]
pub async fn test_saved_host(pool: tauri::State<'_, SqlitePool>, host_id: String) -> Result<(), String> {
    let host = host_service::get_by_id(&pool, &host_id).await?;
    let password = host_service::get_password(&pool, &host_id).await.map_err(|e| {
        if e.contains("Decryption failed") {
            "ERROR:DECRYPT_FAILED".to_string()
        } else {
            e
        }
    })?;
    sync_service::test_connection(&host.address, host.port, &host.username, password.as_deref(), host.key_path.as_deref())
}

#[tauri::command]
pub async fn sync_to_host(pool: tauri::State<'_, SqlitePool>, profile_id: String, host_id: String) -> Result<crate::models::sync_history::SyncResult, String> {
    Ok(sync_service::sync_to_host(&pool, &profile_id, &host_id).await)
}

#[tauri::command]
pub async fn sync_to_hosts(pool: tauri::State<'_, SqlitePool>, profile_id: String, host_ids: Vec<String>) -> Result<Vec<crate::models::sync_history::SyncResult>, String> {
    Ok(sync_service::sync_to_hosts(&pool, &profile_id, &host_ids).await)
}

#[tauri::command]
pub async fn list_sync_history(pool: tauri::State<'_, SqlitePool>, profile_id: Option<String>, host_id: Option<String>) -> Result<Vec<SyncHistory>, String> {
    match (profile_id, host_id) {
        (Some(pid), _) => sync_history_service::list_by_profile(&pool, &pid).await,
        (None, Some(hid)) => sync_history_service::list_by_host(&pool, &hid).await,
        _ => sync_history_service::list_all(&pool).await,
    }
}

#[tauri::command]
pub async fn open_github(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url("https://github.com/dmz2922990/LLM-Switch", None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_tray_labels(
    app: tauri::AppHandle,
    tray_state: tauri::State<'_, crate::tray::TrayState>,
    open_window: String,
    about: String,
    quit: String,
) -> Result<(), String> {
    let labels = crate::tray::TrayLabels { open_window, about, quit };
    tray_state.update_labels(&app, labels).await;
    Ok(())
}
