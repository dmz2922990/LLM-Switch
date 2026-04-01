use tauri::Manager;

mod commands;
mod db;
mod models;
mod services;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let handle2 = handle.clone();
            tauri::async_runtime::spawn(async move {
                let data_dir = handle.path().app_data_dir().expect("Failed to get app data dir");
                let pool = db::init_pool(&data_dir).await.expect("Failed to init database");
                handle.manage(pool.clone());
                let _ = tray::TrayState::init_tray(&handle, pool);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_profile,
            commands::list_profiles,
            commands::get_profile,
            commands::rename_profile,
            commands::copy_profile,
            commands::delete_profile,
            commands::set_active_profile,
            commands::get_active_profile,
            commands::update_profile_settings,
            commands::create_host,
            commands::list_hosts,
            commands::update_host,
            commands::delete_host,
            commands::test_host_connection,
            commands::test_saved_host,
            commands::sync_to_host,
            commands::sync_to_hosts,
            commands::list_sync_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
