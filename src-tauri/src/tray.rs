use crate::models::profile::Profile;
use crate::services::profile_service;
use sqlx::SqlitePool;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Emitter;
use tauri::Manager;

pub struct TrayLabels {
    pub open_window: String,
    pub about: String,
    pub quit: String,
}

pub struct TrayState {
    pool: SqlitePool,
    tray: Mutex<Option<tauri::tray::TrayIcon>>,
    labels: Mutex<TrayLabels>,
}

impl TrayState {
    fn build_menu(
        app: &tauri::AppHandle,
        profiles: &[Profile],
        labels: &TrayLabels,
    ) -> tauri::Result<Menu<tauri::Wry>> {
        let mut items: Vec<Box<dyn tauri::menu::IsMenuItem<tauri::Wry>>> = vec![];

        for p in profiles {
            let label = if p.is_active {
                format!("✓ {}", p.name)
            } else {
                format!("  {}", p.name)
            };
            let id = format!("profile_{}", p.id);
            items.push(Box::new(MenuItem::with_id(
                app,
                &id,
                &label,
                true,
                None::<&str>,
            )?));
        }

        let sep = PredefinedMenuItem::separator(app)?;
        items.push(Box::new(sep));

        let open_item =
            MenuItem::with_id(app, "open_window", &labels.open_window, true, None::<&str>)?;
        items.push(Box::new(open_item));

        let about_item = MenuItem::with_id(app, "about", &labels.about, true, None::<&str>)?;
        items.push(Box::new(about_item));

        let quit_item = MenuItem::with_id(app, "quit", &labels.quit, true, None::<&str>)?;
        items.push(Box::new(quit_item));

        let item_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> =
            items.iter().map(|i| i.as_ref()).collect();
        Menu::with_items(app, &item_refs)
    }

    pub async fn init_tray(
        app: &tauri::AppHandle,
        pool: SqlitePool,
        labels: TrayLabels,
    ) -> tauri::Result<Self> {
        let profiles = profile_service::list(&pool)
            .await
            .unwrap_or_else(|_| vec![]);

        let menu = Self::build_menu(app, &profiles, &labels)?;
        let tray = TrayIconBuilder::new()
            .icon(tauri::include_image!("../src-tauri/icons/32x32.png"))
            .menu(&menu)
            .tooltip("LLM Switch")
            .build(app)?;

        let pool_clone = pool.clone();
        let app_clone = app.clone();

        tray.on_menu_event(move |_app, event| {
            let id = event.id().as_ref();
            match id {
                "open_window" => {
                    if let Some(window) = app_clone.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    app_clone.exit(0);
                }
                "about" => {
                    let _ = app_clone.emit("show-about", ());
                }
                other => {
                    if let Some(profile_id) = other.strip_prefix("profile_") {
                        let pool = pool_clone.clone();
                        let pid = profile_id.to_string();
                        let app = app_clone.clone();
                        tauri::async_runtime::spawn(async move {
                            if profile_service::set_active(&pool, &pid).await.is_ok() {
                                let _ = app.emit("profile-switched", ());
                            }
                        });
                    }
                }
            }
        });

        Ok(Self {
            pool,
            tray: Mutex::new(Some(tray)),
            labels: Mutex::new(labels),
        })
    }

    pub async fn refresh_menu(&self, app: &tauri::AppHandle) {
        let profiles = profile_service::list(&self.pool)
            .await
            .unwrap_or_else(|_| vec![]);
        let labels = self.labels.lock().unwrap();

        if let Ok(menu) = Self::build_menu(app, &profiles, &labels) {
            if let Some(tray) = self.tray.lock().unwrap().as_ref() {
                let _ = tray.set_menu(Some(menu));
            }
        }
    }

    pub async fn update_labels(&self, app: &tauri::AppHandle, new_labels: TrayLabels) {
        *self.labels.lock().unwrap() = new_labels;
        self.refresh_menu(app).await;
    }
}
