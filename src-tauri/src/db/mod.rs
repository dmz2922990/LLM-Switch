use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::Path;
use std::str::FromStr;

const DB_NAME: &str = "llm-switch.db";

pub async fn init_pool(app_data_dir: &Path) -> Result<SqlitePool, sqlx::Error> {
    std::fs::create_dir_all(app_data_dir).ok();
    let db_path = app_data_dir.join(DB_NAME);
    let db_url = format!("sqlite:{}", db_path.display());
    let options = SqliteConnectOptions::from_str(&db_url)?
        .create_if_missing(true)
        .busy_timeout(std::time::Duration::from_secs(5));
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;
    run_migrations(&pool).await?;
    Ok(pool)
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let migration_sql = include_str!("../../migrations/001_init.sql");
    sqlx::raw_sql(migration_sql).execute(pool).await?;
    // Migration 002: ignore "duplicate column" errors for idempotency
    let m2 = include_str!("../../migrations/002_add_default_host_and_sync_hashes.sql");
    if let Err(e) = sqlx::raw_sql(m2).execute(pool).await {
        if !e.to_string().contains("duplicate column name") {
            return Err(e);
        }
    }
    // Migration 003: add sort_order for manual profile ordering
    let alter_result = sqlx::raw_sql(
        "ALTER TABLE profiles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
    )
    .execute(pool)
    .await;

    let is_new_column = alter_result.is_ok();
    if let Err(e) = alter_result {
        if !e.to_string().contains("duplicate column name") {
            return Err(e);
        }
    }
    // Only initialize sort_order when the column is newly added
    if is_new_column {
        sqlx::raw_sql(
            "UPDATE profiles SET sort_order = (SELECT COUNT(*) FROM profiles p2 WHERE p2.created_at <= profiles.created_at)",
        )
        .execute(pool)
        .await?;
    }
    // Migration 004: add sync_keys for selective sync scope
    let m4 = sqlx::raw_sql(
        "ALTER TABLE profiles ADD COLUMN sync_keys TEXT NOT NULL DEFAULT '[\"env\"]'",
    )
    .execute(pool)
    .await;
    if let Err(e) = m4 {
        if !e.to_string().contains("duplicate column name") {
            return Err(e);
        }
    }
    Ok(())
}
