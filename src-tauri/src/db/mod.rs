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
    Ok(())
}
