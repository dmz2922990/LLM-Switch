use crate::models::host::Host;
use crate::models::host::{CreateHost, UpdateHost};
use crate::models::profile::Profile;
use crate::models::profile::{CopyProfile, CreateProfile, RenameProfile};
use crate::models::sync_history::SyncHistory;
use crate::services::{activation_service, host_service, profile_service, reminder_service, sync_history_service, sync_service, usage_service};
use sqlx::SqlitePool;
use tauri::Manager;

/// Best-effort pool accessor. Returns a friendly error if the database pool
/// is not managed yet (async init may still be racing on slow Windows startup),
/// so commands degrade gracefully instead of panicking the app.
fn pool_from(app: &tauri::AppHandle) -> Result<SqlitePool, String> {
    app.try_state::<SqlitePool>()
        .map(|s| s.inner().clone())
        .ok_or("Database is not ready yet. Please retry in a moment.".to_string())
}

#[tauri::command]
pub async fn create_profile(
    app: tauri::AppHandle,
    input: CreateProfile,
) -> Result<Profile, String> {
    let pool = pool_from(&app)?;
    profile_service::create(&pool, input).await
}

#[tauri::command]
pub async fn list_profiles(app: tauri::AppHandle) -> Result<Vec<Profile>, String> {
    let pool = pool_from(&app)?;
    profile_service::list(&pool).await
}

#[tauri::command]
pub async fn get_profile(
    app: tauri::AppHandle,
    id: String,
) -> Result<Profile, String> {
    let pool = pool_from(&app)?;
    profile_service::get_by_id(&pool, &id).await
}

#[tauri::command]
pub async fn rename_profile(
    app: tauri::AppHandle,
    id: String,
    new_name: String,
) -> Result<Profile, String> {
    let pool = pool_from(&app)?;
    profile_service::rename(&pool, &id, &new_name).await
}

#[tauri::command]
pub async fn copy_profile(
    app: tauri::AppHandle,
    id: String,
) -> Result<Profile, String> {
    let pool = pool_from(&app)?;
    profile_service::duplicate(&pool, &id).await
}

#[tauri::command]
pub async fn delete_profile(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let pool = pool_from(&app)?;
    profile_service::delete(&pool, &id).await
}

#[tauri::command]
pub async fn set_active_profile(
    app: tauri::AppHandle,
    id: String,
) -> Result<Profile, String> {
    let pool = pool_from(&app)?;
    profile_service::set_active(&pool, &id).await
}

#[tauri::command]
pub async fn get_active_profile(app: tauri::AppHandle) -> Result<Option<Profile>, String> {
    let pool = pool_from(&app)?;
    profile_service::get_active(&pool).await
}

#[tauri::command]
pub async fn update_profile_settings(
    app: tauri::AppHandle,
    id: String,
    settings_json: String,
) -> Result<Profile, String> {
    let pool = pool_from(&app)?;
    profile_service::update_settings(&pool, &id, &settings_json).await
}

#[tauri::command]
pub async fn update_profile_sync_keys(
    app: tauri::AppHandle,
    id: String,
    sync_keys_json: String,
) -> Result<Profile, String> {
    let pool = pool_from(&app)?;
    profile_service::update_sync_keys(&pool, &id, &sync_keys_json).await
}

#[tauri::command]
pub async fn reorder_profiles(
    app: tauri::AppHandle,
    ordered_ids: Vec<String>,
) -> Result<(), String> {
    let pool = pool_from(&app)?;
    profile_service::reorder(&pool, &ordered_ids).await
}

#[tauri::command]
pub async fn create_host(
    app: tauri::AppHandle,
    input: CreateHost,
) -> Result<Host, String> {
    let pool = pool_from(&app)?;
    host_service::create(&pool, input).await
}

#[tauri::command]
pub async fn list_hosts(app: tauri::AppHandle) -> Result<Vec<Host>, String> {
    let pool = pool_from(&app)?;
    host_service::list(&pool).await
}

#[tauri::command]
pub async fn update_host(
    app: tauri::AppHandle,
    input: UpdateHost,
) -> Result<Host, String> {
    let pool = pool_from(&app)?;
    host_service::update(&pool, input).await
}

#[tauri::command]
pub async fn delete_host(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let pool = pool_from(&app)?;
    host_service::delete(&pool, &id).await
}

#[tauri::command]
pub async fn set_default_host(
    app: tauri::AppHandle,
    host_id: String,
) -> Result<Host, String> {
    let pool = pool_from(&app)?;
    host_service::set_default(&pool, &host_id).await
}

#[tauri::command]
pub async fn unset_default_host(app: tauri::AppHandle) -> Result<(), String> {
    let pool = pool_from(&app)?;
    host_service::unset_default(&pool).await
}

#[tauri::command]
pub async fn test_host_connection(
    address: String,
    port: i32,
    username: String,
    password: Option<String>,
    key_path: Option<String>,
) -> Result<(), String> {
    sync_service::test_connection(
        &address,
        port,
        &username,
        password.as_deref(),
        key_path.as_deref(),
    )
}

#[tauri::command]
pub async fn test_saved_host(
    app: tauri::AppHandle,
    host_id: String,
) -> Result<(), String> {
    let pool = pool_from(&app)?;
    let host = host_service::get_by_id(&pool, &host_id).await?;
    let password = host_service::get_password(&pool, &host_id)
        .await
        .map_err(|e| {
            if e.contains("Decryption failed") {
                "ERROR:DECRYPT_FAILED".to_string()
            } else {
                e
            }
        })?;
    sync_service::test_connection(
        &host.address,
        host.port,
        &host.username,
        password.as_deref(),
        host.key_path.as_deref(),
    )
}

#[tauri::command]
pub async fn sync_to_host(
    app: tauri::AppHandle,
    profile_id: String,
    host_id: String,
) -> Result<crate::models::sync_history::SyncResult, String> {
    let pool = pool_from(&app)?;
    let profile = profile_service::get_by_id(&pool, &profile_id).await?;
    let sync_keys: Vec<String> = serde_json::from_str(&profile.sync_keys)
        .unwrap_or_else(|_| vec!["env".to_string()]);
    Ok(sync_service::sync_to_host(&pool, &profile_id, &host_id, &sync_keys).await)
}

#[tauri::command]
pub async fn sync_to_hosts(
    app: tauri::AppHandle,
    profile_id: String,
    host_ids: Vec<String>,
) -> Result<Vec<crate::models::sync_history::SyncResult>, String> {
    let pool = pool_from(&app)?;
    let profile = profile_service::get_by_id(&pool, &profile_id).await?;
    let sync_keys: Vec<String> = serde_json::from_str(&profile.sync_keys)
        .unwrap_or_else(|_| vec!["env".to_string()]);
    Ok(sync_service::sync_to_hosts(&pool, &profile_id, &host_ids, &sync_keys).await)
}

#[tauri::command]
pub async fn list_sync_history(
    app: tauri::AppHandle,
    profile_id: Option<String>,
    host_id: Option<String>,
) -> Result<Vec<SyncHistory>, String> {
    let pool = pool_from(&app)?;
    match (profile_id, host_id) {
        (Some(pid), _) => sync_history_service::list_by_profile(&pool, &pid).await,
        (None, Some(hid)) => sync_history_service::list_by_host(&pool, &hid).await,
        _ => sync_history_service::list_all(&pool).await,
    }
}

#[tauri::command]
pub fn write_clipboard(text: String) -> Result<(), String> {
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;
    clipboard
        .set_text(&text)
        .map_err(|e| format!("Failed to write to clipboard: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn open_github(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url("https://github.com/dmz2922990/LLM-Switch", None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn refresh_tray_menu(
    app: tauri::AppHandle,
    tray_state: tauri::State<'_, crate::tray::TrayState>,
) -> Result<(), String> {
    tray_state.refresh_menu(&app).await;
    Ok(())
}

#[tauri::command]
pub async fn update_tray_labels(
    app: tauri::AppHandle,
    tray_state: tauri::State<'_, crate::tray::TrayState>,
    open_window: String,
    about: String,
    quit: String,
) -> Result<(), String> {
    let labels = crate::tray::TrayLabels {
        open_window,
        about,
        quit,
    };
    tray_state.update_labels(&app, labels).await;
    Ok(())
}

#[tauri::command]
pub async fn get_usage_info(base_url: String, auth_token: String) -> Result<Option<crate::models::usage::UsageInfo>, String> {
    usage_service::get_usage(&base_url, &auth_token)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_activation_time(
    app: tauri::AppHandle,
    id: String,
    activation_time: Option<String>,
) -> Result<Profile, String> {
    let pool = pool_from(&app)?;
    profile_service::update_activation_time(&pool, &id, activation_time.as_deref()).await
}

#[tauri::command]
pub async fn list_activation_log(
    app: tauri::AppHandle,
    profile_id: Option<String>,
) -> Result<Vec<crate::models::activation_log::ActivationLog>, String> {
    let pool = pool_from(&app)?;
    activation_service::list_log(&pool, profile_id.as_deref()).await
}

#[tauri::command]
pub async fn list_reminder_configs(app: tauri::AppHandle) -> Result<Vec<crate::models::reminder::ReminderConfig>, String> {
    let pool = pool_from(&app)?;
    reminder_service::list_configs(&pool).await
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn update_reminder_config(
    app: tauri::AppHandle,
    id: String,
    enabled: bool,
    time1_start: Option<String>,
    time1_end: Option<String>,
    time2_start: Option<String>,
    time2_end: Option<String>,
    days_of_week: String,
    auto_close: bool,
    auto_close_seconds: i64,
) -> Result<crate::models::reminder::ReminderConfig, String> {
    let pool = pool_from(&app)?;
    reminder_service::update_config(&pool, &id, enabled, time1_start.as_deref(), time1_end.as_deref(), time2_start.as_deref(), time2_end.as_deref(), &days_of_week, auto_close, auto_close_seconds).await
}
