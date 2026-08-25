use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_notification::NotificationExt;

/// Send a system notification. On macOS, uses osascript (UNUserNotificationCenter)
/// because notify-rust's NSUserNotificationCenter is deprecated and broken on macOS 15+.
#[cfg(target_os = "macos")]
fn send_notification(title: &str, body: &str) {
    let script = format!(
        r#"display notification "{}" with title "{}""#,
        body.replace('"', r#"\""#),
        title.replace('"', r#"\""#),
    );
    let result = std::process::Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output();
    match result {
        Ok(o) if o.status.success() => eprintln!("[reminder] osascript notification sent"),
        Ok(o) => eprintln!("[reminder] osascript failed: {}", String::from_utf8_lossy(&o.stderr)),
        Err(e) => eprintln!("[reminder] osascript spawn failed: {}", e),
    }
}

#[cfg(not(target_os = "macos"))]
fn send_notification(_title: &str, _body: &str) {
    // Non-macOS: handled inline with AppHandle in the scheduler
}

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
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // The native menu bar is only set on macOS; on Windows/Linux the
            // window would otherwise show an unwanted menu bar.
            #[cfg(target_os = "macos")]
            {
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
            }

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

            // Initialize database synchronously so pool is managed before commands can be called.
            // On Windows, async init inside spawn may race with frontend command invocations.
            let data_dir = handle
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            let pool = tauri::async_runtime::block_on(db::init_pool(&data_dir))
                .expect("Failed to init database");
            handle.manage(pool.clone());

            tauri::async_runtime::spawn(async move {

                if let Err(e) = services::profile_service::ensure_default_profile(&pool).await {
                    eprintln!("Failed to create default profile: {}", e);
                }

                let labels = tray::TrayLabels {
                    open_window: "Open Main Window".to_string(),
                    about: "About LLM Switch".to_string(),
                    quit: "Exit".to_string(),
                };
                match tray::TrayState::init_tray(&handle, pool.clone(), labels).await {
                    Ok(tray_state) => {
                        handle.manage(tray_state);
                    }
                    Err(e) => eprintln!("Failed to init tray: {}", e),
                }

                // Periodically sync active profile from ~/.claude/settings.json
                let poll_handle = handle.clone();
                tauri::async_runtime::spawn(async move {
                    let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
                    loop {
                        interval.tick().await;
                        if let Some(p) = poll_handle.try_state::<sqlx::SqlitePool>() {
                            if services::profile_service::sync_active_from_file(&p).await {
                                let _ = poll_handle.emit("settings-file-changed", ());
                            }
                        }
                    }
                });

                // Activation scheduler — checks every 60s for profiles to activate
                let act_handle = handle.clone();
                tauri::async_runtime::spawn(async move {
                    use std::collections::HashSet;
                    let mut triggered: HashSet<String> = HashSet::new();
                    let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
                    loop {
                        interval.tick().await;
                        let pool = match act_handle.try_state::<sqlx::SqlitePool>() {
                            Some(s) => s,
                            None => continue,
                        };
                        let now = chrono::Local::now();
                        let date_str = now.format("%Y-%m-%d").to_string();
                        let hhmm = now.format("%H:%M").to_string();
                        let profiles = match sqlx::query_as::<_, crate::models::profile::Profile>(
                            "SELECT * FROM profiles WHERE activation_time IS NOT NULL ORDER BY sort_order ASC",
                        )
                        .fetch_all(&*pool)
                        .await
                        {
                            Ok(p) => p,
                            Err(_) => continue,
                        };
                        for profile in profiles {
                            if profile.activation_time.as_deref() != Some(hhmm.as_str()) {
                                continue;
                            }
                            let key = format!("{}|{}|{}", date_str, hhmm, profile.id);
                            if !triggered.insert(key) {
                                continue;
                            }
                            let pool_clone = pool.inner().clone();
                            let act_h = act_handle.clone();
                            tauri::async_runtime::spawn(async move {
                                let result = services::activation_service::send_activation(&profile).await;
                                match result {
                                    Ok(http_status) => {
                                        let _ = services::activation_service::record_log(
                                            &pool_clone, &profile.id, "success",
                                            None, Some(http_status as i64),
                                        ).await;
                                    }
                                    Err((msg, http_status)) => {
                                        let _ = services::activation_service::record_log(
                                            &pool_clone, &profile.id, "failed",
                                            Some(&msg), http_status,
                                        ).await;
                                    }
                                }
                                let _ = act_h.emit("activation-completed", ());
                            });
                        }
                    }
                });

                // Reminder scheduler — checks every 60s for reminder triggers
                let _rem_handle = handle.clone();
                tauri::async_runtime::spawn(async move {
                    use std::collections::HashSet;
                    let mut triggered: HashSet<String> = HashSet::new();
                    let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
                    loop {
                        interval.tick().await;
                        let pool = match _rem_handle.try_state::<sqlx::SqlitePool>() {
                            Some(s) => s,
                            None => continue,
                        };
                        let now = chrono::Local::now();
                        let date_str = now.format("%Y-%m-%d").to_string();
                        let hhmm = now.format("%H:%M").to_string();
                        let weekday = now.format("%u").to_string();
                        let configs = match services::reminder_service::list_configs(&pool).await {
                            Ok(c) => {
                                #[cfg(not(target_os = "macos"))]
                                {
                                    let enabled: Vec<_> = c.iter().filter(|x| x.enabled).collect();
                                    if !enabled.is_empty() {
                                        eprintln!("[reminder] tick at {} weekday={} — {} enabled configs", hhmm, weekday, enabled.len());
                                    }
                                }
                                c
                            }
                            Err(e) => { eprintln!("[reminder] list_configs error: {}", e); continue; }
                        };
                        for cfg in &configs {
                            if !cfg.enabled { continue; }
                            if !cfg.days_of_week.split(',').any(|d| d.trim() == weekday.as_str()) { continue; }
                            let starts = [
                                cfg.time1_start.as_deref(),
                                cfg.time2_start.as_deref(),
                            ];
                            let ends = [
                                cfg.time1_end.as_deref(),
                                cfg.time2_end.as_deref(),
                            ];
                            for (i, start) in starts.iter().enumerate() {
                                if let Some(s) = start {
                                    if *s == hhmm.as_str() {
                                        let key = format!("{}|{}|{}", date_str, hhmm, cfg.vendor_key);
                                        if !triggered.insert(key) { continue; }
                                        let body = if let Some(e) = ends[i] {
                                            format!("{}: {} – {}", cfg.vendor_name, s, e)
                                        } else {
                                            format!("{}", cfg.vendor_name)
                                        };
                                        #[cfg(target_os = "macos")]
                                        {
                                            send_notification("波峰时段开始", &body);
                                        }
                                        #[cfg(not(target_os = "macos"))]
                                        {
                                            eprintln!("[reminder] triggering notification for {} at {}: {}", cfg.vendor_key, hhmm, body);
                                            match _rem_handle
                                                .notification()
                                                .builder()
                                                .title("波峰时段开始")
                                                .body(&body)
                                                .show()
                                            {
                                                Ok(()) => eprintln!("[reminder] notification sent successfully"),
                                                Err(e) => eprintln!("[reminder] notification failed: {}", e),
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
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
            commands::update_profile_sync_keys,
            commands::write_clipboard,
            commands::reorder_profiles,
            commands::create_host,
            commands::list_hosts,
            commands::update_host,
            commands::delete_host,
            commands::set_default_host,
            commands::unset_default_host,
            commands::test_host_connection,
            commands::test_saved_host,
            commands::sync_to_host,
            commands::sync_to_hosts,
            commands::list_sync_history,
            commands::open_github,
            commands::refresh_tray_menu,
            commands::update_tray_labels,
            commands::get_usage_info,
            commands::update_activation_time,
            commands::list_activation_log,
            commands::list_reminder_configs,
            commands::update_reminder_config,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        });
}
