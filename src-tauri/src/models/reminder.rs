use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ReminderConfig {
    pub id: String,
    pub vendor_key: String,
    pub vendor_name: String,
    pub enabled: bool,
    pub time1: Option<String>,
    pub time2: Option<String>,
    pub time1_start: Option<String>,
    pub time1_end: Option<String>,
    pub time2_start: Option<String>,
    pub time2_end: Option<String>,
    pub days_of_week: String,
    pub auto_close: bool,
    pub auto_close_seconds: i64,
    pub created_at: String,
    pub updated_at: String,
}