use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;
use tauri::Manager;

mod commands;
mod db;
mod models;
mod services;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let about_item =
                MenuItemBuilder::with_id("macos_about", "About LLM Switch").build(app)?;

            let app_menu = SubmenuBuilder::new(app, "LLM Switch")
                .item(&about_item)
                .separator()
                .hide()
                .quit()
                .build()?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&edit_menu)
                .build()?;

            app.set_menu(menu)?;

            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                if event.id().as_ref() == "macos_about" {
                    let _ = app_handle.emit("show-about", ());
                }
            });

            // Hide window on close instead of destroying it
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window_clone.hide();
                }
            });

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let data_dir = handle
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app data dir");
                let pool = db::init_pool(&data_dir)
                    .await
                    .expect("Failed to init database");
                handle.manage(pool.clone());

                if let Err(e) = services::profile_service::ensure_default_profile(&pool).await {
                    eprintln!("Failed to create default profile: {}", e);
                }

                let labels = tray::TrayLabels {
                    open_window: "Open Main Window".to_string(),
                    about: "About LLM Switch".to_string(),
                    quit: "Exit".to_string(),
                };
                match tray::TrayState::init_tray(&handle, pool, labels).await {
                    Ok(tray_state) => {
                        handle.manage(tray_state);
                    }
                    Err(e) => eprintln!("Failed to init tray: {}", e),
                }
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
            commands::open_github,
            commands::refresh_tray_menu,
            commands::update_tray_labels,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
